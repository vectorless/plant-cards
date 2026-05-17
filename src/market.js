import { state, addCard, removeCard, cardCount, TRADER_PRICES } from './state.js';
import { saveState } from './store.js';
import { RARITIES, plantById, plantsByRarity } from './plants.js';
import { buildCard } from './svg.js';
import { cloudConfigured, initCloud, whenReady, getDb, getUid,
         getDisplayName, hasDisplayName, setDisplayName, ensureProfileLoaded } from './cloud.js';
import {
  collection, query, where, onSnapshot, orderBy, limit,
  addDoc, deleteDoc, doc, getDocs, runTransaction, serverTimestamp,
} from 'firebase/firestore';

const $ = (id) => document.getElementById(id);

let els = {};
let refreshCoinsFn = null;
let activeTab = 'browse';
let filterRarity = 'all';
let filterText = '';
let sortMode = 'price-asc';

let allListings = [];        // latest snapshot from Firestore
let unsubListings = null;
let cloudReady = false;

export function initMarket(refreshCoins) {
  els = {
    view:       $('market'),
    tabs:       $('marketTabs'),
    filters:    $('marketFilters'),
    earnings:   $('marketEarnings'),
    earningsBtn:$('marketEarningsBtn'),
    earningsAmt:$('marketEarningsAmt'),
    body:       $('marketBody'),
    listBtn:    $('marketListBtn'),
    modal:      $('marketModal'),
    modalGrid:  $('marketModalGrid'),
    modalClose: $('marketModalClose'),
    modalCancel:$('marketModalCancel'),
    modalPost:  $('marketModalPost'),
    modalPicked:$('marketModalPicked'),
    modalPrice: $('marketModalPrice'),
    modalSuggest:$('marketModalSuggest'),
    raritySelect:$('marketRarity'),
    searchInput:$('marketSearch'),
    sortSelect: $('marketSort'),
  };
  refreshCoinsFn = refreshCoins;

  els.tabs.querySelectorAll('button[data-tab]').forEach(b => {
    b.addEventListener('click', () => { activeTab = b.dataset.tab; render(); });
  });

  els.raritySelect.addEventListener('change', () => {
    filterRarity = els.raritySelect.value; render();
  });
  els.searchInput.addEventListener('input', () => {
    filterText = els.searchInput.value.trim().toLowerCase(); render();
  });
  els.sortSelect.addEventListener('change', () => {
    sortMode = els.sortSelect.value; render();
  });

  els.listBtn.addEventListener('click', openListModal);
  els.modalClose.addEventListener('click', closeListModal);
  els.modalCancel.addEventListener('click', closeListModal);
  els.modalPost.addEventListener('click', postListing);
  els.earningsBtn.addEventListener('click', collectEarnings);
  els.modalPrice.addEventListener('input', validateModal);
}

export async function showMarket() {
  if (!cloudConfigured()) {
    renderSetupNotice();
    return;
  }
  if (!cloudReady) {
    renderLoading();
    try {
      await whenReady();
      await ensureProfileLoaded();
      subscribeListings();
      cloudReady = true;
    } catch (err) {
      renderError(err.message);
      return;
    }
  }
  if (!hasDisplayName()) {
    renderNamePrompt();
    return;
  }
  await collectEarnings({ silent: true });
  render();
}

function subscribeListings() {
  if (unsubListings) unsubListings();
  const db = getDb();
  const q = query(collection(db, 'listings'),
                  orderBy('postedAt', 'desc'), limit(200));
  unsubListings = onSnapshot(q, (snap) => {
    allListings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (state.view === 'market' && cloudReady && hasDisplayName()) render();
  }, (err) => {
    console.error('Listings subscription error:', err);
  });
}

// ── Render ────────────────────────────────────────────────────────────────

