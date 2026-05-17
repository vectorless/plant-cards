import { state, cardCount, removeCard, addCard,
         TRADER_PRICES } from './state.js';
import { saveState } from './store.js';
import { PLANTS, RARITIES, plantById, plantsByRarity } from './plants.js';
import { buildCard } from './svg.js';

const $ = (id) => document.getElementById(id);

const BOT_NAMES = [
  'GreenThumb', 'RoseLover', 'IvyKing', 'WildSprout', 'PetalPusher',
  'FernFan', 'BloomBuddy', 'LilyTender', 'SunflowerSal', 'CactusCarl',
  'MossMaster', 'BonsaiBob', 'TulipTom', 'OrchidOlivia', 'DaisyDan',
  'PoppyPete', 'VineVince', 'HerbHank', 'MelonMia', 'ZinniaZoe',
  'NightOrchid', 'AshenLeaf', 'CopperVine', 'DewKeeper', 'StarBloom',
];

// Target number of active bot listings — we top up to this whenever the player
// visits the market and enough time has passed.
const BOT_TARGET = 28;
// Min seconds between bot tick refreshes
const BOT_TICK_SECONDS = 30;
// Average lifetime of a bot listing (seconds) — past this it has a chance to vanish
const BOT_LIFETIME_SECONDS = 12 * 60;
// Per-minute probability a fairly-priced player listing gets bought
const SALE_BASE_PER_MIN = 0.15;

let els = {};
let refreshCoinsFn = null;
let activeTab = 'browse';
let filterRarity = 'all';
let filterText = '';
let sortMode = 'price-asc';

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

export function showMarket() {
  tickBots();
  render();
}

// ── Bot simulation ────────────────────────────────────────────────────────

function tickBots() {
  const now = Date.now();
  const last = state.market.lastBotTick || 0;
  const elapsed = (now - last) / 1000;
  if (elapsed < BOT_TICK_SECONDS) {
    simulateSales(elapsed, now);
    return;
  }

  // Drop expired bot listings (probabilistically)
  state.market.listings = state.market.listings.filter(l => {
    if (l.isMine) return true;
    const age = (now - l.postedAt) / 1000;
    if (age > BOT_LIFETIME_SECONDS) return Math.random() > 0.3;
    return true;
  });

  // Top up bot listings to target
  let botCount = state.market.listings.filter(l => !l.isMine).length;
  // On first visit (last === 0), seed a healthy roster
  const toAdd = last === 0 ? BOT_TARGET : Math.min(BOT_TARGET - botCount, Math.ceil(elapsed / 30));
  for (let i = 0; i < toAdd; i++) {
    state.market.listings.push(makeBotListing(now));
  }

  // Simulate sales of player listings during the time elapsed
  simulateSales(elapsed, now);

  state.market.lastBotTick = now;
  saveState();
}

function makeBotListing(now) {
  const plant = PLANTS[Math.floor(Math.random() * PLANTS.length)];
  const base = TRADER_PRICES[plant.rarity];
  const price = Math.max(1, Math.round(base * (0.6 + Math.random() * 0.9)));
  return {
    id: 'b_' + Math.random().toString(36).slice(2, 10),
    plantId: plant.id,
    rarity: plant.rarity,
    sellerName: pickBotName(),
    price,
    postedAt: now - Math.floor(Math.random() * 300_000),
    isMine: false,
  };
}

function pickBotName() {
  const base = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  return Math.random() < 0.45 ? base + Math.floor(Math.random() * 100) : base;
}

function simulateSales(elapsedSeconds, now) {
  const minutes = elapsedSeconds / 60;
  if (minutes <= 0) return;
  let totalEarnings = 0;
  const remaining = [];
  for (const l of state.market.listings) {
    if (!l.isMine) { remaining.push(l); continue; }
    const fair = TRADER_PRICES[l.rarity];
    // Modifier: 1 at fair price, 0.2 at 2x fair price, 1.4 below fair
    const ratio = l.price / fair;
    const mod = ratio <= 1 ? 1.4 - 0.4 * ratio : Math.max(0.05, 1 / (ratio * ratio));
    const chance = 1 - Math.pow(1 - SALE_BASE_PER_MIN * mod, minutes);
    if (Math.random() < chance) {
      totalEarnings += l.price;
    } else {
      remaining.push(l);
    }
  }
  if (totalEarnings > 0) {
    state.market.earnings += totalEarnings;
  }
  state.market.listings = remaining;
}

