import { plantsByRarity } from './plants.js';

export const PACK_PRICES = {
  common: 50,
  uncommon: 100,
  rare: 250,
  elite: 500,
};

const TABLES = {
  common: {
    guaranteed: null,
    slots: 5,
    weights: { common: 0.88, uncommon: 0.12 },
  },
  uncommon: {
    guaranteed: 'uncommon',
    slots: 5,
    weights: { common: 0.40, uncommon: 0.55, rare: 0.05 },
  },
  rare: {
    guaranteed: 'rare',
    slots: 5,
    weights: { uncommon: 0.60, rare: 0.35, legendary: 0.045, secret: 0.005 },
  },
  elite: {
    guaranteed: null,
    slots: 1,
    weights: { legendary: 0.90, secret: 0.10 },
  },
};

export const SEED_PACK_PRICES = {
  common: 40,
  uncommon: 80,
  rare: 200,
  elite: 450,
};

const SEED_TABLES = {
  common: {
    guaranteed: null,
    slots: 3,
    weights: { common: 0.85, uncommon: 0.15 },
  },
  uncommon: {
    guaranteed: 'uncommon',
    slots: 3,
    weights: { common: 0.45, uncommon: 0.50, rare: 0.05 },
  },
  rare: {
    guaranteed: 'rare',
    slots: 3,
    weights: { uncommon: 0.60, rare: 0.35, legendary: 0.045, secret: 0.005 },
  },
  elite: {
    guaranteed: null,
    slots: 1,
    weights: { legendary: 0.90, secret: 0.10 },
  },
};

export const WATERING_PACK_PRICES = {
  common: 450,
  uncommon: 1100,
  rare: 2400,
};

const WATERING_TABLES = {
  common: {
    guaranteed: null,
    slots: 3,
    weights: { common: 0.85, uncommon: 0.15 },
  },
  uncommon: {
    guaranteed: 'uncommon',
    slots: 3,
    weights: { common: 0.40, uncommon: 0.55, rare: 0.05 },
  },
  rare: {
    guaranteed: 'rare',
    slots: 3,
    weights: { uncommon: 0.65, rare: 0.35 },
  },
};

export function openWateringPack(tier) {
  const table = WATERING_TABLES[tier];
  if (!table) throw new Error('Unknown watering pack tier: ' + tier);
  const cans = [];
  if (table.guaranteed) cans.push(table.guaranteed);
  while (cans.length < table.slots) cans.push(rollRarity(table.weights));
  for (let i = cans.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cans[i], cans[j]] = [cans[j], cans[i]];
  }
  return cans;
}

export function openSeedPack(tier) {
  const table = SEED_TABLES[tier];
  if (!table) throw new Error('Unknown seed tier: ' + tier);
  const seeds = [];
  if (table.guaranteed) seeds.push(table.guaranteed);
  while (seeds.length < table.slots) seeds.push(rollRarity(table.weights));
  for (let i = seeds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [seeds[i], seeds[j]] = [seeds[j], seeds[i]];
  }
  return seeds;
}

function rollRarity(weights) {
  const r = Math.random();
  let acc = 0;
  for (const rarity in weights) {
    acc += weights[rarity];
    if (r < acc) return rarity;
  }
  // Fallback to last entry in the table
  const keys = Object.keys(weights);
  return keys[keys.length - 1];
}

function pickPlantOfRarity(rarity) {
  const pool = plantsByRarity(rarity);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export function openPack(tier) {
  const table = TABLES[tier];
  if (!table) throw new Error('Unknown pack tier: ' + tier);
  const cards = [];
  let remaining = table.slots;
  if (table.guaranteed) {
    cards.push(pickPlantOfRarity(table.guaranteed));
    remaining--;
  }
  for (let i = 0; i < remaining; i++) {
    const rarity = rollRarity(table.weights);
    cards.push(pickPlantOfRarity(rarity));
  }
  // Shuffle so the guaranteed card isn't always first
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