function render() {
  els.tabs.querySelectorAll('button[data-tab]').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === activeTab);
  });

  const uid = getUid();
  const myActive = allListings.filter(l => l.sellerUid === uid).length;
  els.tabs.querySelector('[data-tab="mine"]').textContent = `MY LISTINGS (${myActive})`;

  els.earnings.classList.remove('has-earnings');
  els.earningsAmt.textContent = '+0';
  els.earningsBtn.disabled = true;
  // earnings UI is updated by collectEarnings() at refresh time

  els.body.innerHTML = '';
  if (activeTab === 'browse')      renderBrowse();
  else if (activeTab === 'mine')   renderMine();
}

function renderBrowse() {
  const uid = getUid();
  let listings = allListings.filter(l => l.sellerUid !== uid);
  if (filterRarity !== 'all') listings = listings.filter(l => l.rarity === filterRarity);
  if (filterText) {
    listings = listings.filter(l => {
      const plant = plantById(l.plantId);
      const nm = plant ? plant.name.toLowerCase() : '';
      const sn = (l.sellerName || '').toLowerCase();
      return nm.includes(filterText) || sn.includes(filterText);
    });
  }
  listings.sort((a, b) =>
    sortMode === 'price-asc'  ? a.price - b.price :
    sortMode === 'price-desc' ? b.price - a.price :
                                (b.postedAtMs ?? 0) - (a.postedAtMs ?? 0));

  if (listings.length === 0) {
    showEmpty('No listings match — try widening your filters.');
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'market-grid';
  for (const l of listings) {
    grid.appendChild(buildBrowseCell(l));
  }
  els.body.appendChild(grid);
}

function buildBrowseCell(l) {
  const plant = plantById(l.plantId);
  const cell = document.createElement('div');
  cell.className = 'market-cell';

  if (plant) cell.appendChild(buildCard(plant));

  const meta = document.createElement('div');
  meta.className = 'market-meta';
  meta.innerHTML =
    `<div class="seller">${escapeHTML(l.sellerName || 'anonymous')}</div>` +
    `<div class="price">${l.price} coins</div>`;
  cell.appendChild(meta);

  const btn = document.createElement('button');
  btn.className = 'market-buy';
  if (state.coins < l.price) {
    btn.textContent = 'NOT ENOUGH';
    btn.disabled = true;
  } else {
    btn.textContent = 'BUY';
  }
  btn.addEventListener('click', () => buyListing(l));
  cell.appendChild(btn);

  return cell;
}

function renderMine() {
  const uid = getUid();
  const mine = allListings.filter(l => l.sellerUid === uid);
  if (mine.length === 0) {
    showEmpty('You have no active listings. Click "+ LIST A CARD" to put one up.');
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'market-grid';
  for (const l of mine) {
    const plant = plantById(l.plantId);
    const cell = document.createElement('div');
    cell.className = 'market-cell mine';

    if (plant) cell.appendChild(buildCard(plant));

    const meta = document.createElement('div');
    meta.className = 'market-meta';
    meta.innerHTML =
      `<div class="seller">listed by you</div>` +
      `<div class="price">${l.price} coins</div>`;
    cell.appendChild(meta);

    const btn = document.createElement('button');
    btn.className = 'market-cancel';
    btn.textContent = 'CANCEL';
    btn.addEventListener('click', () => cancelListing(l));
    cell.appendChild(btn);

    grid.appendChild(cell);
  }
  els.body.appendChild(grid);
}

function showEmpty(text) {
  const empty = document.createElement('div');
  empty.className = 'market-empty';
  empty.textContent = text;
  els.body.appendChild(empty);
}

function renderLoading() {
  els.body.innerHTML = '';
  showEmpty('Connecting to the market…');
}

function renderError(msg) {
  els.body.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'market-empty';
  div.textContent = 'Market unavailable: ' + msg;
  els.body.appendChild(div);
}

function renderSetupNotice() {
  els.body.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'market-empty';
  div.innerHTML =
    '<div style="font-size:14px;color:#ffe78a;letter-spacing:2px;margin-bottom:10px;">MARKET NOT CONFIGURED</div>' +
    '<div>This is a real cross-device market and needs a Firebase backend.</div>' +
    '<div style="margin-top:8px;">Follow <code>SETUP.md</code> at the project root and paste your Firebase config into <code>src/firebase-config.js</code>.</div>';
  els.body.appendChild(div);
}

function renderNamePrompt() {
  els.body.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'market-empty';
  wrap.style.maxWidth = '420px';
  wrap.style.margin = '40px auto';

  const title = document.createElement('div');
  title.style.cssText = 'font-size:14px;color:#ffe78a;letter-spacing:3px;margin-bottom:12px;';
  title.textContent = 'CHOOSE A DISPLAY NAME';
  wrap.appendChild(title);

  const sub = document.createElement('div');
  sub.style.cssText = 'margin-bottom:18px;';
  sub.textContent = 'Other players will see this on your listings.';
  wrap.appendChild(sub);

  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 24;
  input.placeholder = 'e.g. RoseLover';
  input.style.cssText =
    'padding:8px 12px;font-size:14px;background:#0a0f0c;color:#e0e8de;' +
    'border:1px solid #4a5a4a;border-radius:3px;font-family:inherit;width:100%;margin-bottom:12px;';
  wrap.appendChild(input);

  const btn = document.createElement('button');
  btn.style.cssText =
    'padding:10px 24px;font-size:12px;letter-spacing:3px;background:#2a200c;' +
    'color:#ffe78a;border:1px solid #d6b048;border-radius:3px;cursor:pointer;font-family:inherit;';
  btn.textContent = 'CONTINUE';
  btn.addEventListener('click', async () => {
    const ok = await setDisplayName(input.value);
    if (ok) showMarket();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn.click();
  });
  wrap.appendChild(btn);

  els.body.appendChild(wrap);
  setTimeout(() => input.focus(), 0);
}

// ── Buy / Cancel / Post ───────────────────────────────────────────────────

async function buyListing(l) {
  if (state.coins < l.price) return;
  const db = getDb();
  const uid = getUid();
  if (!uid) return;

  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, 'listings', l.id);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Listing no longer available');
      const data = snap.data();
      if (data.sellerUid === uid) throw new Error("Can't buy your own listing");
      const saleRef = doc(collection(db, 'pendingSales'));
      tx.set(saleRef, {
        forUid: data.sellerUid,
        buyerUid: uid,
        plantId: data.plantId,
        price: data.price,
        createdAt: serverTimestamp(),
      });
      tx.delete(ref);
    });
  } catch (err) {
    alert(err.message || 'Could not complete purchase.');
    return;
  }

  state.coins -= l.price;
  addCard(l.plantId);
  saveState();
  refreshCoinsFn();
  render();
}

