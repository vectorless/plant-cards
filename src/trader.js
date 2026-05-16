import { state, todayKey, addCard, TRADER_PRICES } from './state.js';
import { saveState } from './store.js';
import { plantsByRarity } from './plants.js';
import { buildCard } from './svg.js';

const $ = (id) => document.getElementById(id);

// Tiered slot weights — each day's 3 offers go cheap → mid → premium.
const SLOT_WEIGHTS = [
  { common: 0.55, uncommon: 0.45 },
  { uncommon: 0.50, rare: 0.50 },
  { rare: 0.50, legendary: 0.35, secret: 0.15 },
];

let els = {};
let refreshCoinsFn = null;

export function initTrader(refreshCoins) {
  els = {
    view:   $('trader'),
    title:  $('traderTitle'),
    slots:  $('traderSlots'),
  };
  refreshCoinsFn = refreshCoins;
}

export function showTrader() {
  resetIfNewDay();
  render();
}

function resetIfNewDay() {
  const today = todayKey();
  if (state.traderDate !== today) {
    state.traderDate = today;
    state.traderPurchased = [false, false, false];
    saveState();
  }
}

function seedRand(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967295;
  };
}

function pickWeighted(weights, rand) {
  const r = rand();
  let acc = 0;
  for (const rarity in weights) {
    acc += weights[rarity];
    if (r < acc) return rarity;
  }
  const keys = Object.keys(weights);
  return keys[keys.length - 1];
}

function todaysOffers() {
  // Salt the seed with 'trader' so cards differ from any other date-keyed RNG.
  const rand = seedRand('trader:' + todayKey());
  const offers = [];
  for (let i = 0; i < 3; i++) {
    const rarity = pickWeighted(SLOT_WEIGHTS[i], rand);
    const pool = plantsByRarity(rarity);
    const plant = pool[Math.floor(rand() * pool.length)];
    offers.push(plant);
  }
  return offers;
}

function render() {
  els.title.textContent = `TODAY'S OFFERINGS — rotates at midnight`;
  els.slots.innerHTML = '';

  const offers = todaysOffers();
  offers.forEach((plant, i) => {
    const slot = document.createElement('div');
    slot.className = 'trader-slot';

    slot.appendChild(buildCard(plant));

    const price = TRADER_PRICES[plant.rarity];
    const priceEl = document.createElement('div');
    priceEl.className = 'trader-price';
    priceEl.textContent = `${price} coins`;
    slot.appendChild(priceEl);

    const btn = document.createElement('button');
    btn.className = 'trader-buy';
    const owned = state.traderPurchased[i];
    if (owned) {
      btn.textContent = 'PURCHASED';
      btn.disabled = true;
    } else if (state.coins < price) {
      btn.textContent = 'NOT ENOUGH';
      btn.disabled = true;
    } else {
      btn.textContent = 'BUY';
    }
    btn.addEventListener('click', () => buy(i, plant, price));
    slot.appendChild(btn);

    els.slots.appendChild(slot);
  });
}

function buy(i, plant, price) {
  if (state.traderPurchased[i]) return;
  if (state.coins < price) return;
  state.coins -= price;
  state.traderPurchased[i] = true;
  addCard(plant.id);
  saveState();
  refreshCoinsFn();
  render();
}
