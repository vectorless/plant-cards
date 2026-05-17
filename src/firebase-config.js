// Paste your Firebase project's web config here.
// These keys are NOT secret — they identify your project to clients.
// Security is enforced by the Firestore rules you set in the Firebase console.
// See SETUP.md for the click-by-click walkthrough.

export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

export function isConfigured() {
  return firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('YOUR_');
}
