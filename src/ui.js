import { state, addCard, cardCount, hasCard, addSeed, addWatering } from './state.js';
import { saveState } from './store.js';
import { RARITIES, plantById, plantsByRarity } from './plants.js';
import { buildCard } from './svg.js';
import { openPack, openSeedPack, openWateringPack,
         PACK_PRICES, SEED_PACK_PRICES, WATERING_PACK_PRICES } from './pack.js';
import { initMinigames, showHub } from './minigames.js';
import { initGarden, showGarden, hideGarden, refreshGarden } from './garden.js';
import { initTrade, showTrade } from './trade.js';
import { initTrader, showTrader } from './trader.js';
import { initSell, showSell } from './sell.js';
import { initMarket, showMarket } from './market.js';

const $ = (id) => document.getElementById(id);

const RARITY_COLOR = {
  common:    '#9aa0a6',
  uncommon:  '#6cc36c',
  rare:      '#4a9be8',
  legendary: '#e8b048',
  secret:    '#d050d8',
};
const RARITY_ICON = {
  common: '🌱', uncommon: '🌿', rare: '🌺', legendary: '🌸', secret: '🌌',
};
const WATER_ICON = { common: '💧', uncommon: '🚰', rare: '⛲' };
const WATER_LABEL = { common: '-30s', uncommon: '-2m', rare: '-5m' };

let els = {};

export function initUI() {
  els = {
    coinAmount: $('coinAmount'),
    shop: $('shop'),
    collection: $('collection'),
    minigames: $('minigames'),
    garden: $('garden'),
    trade: $('trade'),
    trader: $('trader'),
    sell: $('sell'),
    market: $('market'),
    opening: $('opening'),
    openingCards: $('openingCards'),
    openingHint: $('openingHint'),
    continueBtn: $('continueBtn'),
    navShop: $('navShop'),
    navCollection: $('navCollection'),
    navMinigames: $('navMinigames'),
    navGarden: $('navGarden'),
    navTrade: $('navTrade'),
    navTrader: $('navTrader'),
    navSell: $('navSell'),
    navMarket: $('navMarket'),
    autoOpenToggle: $('autoOpenToggle'),
    autoOpenLabel: $('autoOpenLabel'),
  };

  els.navShop.addEventListener('click', () => switchView('shop'));
  els.navCollection.addEventListener('click', () => switchView('collection'));
  els.navMinigames.addEventListener('click', () => switchView('minigames'));
  els.navGarden.addEventListener('click', () => switchView('garden'));
  els.navTrade.addEventListener('click', () => switchView('trade'));
  els.navTrader.addEventListener('click', () => switchView('trader'));
  els.navSell.addEventListener('click', () => switchView('sell'));
  els.navMarket.addEventListener('click', () => switchView('market'));
  els.continueBtn.addEventListener('click', closeOpening);

  initMinigames(refreshCoins);
  initGarden();
  initTrade();
  initTrader(refreshCoins);
  initSell(refreshCoins);
  initMarket(refreshCoins);

  document.querySelectorAll('[data-buy-card]').forEach(btn => {
    btn.addEventListener('click', () =>
      tryBuyCardPack(btn.dataset.buyCard, parseInt(btn.dataset.count, 10) || 1));
  });
  document.querySelectorAll('[data-buy-seed]').forEach(btn => {
    btn.addEventListener('click', () =>
      tryBuySeedPack(btn.dataset.buySeed, parseInt(btn.dataset.count, 10) || 1));
  });
  document.querySelectorAll('[data-buy-water-pack]').forEach(btn => {
    btn.addEventListener('click', () =>
      tryBuyWateringPack(btn.dataset.buyWaterPack, parseInt(btn.dataset.count, 10) || 1));
  });

  els.autoOpenToggle.checked = !!state.autoOpen;
  els.autoOpenLabel.classList.toggle('active', !!state.autoOpen);
  els.autoOpenToggle.addEventListener('change', () => {
    state.autoOpen = els.autoOpenToggle.checked;
    els.autoOpenLabel.classList.toggle('active', state.autoOpen);
    saveState();
  });

  refreshCoins();
  refreshShopButtons();
}