// ── Render ────────────────────────────────────────────────────────────────

function render() {
  els.tabs.querySelectorAll('button[data-tab]').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === activeTab);
  });

  const myActive = state.market.listings.filter(l => l.isMine).length;
  els.tabs.querySelector('[data-tab="mine"]').textContent = `MY LISTINGS (${myActive})`;

  const earnings = state.market.earnings;
  els.earningsAmt.textContent = `+${earnings}`;
  els.earnings.classList.toggle('has-earnings', earnings > 0);
  els.earningsBtn.disabled = earnings <= 0;

  els.body.innerHTML = '';
  if (activeTab === 'browse')      renderBrowse();
  else if (activeTab === 'mine')   renderMine();
}

function renderBrowse() {
  let listings = state.market.listings.filter(l => !l.isMine);
  if (filterRarity !== 'all') listings = listings.filter(l => l.rarity === filterRarity);
  if (filterText) {
    listings = listings.filter(l =>
      plantById(l.plantId).name.toLowerCase().includes(filterText) ||
      l.sellerName.toLowerCase().includes(filterText));
  }
  listings.sort((a, b) =>
    sortMode === 'price-asc'  ? a.price - b.price :
    sortMode === 'price-desc' ? b.price - a.price :
                                b.postedAt - a.postedAt);

  if (listings.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'market-empty';
    empty.textContent = 'No listings match — try widening your filters.';
    els.body.appendChild(empty);
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

  cell.appendChild(buildCard(plant));

  const meta = document.createElement('div');
  meta.className = 'market-meta';
  meta.innerHTML =
    `<div class="seller">${escapeHTML(l.sellerName)}</div>` +
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
  btn.addEventListener('click', () => buyListing(l.id));
  cell.appendChild(btn);

  return cell;
}

function renderMine() {
  const mine = state.market.listings.filter(l => l.isMine);
  if (mine.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'market-empty';
    empty.textContent = 'You have no active listings. Click "+ LIST A CARD" to put one up.';
    els.body.appendChild(empty);
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'market-grid';
  for (const l of mine) {
    const plant = plantById(l.plantId);
    const cell = document.createElement('div');
    cell.className = 'market-cell mine';

    cell.appendChild(buildCard(plant));

    const meta = document.createElement('div');
    meta.className = 'market-meta';
    meta.innerHTML =
      `<div class="seller">listed by you</div>` +
      `<div class="price">${l.price} coins</div>`;
    cell.appendChild(meta);

    const btn = document.createElement('button');
    btn.className = 'market-cancel';
    btn.textContent = 'CANCEL';
    btn.addEventListener('click', () => cancelListing(l.id));
    cell.appendChild(btn);

    grid.appendChild(cell);
  }
  els.body.appendChild(grid);
}

// ── Actions ───────────────────────────────────────────────────────────────

function buyListing(id) {
  const i = state.market.listings.findIndex(l => l.id === id);
  if (i < 0) return;
  const l = state.market.listings[i];
  if (l.isMine) return;
  if (state.coins < l.price) return;
  state.coins -= l.price;
  addCard(l.plantId);
  state.market.listings.splice(i, 1);
  saveState();
  refreshCoinsFn();
  render();
}

function cancelListing(id) {
  const i = state.market.listings.findIndex(l => l.id === id);
  if (i < 0) return;
  const l = state.market.listings[i];
  if (!l.isMine) return;
  addCard(l.plantId);
  state.market.listings.splice(i, 1);
  saveState();
  render();
}

function collectEarnings() {
  const amt = state.market.earnings;
  if (amt <= 0) return;
  state.coins += amt;
  state.market.earnings = 0;
  saveState();
  refreshCoinsFn();
  render();
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

function postListing() {
  const price = parseInt(els.modalPrice.value, 10);
  if (!pickedPlantId || !Number.isFinite(price) || price <= 0) return;
  if (cardCount(pickedPlantId) <= 0) return;
  const plant = plantById(pickedPlantId);
  if (!removeCard(pickedPlantId, 1)) return;
  state.market.listings.push({
    id: 'p_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    plantId: plant.id,
    rarity: plant.rarity,
    sellerName: 'you',
    price,
    postedAt: Date.now(),
    isMine: true,
  });
  saveState();
  closeListModal();
  activeTab = 'mine';
  render();
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
