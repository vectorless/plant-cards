import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig, isConfigured } from './firebase-config.js';

const DISPLAY_NAME_KEY = 'plant_cards:displayName';

let app = null;
let auth = null;
let db = null;
let currentUid = null;
let displayName = null;
let readyResolvers = [];

export function cloudConfigured() {
  return isConfigured();
}

export function initCloud() {
  if (!isConfigured()) return;
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUid = user.uid;
      readyResolvers.forEach(r => r());
      readyResolvers = [];
    } else {
      currentUid = null;
    }
  });
  signInAnonymously(auth).catch(err => {
    console.error('Anonymous sign-in failed:', err);
  });
  displayName = localStorage.getItem(DISPLAY_NAME_KEY) || null;
}

export function getDb() { return db; }
export function getUid() { return currentUid; }
export function getDisplayName() { return displayName; }
export function hasDisplayName() { return !!displayName; }

export async function whenReady() {
  if (!isConfigured()) throw new Error('Firebase not configured');
  if (currentUid) return;
  await new Promise(resolve => readyResolvers.push(resolve));
}

export async function setDisplayName(name) {
  const trimmed = String(name || '').trim().slice(0, 24);
  if (!trimmed) return false;
  displayName = trimmed;
  localStorage.setItem(DISPLAY_NAME_KEY, trimmed);
  if (db && currentUid) {
    await setDoc(doc(db, 'users', currentUid), {
      displayName: trimmed,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }
  return true;
}

export async function ensureProfileLoaded() {
  if (!db || !currentUid) return;
  if (displayName) {
    await setDoc(doc(db, 'users', currentUid), {
      displayName,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return;
  }
  const snap = await getDoc(doc(db, 'users', currentUid));
  if (snap.exists() && snap.data().displayName) {
    displayName = snap.data().displayName;
    localStorage.setItem(DISPLAY_NAME_KEY, displayName);
  }
}