export function refreshCoins() {
  els.coinAmount.textContent = Math.floor(state.coins);
  refreshShopButtons();
}

function refreshShopButtons() {
  document.querySelectorAll('[data-buy-card]').forEach(btn => {
    const n = parseInt(btn.dataset.count, 10) || 1;
    btn.disabled = state.coins < PACK_PRICES[btn.dataset.buyCard] * n;
  });
  document.querySelectorAll('[data-buy-seed]').forEach(btn => {
    const n = parseInt(btn.dataset.count, 10) || 1;
    btn.disabled = state.coins < SEED_PACK_PRICES[btn.dataset.buySeed] * n;
  });
  document.querySelectorAll('[data-buy-water-pack]').forEach(btn => {
    const n = parseInt(btn.dataset.count, 10) || 1;
    btn.disabled = state.coins < WATERING_PACK_PRICES[btn.dataset.buyWaterPack] * n;
  });
}

function tryBuyWateringPack(tier, n = 1) {
  const price = WATERING_PACK_PRICES[tier] * n;
  if (state.coins < price) return;
  state.coins -= price;
  saveState();
  refreshCoins();

  const packs = [];
  for (let i = 0; i < n; i++) {
    packs.push({ items: openWateringPack(tier), opened: n === 1, revealed: 0 });
  }
  state.opening = { kind: 'water', tier, packs };
  state.view = 'opening';
  renderOpening();
  if (state.autoOpen) revealAll();
}

function switchView(view) {
  if (state.view === 'opening') return;
  const prev = state.view;
  state.view = view;
  els.shop.classList.toggle('hidden', view !== 'shop');
  els.collection.classList.toggle('hidden', view !== 'collection');
  els.minigames.classList.toggle('hidden', view !== 'minigames');
  els.garden.classList.toggle('hidden', view !== 'garden');
  els.trade.classList.toggle('hidden', view !== 'trade');
  els.trader.classList.toggle('hidden', view !== 'trader');
  els.sell.classList.toggle('hidden', view !== 'sell');
  els.market.classList.toggle('hidden', view !== 'market');
  els.navShop.classList.toggle('active', view === 'shop');
  els.navCollection.classList.toggle('active', view === 'collection');
  els.navMinigames.classList.toggle('active', view === 'minigames');
  els.navGarden.classList.toggle('active', view === 'garden');
  els.navTrade.classList.toggle('active', view === 'trade');
  els.navTrader.classList.toggle('active', view === 'trader');
  els.navSell.classList.toggle('active', view === 'sell');
  els.navMarket.classList.toggle('active', view === 'market');
  if (view === 'collection') renderCollection();
  if (view === 'minigames') showHub();
  if (view === 'garden') showGarden();
  if (view === 'trade') showTrade();
  if (view === 'trader') showTrader();
  if (view === 'sell') showSell();
  if (view === 'market') showMarket();
  if (prev === 'garden' && view !== 'garden') hideGarden();
}

function renderCollection() {
  els.collection.innerHTML = '';
  for (const rarity of RARITIES) {
    const plants = plantsByRarity(rarity);
    if (plants.length === 0) continue;
    const group = document.createElement('div');
    group.className = 'group';
    group.dataset.rarity = rarity;
    const owned = plants.filter(p => hasCard(p.id)).length;
    const h2 = document.createElement('h2');
    h2.textContent = `${rarity.toUpperCase()}  —  ${owned}/${plants.length}`;
    group.appendChild(h2);
    const row = document.createElement('div');
    row.className = 'row';
    for (const plant of plants) {
      const count = cardCount(plant.id);
      const card = buildCard(plant, { unowned: count === 0, count });
      row.appendChild(card);
    }
    group.appendChild(row);
    els.collection.appendChild(group);
  }
}

function tryBuyCardPack(tier, n = 1) {
  const price = PACK_PRICES[tier] * n;
  if (state.coins < price) return;
  state.coins -= price;
  saveState();
  refreshCoins();

  const packs = [];
  for (let i = 0; i < n; i++) {
    packs.push({ items: openPack(tier), opened: n === 1, revealed: 0 });
  }
  state.opening = { kind: 'card', tier, packs, newlyOwned: [] };
  state.view = 'opening';
  renderOpening();
  if (state.autoOpen) revealAll();
}

