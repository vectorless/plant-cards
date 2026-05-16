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
  };

  els.navShop.addEventListener('click', () => switchView('shop'));
  els.navCollection.addEventListener('click', () => switchView('collection'));
  els.navMinigames.addEventListener('click', () => switchView('minigames'));
  els.navGarden.addEventListener('click', () => switchView('garden'));
  els.navTrade.addEventListener('click', () => switchView('trade'));
  els.navTrader.addEventListener('click', () => switchView('trader'));
  els.navSell.addEventListener('click', () => switchView('sell'));
  els.continueBtn.addEventListener('click', closeOpening);

  initMinigames(refreshCoins);
  initGarden();
  initTrade();
  initTrader(refreshCoins);
  initSell(refreshCoins);

  document.querySelectorAll('[data-buy-card]').forEach(btn => {
    btn.addEventListener('click', () => tryBuyCardPack(btn.dataset.buyCard));
  });
  document.querySelectorAll('[data-buy-seed]').forEach(btn => {
    btn.addEventListener('click', () => tryBuySeedPack(btn.dataset.buySeed));
  });
  document.querySelectorAll('[data-buy-water-pack]').forEach(btn => {
    btn.addEventListener('click', () => tryBuyWateringPack(btn.dataset.buyWaterPack));
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
    btn.disabled = state.coins < PACK_PRICES[btn.dataset.buyCard];
  });
  document.querySelectorAll('[data-buy-seed]').forEach(btn => {
    btn.disabled = state.coins < SEED_PACK_PRICES[btn.dataset.buySeed];
  });
  document.querySelectorAll('[data-buy-water-pack]').forEach(btn => {
    btn.disabled = state.coins < WATERING_PACK_PRICES[btn.dataset.buyWaterPack];
  });
}

function tryBuyWateringPack(tier) {
  const price = WATERING_PACK_PRICES[tier];
  if (state.coins < price) return;
  state.coins -= price;
  saveState();
  refreshCoins();

  const cans = openWateringPack(tier);
  state.opening = { kind: 'water', tier, cards: cans, revealed: 0 };
  state.view = 'opening';
  renderOpening();
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
  els.navShop.classList.toggle('active', view === 'shop');
  els.navCollection.classList.toggle('active', view === 'collection');
  els.navMinigames.classList.toggle('active', view === 'minigames');
  els.navGarden.classList.toggle('active', view === 'garden');
  els.navTrade.classList.toggle('active', view === 'trade');
  els.navTrader.classList.toggle('active', view === 'trader');
  els.navSell.classList.toggle('active', view === 'sell');
  if (view === 'collection') renderCollection();
  if (view === 'minigames') showHub();
  if (view === 'garden') showGarden();
  if (view === 'trade') showTrade();
  if (view === 'trader') showTrader();
  if (view === 'sell') showSell();
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

function tryBuyCardPack(tier) {
  const price = PACK_PRICES[tier];
  if (state.coins < price) return;
  state.coins -= price;
  saveState();
  refreshCoins();

  const cards = openPack(tier);
  state.opening = { kind: 'card', tier, cards, revealed: 0, newlyOwned: [] };
  state.view = 'opening';
  renderOpening();
}

function tryBuySeedPack(tier) {
  const price = SEED_PACK_PRICES[tier];
  if (state.coins < price) return;
  state.coins -= price;
  saveState();
  refreshCoins();

  const seeds = openSeedPack(tier);
  state.opening = { kind: 'seed', tier, cards: seeds, revealed: 0 };
  state.view = 'opening';
  renderOpening();
}

function renderOpening() {
  els.opening.classList.remove('hidden');
  els.openingCards.innerHTML = '';
  els.continueBtn.classList.add('hidden');
  const kind = state.opening.kind;
  els.openingHint.textContent =
    kind === 'seed'  ? 'Click packets to reveal seeds' :
    kind === 'water' ? 'Click to reveal watering cans' :
                       'Click cards to reveal';

  const backIcon = kind === 'seed' ? '🥜' : kind === 'water' ? '💦' : '🌱';

  state.opening.cards.forEach((item, i) => {
    const flipper = document.createElement('div');
    flipper.className = 'flipper';
    flipper.dataset.idx = i;

    const back = document.createElement('div');
    back.className = 'face back';
    back.textContent = backIcon;
    flipper.appendChild(back);

    flipper.addEventListener('click', () => revealOne(i, flipper));
    els.openingCards.appendChild(flipper);
  });
}

function revealOne(i, flipper) {
  if (flipper.classList.contains('flipped')) return;
  const item = state.opening.cards[i];
  const front = document.createElement('div');
  front.className = 'face front';

  if (state.opening.kind === 'seed') {
    const rarity = item;
    addSeed(rarity);
    front.appendChild(buildSeedFace(rarity));
  } else if (state.opening.kind === 'water') {
    const rarity = item;
    addWatering(rarity);
    front.appendChild(buildWaterFace(rarity));
  } else {
    const plant = plantById(item);
    const isNew = addCard(item);
    if (isNew) state.opening.newlyOwned.push(item);
    front.appendChild(buildCard(plant, { isNew }));
  }
  flipper.appendChild(front);
  flipper.classList.add('flipped');
  state.opening.revealed++;

  if (state.opening.revealed === state.opening.cards.length) {
    saveState();
    if (state.opening.kind === 'seed') {
      els.openingHint.textContent = `${state.opening.cards.length} seed${state.opening.cards.length > 1 ? 's' : ''} added — plant them in your garden`;
    } else if (state.opening.kind === 'water') {
      els.openingHint.textContent = `${state.opening.cards.length} watering can${state.opening.cards.length > 1 ? 's' : ''} added — use them in your garden`;
    } else {
      const n = state.opening.newlyOwned.length;
      els.openingHint.textContent = n > 0
        ? `${n} new card${n > 1 ? 's' : ''} added to your collection`
        : 'All duplicates — better luck next pack';
    }
    els.continueBtn.classList.remove('hidden');
  }
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
  document.querySelectorAll('.flipper:not(.flipped)').forEach(f => {
    const i = parseInt(f.dataset.idx, 10);
    revealOne(i, f);
  });
}
