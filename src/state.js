export const state = {
  coins: 200,
  lastTickEpoch: Date.now(),
  collection: {},
  seeds: { common: 0, uncommon: 0, rare: 0, legendary: 0, secret: 0 },
  pots: [null, null, null],
  watering: { common: 0, uncommon: 0, rare: 0 },
  view: 'shop',
  opening: null,
};

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