async function cancelListing(l) {
  const db = getDb();
  const uid = getUid();
  if (!uid || l.sellerUid !== uid) return;
  try {
    await deleteDoc(doc(db, 'listings', l.id));
  } catch (err) {
    alert('Could not cancel: ' + err.message);
    return;
  }
  addCard(l.plantId);
  saveState();
  render();
}

async function collectEarnings({ silent = false } = {}) {
  const db = getDb();
  const uid = getUid();
  if (!db || !uid) return 0;
  const q = query(collection(db, 'pendingSales'), where('forUid', '==', uid));
  let snap;
  try {
    snap = await getDocs(q);
  } catch (err) {
    if (!silent) console.error(err);
    return 0;
  }
  let total = 0;
  for (const d of snap.docs) {
    total += (d.data().price | 0);
  }
  if (total > 0) {
    state.coins += total;
    saveState();
    refreshCoinsFn();
    // Delete the consumed sales so we don't double-credit
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref).catch(() => {})));
    if (!silent) {
      els.earningsAmt.textContent = `+${total}`;
      els.earnings.classList.add('has-earnings');
      setTimeout(() => {
        els.earnings.classList.remove('has-earnings');
        els.earningsAmt.textContent = '+0';
      }, 4000);
    }
  }
  return total;
}

