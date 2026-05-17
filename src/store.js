import { state, STARTING_COINS } from './state.js';

const KEY = 'plant_cards:v1';

export function loadState() {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    resetDefaults();
    return;
  }
  try {
    const data = JSON.parse(raw);
    state.coins = Number.isFinite(data.coins) ? data.coins : STARTING_COINS;
    state.lastTickEpoch = Number.isFinite(data.lastTickEpoch) ? data.lastTickEpoch : Date.now();
    state.collection = data.collection && typeof data.collection === 'object' ? data.collection : {};
    state.seeds = mergeSeeds(data.seeds);
    state.pots = mergePots(data.pots);
    state.watering = mergeWatering(data.watering);
    state.lastDailyClaim = typeof data.lastDailyClaim === 'string' ? data.lastDailyClaim : null;
    state.traderDate = typeof data.traderDate === 'string' ? data.traderDate : null;
    state.traderPurchased = Array.isArray(data.traderPurchased) && data.traderPurchased.length === 3
      ? data.traderPurchased.map(Boolean) : [false, false, false];
    state.market = mergeMarket(data.market);
    state.autoOpen = !!data.autoOpen;
  } catch (e) {
    resetDefaults();
  }
}

function resetDefaults() {
  state.coins = STARTING_COINS;
  state.lastTickEpoch = Date.now();
  state.collection = {};
  state.seeds = { common: 0, uncommon: 0, rare: 0, legendary: 0, secret: 0 };
  state.pots = [null, null, null];
  state.watering = { common: 0, uncommon: 0, rare: 0 };
  state.lastDailyClaim = null;
  state.traderDate = null;
  state.traderPurchased = [false, false, false];
  state.market = { listings: [], earnings: 0, lastBotTick: 0 };
  state.autoOpen = false;
}

function mergeMarket(m) {
  const defaults = { listings: [], earnings: 0, lastBotTick: 0 };
  if (!m || typeof m !== 'object') return defaults;
  return {
    listings: Array.isArray(m.listings) ? m.listings : [],
    earnings: Number.isFinite(m.earnings) ? m.earnings : 0,
    lastBotTick: Number.isFinite(m.lastBotTick) ? m.lastBotTick : 0,
  };
}

function mergeWatering(w) {
  const defaults = { common: 0, uncommon: 0, rare: 0 };
  if (!w || typeof w !== 'object') return defaults;
  for (const k in defaults) {
    if (Number.isFinite(w[k])) defaults[k] = w[k];
  }
  return defaults;
}

function mergeSeeds(s) {
  const defaults = { common: 0, uncommon: 0, rare: 0, legendary: 0, secret: 0 };
  if (!s || typeof s !== 'object') return defaults;
  for (const k in defaults) {
    if (Number.isFinite(s[k])) defaults[k] = s[k];
  }
  return defaults;
}

function mergePots(p) {
  if (!Array.isArray(p)) return [null, null, null];
  const out = [null, null, null];
  for (let i = 0; i < 3; i++) {
    const pot = p[i];
    if (pot && typeof pot === 'object'
        && typeof pot.rarity === 'string'
        && Number.isFinite(pot.plantedAt)) {
      out[i] = { rarity: pot.rarity, plantedAt: pot.plantedAt };
    }
  }
  return out;
}

export function saveState() {
  const data = {
    coins: state.coins,
    lastTickEpoch: state.lastTickEpoch,
    collection: state.collection,
    seeds: state.seeds,
    pots: state.pots,
    watering: state.watering,
    lastDailyClaim: state.lastDailyClaim,
    traderDate: state.traderDate,
    traderPurchased: state.traderPurchased,
    market: state.market,
    autoOpen: state.autoOpen,
  };
  localStorage.setItem(KEY, JSON.stringify(data));
}
