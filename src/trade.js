import { state, cardCount, removeCard, addCard,
         TRADE_NEXT_RARITY, TRADE_COST } from './state.js';
import { saveState } from './store.js';
import { plantsByRarity, plantById } from './plants.js';
import { buildCard } from './svg.js';

const $ = (id) => document.getElementById(id);

const TIERS = ['common', 'uncommon', 'rare', 'legendary'];

let els = {};
let activeFrom = 'common';
let selected = {};  // { plantId: n }

export function initTrade() {
  els = {
    trade:     $('trade'),
    tiers:     $('tradeTiers'),
    summary:   $('tradeSummary'),
    grid:      $('tradeGrid'),
    fuseBtn:   $('tradeFuseBtn'),
  };

  for (const from of TIERS) {
    const btn = document.createElement('button');
    btn.className = 'tier-pill';
    btn.dataset.from = from;
    btn.textContent = `${from.toUpperCase()} → ${TRADE_NEXT_RARITY[from].toUpperCase()}`;
    btn.addEventListener('click', () => setTier(from));
    els.tiers.appendChild(btn);
  }

  els.fuseBtn.addEventListener('click', fuse);
}

export function showTrade() {
  selected = {};
  render();
}

function setTier(from) {
  if (activeFrom === from) return;
  activeFrom = from;
  selected = {};
  render();
}

function totalSelected() {
  return Object.values(selected).reduce((a, b) => a + b, 0);
}

function render() {
  for (const btn of els.tiers.querySelectorAll('.tier-pill')) {
    btn.classList.toggle('active', btn.dataset.from === activeFrom);
  }

  const total = totalSelected();
  els.summary.innerHTML = `Pick <span class="sel">3</span> ${activeFrom} cards to fuse into <span class="sel">1 random ${TRADE_NEXT_RARITY[activeFrom]}</span>.  Selected: <span class="sel">${total}/${TRADE_COST}</span>`;

  els.fuseBtn.disabled = total !== TRADE_COST;
  els.fuseBtn.textContent = `FUSE → 1 ${TRADE_NEXT_RARITY[activeFrom].toUpperCase()}`;

  els.grid.innerHTML = '';

  const owned = plantsByRarity(activeFrom).filter(p => cardCount(p.id) > 0);
  if (owned.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'trade-empty';
    empty.textContent = `You don't own any ${activeFrom} cards yet. Open packs or grow seeds to collect some.`;
    els.grid.appendChild(empty);
    return;
  }

  for (const plant of owned) {
    const have = cardCount(plant.id);
    const sel = selected[plant.id] ?? 0;
    const cell = document.createElement('div');
    cell.className = 'trade-cell';
    if (sel > 0) cell.classList.add('has-selection');
    if (have - sel === 0 && sel === 0) cell.classList.add('exhausted');

    cell.appendChild(buildCard(plant, { count: have }));

    if (sel > 0) {
      const sn = document.createElement('div');
      sn.className = 'selN';
      sn.textContent = `${sel} picked`;
      cell.appendChild(sn);
    }

    const stepper = document.createElement('div');
    stepper.className = 'trade-stepper';
    const minus = document.createElement('button');
    minus.textContent = '−';
    minus.disabled = sel <= 0;
    minus.addEventListener('click', (e) => { e.stopPropagation(); changeSel(plant.id, -1); });
    const plus = document.createElement('button');
    plus.textContent = '+';
    plus.disabled = sel >= have || totalSelected() >= TRADE_COST;
    plus.addEventListener('click', (e) => { e.stopPropagation(); changeSel(plant.id, +1); });
    stepper.appendChild(minus);
    stepper.appendChild(plus);
    cell.appendChild(stepper);

    cell.addEventListener('click', () => {
      const cur = selected[plant.id] ?? 0;
      if (cur < have && totalSelected() < TRADE_COST) changeSel(plant.id, +1);
    });

    els.grid.appendChild(cell);
  }
}

function changeSel(plantId, delta) {
  const cur = selected[plantId] ?? 0;
  const have = cardCount(plantId);
  const total = totalSelected();
  let next = cur + delta;
  if (next < 0) next = 0;
  if (next > have) next = have;
  if (delta > 0 && total >= TRADE_COST) return;
  if (next === 0) delete selected[plantId];
  else selected[plantId] = next;
  render();
}

function fuse() {
  if (totalSelected() !== TRADE_COST) return;

  for (const [plantId, n] of Object.entries(selected)) {
    removeCard(plantId, n);
  }
  const nextRarity = TRADE_NEXT_RARITY[activeFrom];
  const pool = plantsByRarity(nextRarity);
  const plant = pool[Math.floor(Math.random() * pool.length)];
  const isNew = addCard(plant.id);
  saveState();

  showFuseReveal(plant, isNew);
  selected = {};
  render();
}

function showFuseReveal(plant, isNew) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 200;
    background: rgba(5, 10, 7, 0.92);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 30px;
  `;

  const heading = document.createElement('div');
  heading.style.cssText = `
    font-size: 22px; letter-spacing: 6px; color: #ffe78a; margin-bottom: 18px;
  `;
  heading.textContent = isNew ? 'FUSED — NEW CARD!' : 'FUSED';
  overlay.appendChild(heading);

  overlay.appendChild(buildCard(plant, { isNew }));

  const btn = document.createElement('button');
  btn.textContent = 'CONTINUE';
  btn.style.cssText = `
    margin-top: 24px; padding: 12px 36px; font-size: 14px;
    background: #1c2620; color: #e6eee4; border: 1px solid #5a7060;
    letter-spacing: 4px; border-radius: 2px; cursor: pointer;
    font-family: inherit;
  `;
  btn.addEventListener('click', () => overlay.remove());
  overlay.appendChild(btn);

  document.body.appendChild(overlay);
}