// ── List-a-card modal ─────────────────────────────────────────────────────

let pickedPlantId = null;

function openListModal() {
  pickedPlantId = null;
  els.modal.classList.remove('hidden');
  els.modalPicked.textContent = 'Pick a card from your collection';
  els.modalSuggest.textContent = '';
  els.modalPrice.value = '';
  els.modalPost.disabled = true;
  renderModalGrid();
}

function closeListModal() {
  els.modal.classList.add('hidden');
}

function renderModalGrid() {
  els.modalGrid.innerHTML = '';
  let any = false;
  for (const rarity of RARITIES) {
    const owned = plantsByRarity(rarity).filter(p => cardCount(p.id) > 0);
    if (owned.length === 0) continue;
    any = true;
    const group = document.createElement('div');
    group.className = 'modal-group';
    const h = document.createElement('h4');
    h.textContent = `${rarity.toUpperCase()} (sells around ${TRADER_PRICES[rarity]}c)`;
    h.dataset.rarity = rarity;
    group.appendChild(h);
    const row = document.createElement('div');
    row.className = 'modal-row';
    for (const plant of owned) {
      const item = document.createElement('button');
      item.className = 'modal-card-item';
      item.dataset.plant = plant.id;
      item.dataset.rarity = plant.rarity;
      item.innerHTML =
        `<span class="dot"></span>` +
        `<span class="nm">${escapeHTML(plant.name)}</span>` +
        `<span class="ct">×${cardCount(plant.id)}</span>`;
      item.addEventListener('click', () => pickCard(plant.id));
      row.appendChild(item);
    }
    group.appendChild(row);
    els.modalGrid.appendChild(group);
  }
  if (!any) {
    els.modalGrid.innerHTML = '<div class="market-empty">No cards to list. Collect some first.</div>';
  }
}

function pickCard(plantId) {
  pickedPlantId = plantId;
  const plant = plantById(plantId);
  els.modalPicked.textContent = `${plant.name} — ${plant.rarity}`;
  const suggested = TRADER_PRICES[plant.rarity];
  els.modalSuggest.textContent = `Suggested: ${suggested} coins`;
  if (!els.modalPrice.value) els.modalPrice.value = suggested;

  els.modalGrid.querySelectorAll('.modal-card-item').forEach(el => {
    el.classList.toggle('picked', el.dataset.plant === plantId);
  });
  validateModal();
}

function validateModal() {
  const price = parseInt(els.modalPrice.value, 10);
  els.modalPost.disabled = !pickedPlantId || !Number.isFinite(price) || price <= 0 || price > 999999;
}

async function postListing() {
  const price = parseInt(els.modalPrice.value, 10);
  if (!pickedPlantId || !Number.isFinite(price) || price <= 0) return;
  if (cardCount(pickedPlantId) <= 0) return;

  const db = getDb();
  const uid = getUid();
  if (!db || !uid) { alert('Not connected to market.'); return; }

  const plant = plantById(pickedPlantId);
  if (!removeCard(pickedPlantId, 1)) return;
  saveState();

  els.modalPost.disabled = true;
  try {
    await addDoc(collection(db, 'listings'), {
      sellerUid: uid,
      sellerName: getDisplayName() || 'anonymous',
      plantId: plant.id,
      rarity: plant.rarity,
      price,
      postedAt: serverTimestamp(),
      postedAtMs: Date.now(),
    });
  } catch (err) {
    addCard(pickedPlantId);  // refund the card on failure
    saveState();
    alert('Could not post: ' + err.message);
    els.modalPost.disabled = false;
    return;
  }
  closeListModal();
  activeTab = 'mine';
  render();
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

export { initCloud };
