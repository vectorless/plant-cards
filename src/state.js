export const state = {
  coins: 200,
  lastTickEpoch: Date.now(),
  collection: {},
  seeds: { common: 0, uncommon: 0, rare: 0, legendary: 0, secret: 0 },
  pots: [null, null, null],
  watering: { common: 0, uncommon: 0, rare: 0 },
  lastDailyClaim: null,
  traderDate: null,
  traderPurchased: [false, false, false],
  market: { listings: [], earnings: 0, lastBotTick: 0 },
  view: 'shop',
  opening: null,
};

export const TRADER_PRICES = {
  common: 50,
  uncommon: 100,
  rare: 250,
  legendary: 750,
  secret: 1500,
};

export const SELL_PRICES = {
  common: 5,
  uncommon: 10,
  rare: 25,
  legendary: 450,
  secret: 1000,
};

export const DAILY_BONUS = 200;

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dailyEligible() {
  return state.lastDailyClaim !== todayKey();
}

export function claimDaily() {
  if (!dailyEligible()) return false;
  state.coins += DAILY_BONUS;
  state.lastDailyClaim = todayKey();
  return true;
}

export const GROW_TIMES_MS = {
  common: 30_000,
  uncommon: 45_000,
  rare: 2 * 60_000,
  legendary: 5 * 60_000,
  secret: 10 * 60_000,
};

export const WATERING_REDUCTION_MS = {
  common: 30_000,
  uncommon: 2 * 60_000,
  rare: 5 * 60_000,
};

export const WATERING_TIERS = ['common', 'uncommon', 'rare'];

export const STARTING_COINS = 200;
export const COINS_PER_SEC = 1;
export const MAX_OFFLINE_SECONDS = 3600;

export function applyOfflineCatchup(now = Date.now()) {
  const elapsed = Math.max(0, Math.floor((now - state.lastTickEpoch) / 1000));
  const earned = Math.min(elapsed, MAX_OFFLINE_SECONDS) * COINS_PER_SEC;
  state.coins += earned;
  state.lastTickEpoch = now;
  return earned;
}

export function tickCoins() {
  state.coins += COINS_PER_SEC;
  state.lastTickEpoch = Date.now();
}

export function addCard(plantId) {
  state.collection[plantId] = (state.collection[plantId] ?? 0) + 1;
  return state.collection[plantId] === 1;
}

export function hasCard(plantId) {
  return (state.collection[plantId] ?? 0) > 0;
}

export function cardCount(plantId) {
  return state.collection[plantId] ?? 0;
}

export function removeCard(plantId, n = 1) {
  const have = state.collection[plantId] ?? 0;
  if (have < n) return false;
  if (have === n) delete state.collection[plantId];
  else state.collection[plantId] = have - n;
  return true;
}

export const TRADE_NEXT_RARITY = {
  common: 'uncommon',
  uncommon: 'rare',
  rare: 'legendary',
  legendary: 'secret',
};

export const TRADE_COST = 5;

export function addSeed(rarity) {
  state.seeds[rarity] = (state.seeds[rarity] ?? 0) + 1;
}

export function seedCount(rarity) {
  return state.seeds[rarity] ?? 0;
}

export function plantSeed(potIdx, rarity) {
  if (state.pots[potIdx] != null) return false;
  if (seedCount(rarity) <= 0) return false;
  state.seeds[rarity]--;
  state.pots[potIdx] = { rarity, plantedAt: Date.now() };
  return true;
}

export function potReady(potIdx) {
  const pot = state.pots[potIdx];
  if (!pot) return false;
  return (Date.now() - pot.plantedAt) >= GROW_TIMES_MS[pot.rarity];
}

export function clearPot(potIdx) {
  state.pots[potIdx] = null;
}

export function addWatering(tier) {
  state.watering[tier] = (state.watering[tier] ?? 0) + 1;
}

export function wateringCount(tier) {
  return state.watering[tier] ?? 0;
}

export function useWatering(potIdx, tier) {
  if (wateringCount(tier) <= 0) return false;
  const pot = state.pots[potIdx];
  if (!pot) return false;
  state.watering[tier]--;
  pot.plantedAt -= WATERING_REDUCTION_MS[tier];
  return true;
}
