import { state, cardCount, removeCard, SELL_PRICES } from './state.js';
import { saveState } from './store.js';
import { RARITIES, plantsByRarity, plantById } from './plants.js';

const $ = (id) => document.getElementById(id);

let els = {};
let refreshCoinsFn = null;

export function initSell(refreshCoins) {
  els = {
    view:  $('sell'),
    body:  $('sellBody'),
  };
  refreshCoinsFn = refreshCoins;
}

export function showSell() {
  render();
}

function render() {
  els.body.innerHTML = '';

  let anyOwned = false;

  for (const rarity of RARITIES) {
    const plants = plantsByRarity(rarity).filter(p => cardCount(p.id) > 0);
    if (plants.length === 0) continue;
    anyOwned = true;

    const group = document.createElement('div');
    group.className = 'sell-group';
    group.dataset.rarity = rarity;

    const header = document.createElement('div');
    header.className = 'sell-header';
    header.innerHTML =
      `<span class="rarity-label">${rarity.toUpperCase()}</span>` +
      `<span class="rarity-price">${SELL_PRICES[rarity]} coins each</span>`;
    group.appendChild(header);

    for (const plant of plants) {
      group.appendChild(buildRow(plant));
    }

    els.body.appendChild(group);
  }

  if (!anyOwned) {
    const empty = document.createElement('div');
    empty.className = 'sell-empty';
    empty.textContent = 'You don\'t own any cards yet. Open packs, harvest the garden, or buy from the trader.';
    els.body.appendChild(empty);
  }
}

function buildRow(plant) {
  const have = cardCount(plant.id);
  const price = SELL_PRICES[plant.rarity];

  const row = document.createElement('div');
  row.className = 'sell-row';
  row.dataset.rarity = plant.rarity;

  const left = document.createElement('div');
  left.className = 'sell-row-left';

  const dot = document.createElement('span');
  dot.className = 'sell-dot';
  left.appendChild(dot);

  const name = document.createElement('span');
  name.className = 'sell-name';
  name.textContent = plant.name;
  left.appendChild(name);

  const count = document.createElement('span');
  count.className = 'sell-count';
  count.textContent = `×${have}`;
  left.appendChild(count);

  row.appendChild(left);

  const right = document.createElement('div');
  right.className = 'sell-row-right';

  const sell1 = document.createElement('button');
  sell1.className = 'sell-btn';
  sell1.textContent = `SELL 1  +${price}`;
  sell1.addEventListener('click', () => sellN(plant.id, 1));
  right.appendChild(sell1);

  if (have > 1) {
    const dups = have - 1;
    const sellDups = document.createElement('button');
    sellDups.className = 'sell-btn sell-btn-dups';
    sellDups.textContent = `SELL ${dups} DUP${dups > 1 ? 'S' : ''}  +${price * dups}`;
    sellDups.title = `Sell all duplicates (keep 1 ${plant.name})`;
    sellDups.addEventListener('click', () => sellN(plant.id, dups));
    right.appendChild(sellDups);
  }

  row.appendChild(right);
  return row;
}

function sellN(plantId, n) {
  const plant = plantById(plantId);
  if (!plant) return;
  const price = SELL_PRICES[plant.rarity] * n;
  if (!removeCard(plantId, n)) return;
  state.coins += price;
  saveState();
  refreshCoinsFn();
  render();
}