function tryBuySeedPack(tier, n = 1) {
  const price = SEED_PACK_PRICES[tier] * n;
  if (state.coins < price) return;
  state.coins -= price;
  saveState();
  refreshCoins();

  const packs = [];
  for (let i = 0; i < n; i++) {
    packs.push({ items: openSeedPack(tier), opened: n === 1, revealed: 0 });
  }
  state.opening = { kind: 'seed', tier, packs };
  state.view = 'opening';
  renderOpening();
  if (state.autoOpen) revealAll();
}

function packBackIcon() {
  const k = state.opening.kind;
  return k === 'seed' ? '🥜' : k === 'water' ? '💦' : '🌱';
}

function totalItems() {
  return state.opening.packs.reduce((s, p) => s + p.items.length, 0);
}

function totalRevealed() {
  return state.opening.packs.reduce((s, p) => s + p.revealed, 0);
}

function renderOpening() {
  els.opening.classList.remove('hidden');
  els.openingCards.innerHTML = '';
  els.continueBtn.classList.add('hidden');
  els.openingCards.style.flexDirection =
    state.opening.packs.length > 1 ? 'column' : 'row';

  for (let i = 0; i < state.opening.packs.length; i++) {
    const wrap = document.createElement('div');
    wrap.dataset.packIdx = i;
    renderPackWrap(wrap, i);
    els.openingCards.appendChild(wrap);
  }
  updateOpeningHint();
}

function renderPackWrap(wrap, packIdx) {
  wrap.innerHTML = '';
  const pack = state.opening.packs[packIdx];
  const multi = state.opening.packs.length > 1;

  if (!pack.opened) {
    wrap.className = '';
    wrap.appendChild(buildPackTile(packIdx));
    return;
  }

  wrap.className = multi ? 'pack-group' : '';
  if (multi) {
    const label = document.createElement('div');
    label.className = 'pack-group-label';
    label.textContent = `PACK ${packIdx + 1}`;
    wrap.appendChild(label);
  }

  const row = document.createElement('div');
  row.className = multi ? 'pack-cards' : '';
  pack.items.forEach((item, j) => {
    row.appendChild(buildFlipper(packIdx, j));
  });
  if (multi) wrap.appendChild(row);
  else for (const child of [...row.children]) wrap.appendChild(child);
}

function buildPackTile(packIdx) {
  const tile = document.createElement('div');
  tile.className = 'pack-tile';
  const icon = document.createElement('div');
  icon.className = 'pack-icon';
  icon.textContent = packBackIcon();
  tile.appendChild(icon);
  const label = document.createElement('div');
  label.className = 'pack-label';
  label.textContent = `PACK ${packIdx + 1} / ${state.opening.packs.length}`;
  tile.appendChild(label);
  const count = document.createElement('div');
  count.className = 'pack-count';
  count.textContent = `${state.opening.packs[packIdx].items.length} ${itemLabel()}`;
  tile.appendChild(count);
  tile.addEventListener('click', () => openPackTile(packIdx));
  return tile;
}

function itemLabel() {
  const k = state.opening.kind;
  return k === 'seed' ? 'seeds' : k === 'water' ? 'cans' : 'cards';
}

function buildFlipper(packIdx, cardIdx) {
  const flipper = document.createElement('div');
  flipper.className = 'flipper';
  flipper.dataset.packIdx = packIdx;
  flipper.dataset.cardIdx = cardIdx;

  const back = document.createElement('div');
  back.className = 'face back';
  back.textContent = packBackIcon();
  flipper.appendChild(back);

  flipper.addEventListener('click', () => revealOne(packIdx, cardIdx, flipper));
  return flipper;
}

function openPackTile(packIdx) {
  const pack = state.opening.packs[packIdx];
  if (pack.opened) return;
  pack.opened = true;
  const wrap = els.openingCards.querySelector(`[data-pack-idx="${packIdx}"]`);
  if (wrap) renderPackWrap(wrap, packIdx);
  updateOpeningHint();
}

function revealOne(packIdx, cardIdx, flipper) {
  if (flipper.classList.contains('flipped')) return;
  const pack = state.opening.packs[packIdx];
  const item = pack.items[cardIdx];
  const front = document.createElement('div');
  front.className = 'face front';

  if (state.opening.kind === 'seed') {
    addSeed(item);
    front.appendChild(buildSeedFace(item));
  } else if (state.opening.kind === 'water') {
    addWatering(item);
    front.appendChild(buildWaterFace(item));
  } else {
    const plant = plantById(item);
    const isNew = addCard(item);
    if (isNew) state.opening.newlyOwned.push(item);
    front.appendChild(buildCard(plant, { isNew }));
  }
  flipper.appendChild(front);
  flipper.classList.add('flipped');
  pack.revealed++;

  if (totalRevealed() === totalItems()) finishOpening();
  else updateOpeningHint();
}

function updateOpeningHint() {
  const kind = state.opening.kind;
  const packs = state.opening.packs;
  const unopened = packs.filter(p => !p.opened).length;
  if (unopened > 0) {
    els.openingHint.textContent = packs.length > 1
      ? `Click a pack to open it — ${unopened} of ${packs.length} left`
      : (kind === 'seed'  ? 'Click packets to reveal seeds'
       : kind === 'water' ? 'Click to reveal watering cans'
       :                    'Click cards to reveal');
    return;
  }
  // All packs opened; some cards still to flip
  els.openingHint.textContent =
    kind === 'seed'  ? 'Click packets to reveal seeds' :
    kind === 'water' ? 'Click to reveal watering cans' :
                       'Click cards to reveal';
}

function finishOpening() {
  saveState();
  const total = totalItems();
  if (state.opening.kind === 'seed') {
    els.openingHint.textContent = `${total} seed${total > 1 ? 's' : ''} added — plant them in your garden`;
  } else if (state.opening.kind === 'water') {
    els.openingHint.textContent = `${total} watering can${total > 1 ? 's' : ''} added — use them in your garden`;
  } else {
    const n = state.opening.newlyOwned.length;
    els.openingHint.textContent = n > 0
      ? `${n} new card${n > 1 ? 's' : ''} added to your collection`
      : 'All duplicates — better luck next pack';
  }
  els.continueBtn.classList.remove('hidden');
}

function buildWaterFace(rarity) {
  const card = document.createElement('div');
  card.className = 'card water-card';
  card.dataset.rarity = rarity;
  card.style.borderColor = rarity === 'common' ? '#6cb4d8'
                          : rarity === 'uncommon' ? '#4a9be8' : '#6c9aff';

  const art = document.createElement('div');
  art.className = 'art';
  art.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:80px;';
  art.textContent = WATER_ICON[rarity];
  card.appendChild(art);

  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = `WATERING CAN  ${WATER_LABEL[rarity]}`;
  card.appendChild(name);

  const r = document.createElement('div');
  r.className = 'rarity';
  r.style.color = card.style.borderColor;
  r.textContent = rarity;
  card.appendChild(r);

  return card;
}

function buildSeedFace(rarity) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.rarity = rarity;

  const art = document.createElement('div');
  art.className = 'art';
  art.style.display = 'flex';
  art.style.alignItems = 'center';
  art.style.justifyContent = 'center';
  art.style.fontSize = '80px';
  art.textContent = RARITY_ICON[rarity];
  card.appendChild(art);

  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = 'SEED';
  card.appendChild(name);

  const r = document.createElement('div');
  r.className = 'rarity';
  r.textContent = rarity;
  card.appendChild(r);

  return card;
}

function closeOpening() {
  state.opening = null;
  state.view = 'shop';
  els.opening.classList.add('hidden');
  els.openingCards.innerHTML = '';
  refreshCoins();
}

export function revealAll() {
  if (!state.opening) return;
  state.opening.packs.forEach((p, i) => { if (!p.opened) openPackTile(i); });
  document.querySelectorAll('.flipper:not(.flipped)').forEach(f => {
    const pi = parseInt(f.dataset.packIdx, 10);
    const ci = parseInt(f.dataset.cardIdx, 10);
    revealOne(pi, ci, f);
  });
}
