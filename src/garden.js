import { state, GROW_TIMES_MS, addSeed, seedCount,
         plantSeed, potReady, clearPot, addCard,
         WATERING_TIERS, WATERING_REDUCTION_MS,
         wateringCount, useWatering } from './state.js';
import { saveState } from './store.js';
import { RARITIES, plantsByRarity, plantById } from './plants.js';
import { buildCard } from './svg.js';

const $ = (id) => document.getElementById(id);

const RARITY_ICONS = {
  common:    '🌱',
  uncommon:  '🌿',
  rare:      '🌺',
  legendary: '🌸',
  secret:    '🌌',
};

const WATER_ICONS = { common: '💧', uncommon: '🚰', rare: '⛲' };
const WATER_LABEL = { common: '-30s', uncommon: '-2m', rare: '-5m' };

let els = {};
let tickId = null;
let visible = false;

export function initGarden() {
  els = {
    garden:    $('garden'),
    seedInv:   $('seedInv'),
    pots:      $('pots'),
  };
}

export function showGarden() {
  visible = true;
  render();
  if (tickId == null) tickId = setInterval(tickFrame, 500);
}

export function hideGarden() {
  visible = false;
  if (tickId != null) { clearInterval(tickId); tickId = null; }
}

export function refreshGarden() {
  if (visible) render();
}

function tickFrame() {
  if (!visible) return;
  for (let i = 0; i < 3; i++) {
    const pot = state.pots[i];
    if (!pot) continue;
    updatePotProgress(i);
  }
}

function render() {
  renderSeedInventory();
  renderPots();
}

function renderSeedInventory() {
  els.seedInv.innerHTML = '';
  let any = false;
  for (const r of RARITIES) {
    const n = seedCount(r);
    if (n <= 0) continue;
    any = true;
    const chip = document.createElement('div');
    chip.className = 'seed-chip';
    chip.dataset.rarity = r;
    chip.innerHTML = `${RARITY_ICONS[r]} ${r.toUpperCase()} <span class="num">×${n}</span>`;
    els.seedInv.appendChild(chip);
  }
  for (const w of WATERING_TIERS) {
    const n = wateringCount(w);
    if (n <= 0) continue;
    any = true;
    const chip = document.createElement('div');
    chip.className = 'seed-chip water';
    chip.dataset.rarity = 'water-' + w;
    chip.innerHTML = `${WATER_ICONS[w]} ${w.toUpperCase()} CAN <span class="num">×${n}</span>`;
    els.seedInv.appendChild(chip);
  }

  if (!any) {
    const empty = document.createElement('div');
    empty.style.color = '#8a9c8e';
    empty.style.fontStyle = 'italic';
    empty.style.fontSize = '13px';
    empty.textContent = 'No seeds yet — buy seed packs in the shop.';
    els.seedInv.appendChild(empty);
  }
}

function renderPots() {
  els.pots.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    els.pots.appendChild(buildPot(i));
  }
}

function buildPot(idx) {
  const pot = state.pots[idx];
  const div = document.createElement('div');
  div.className = 'pot';
  div.dataset.idx = idx;

  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = `POT ${idx + 1}`;
  div.appendChild(label);

  if (!pot) {
    div.dataset.state = 'empty';
    const icon = document.createElement('div');
    icon.className = 'icon';
    icon.textContent = '🪴';
    icon.style.filter = 'grayscale(0.4) brightness(0.7)';
    div.appendChild(icon);

    const hint = document.createElement('div');
    hint.style.fontSize = '12px';
    hint.style.opacity = '0.6';
    hint.style.letterSpacing = '2px';
    hint.textContent = 'PLANT A SEED';
    div.appendChild(hint);

    const menu = document.createElement('div');
    menu.className = 'plant-menu';
    for (const r of RARITIES) {
      const btn = document.createElement('button');
      btn.dataset.rarity = r;
      const count = seedCount(r);
      btn.disabled = count <= 0;
      btn.textContent = `${RARITY_ICONS[r]} ${r.toUpperCase()} (${count})`;
      btn.addEventListener('click', () => {
        if (plantSeed(idx, r)) {
          saveState();
          render();
        }
      });
      menu.appendChild(btn);
    }
    div.appendChild(menu);
  } else {
    div.dataset.rarity = pot.rarity;
    const ready = potReady(idx);
    div.dataset.state = ready ? 'ready' : 'growing';

    const icon = document.createElement('div');
    icon.className = 'icon';
    icon.textContent = ready ? '🌸' : RARITY_ICONS[pot.rarity];
    div.appendChild(icon);

    const tag = document.createElement('div');
    tag.className = 'rarity-tag';
    tag.textContent = pot.rarity;
    div.appendChild(tag);

    const progress = document.createElement('div');
    progress.className = 'progress';
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.dataset.bar = '';
    progress.appendChild(bar);
    div.appendChild(progress);

    const timer = document.createElement('div');
    timer.className = 'timer';
    timer.dataset.timer = '';
    div.appendChild(timer);

    if (ready) {
      const harvest = document.createElement('button');
      harvest.className = 'harvest-btn';
      harvest.textContent = '✨ HARVEST';
      harvest.addEventListener('click', () => harvestPot(idx));
      div.appendChild(harvest);
    } else {
      const ownsAny = WATERING_TIERS.some(t => wateringCount(t) > 0);
      if (ownsAny) {
        const waterRow = document.createElement('div');
        waterRow.className = 'water-row';
        for (const t of WATERING_TIERS) {
          const n = wateringCount(t);
          if (n <= 0) continue;
          const btn = document.createElement('button');
          btn.className = 'water-btn';
          btn.dataset.tier = t;
          btn.innerHTML = `${WATER_ICONS[t]} ${WATER_LABEL[t]} <span class="n">×${n}</span>`;
          btn.addEventListener('click', () => waterPot(idx, t));
          waterRow.appendChild(btn);
        }
        div.appendChild(waterRow);
      }
    }

    queueMicrotask(() => updatePotProgress(idx));
  }

  return div;
}

function updatePotProgress(idx) {
  const div = els.pots.querySelector(`.pot[data-idx="${idx}"]`);
  if (!div) return;
  const pot = state.pots[idx];
  if (!pot) return;
  const total = GROW_TIMES_MS[pot.rarity];
  const elapsed = Date.now() - pot.plantedAt;
  const pct = Math.min(100, (elapsed / total) * 100);
  const remaining = Math.max(0, total - elapsed);
  const bar = div.querySelector('[data-bar]');
  const timer = div.querySelector('[data-timer]');
  if (bar) bar.style.width = pct + '%';
  if (timer) timer.textContent = remaining === 0
    ? 'READY!'
    : formatTime(remaining) + ' remaining';
  // Switch state from growing → ready if needed
  if (pct >= 100 && div.dataset.state === 'growing') {
    renderPots();
  }
}

function formatTime(ms) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `0:${String(r).padStart(2, '0')}`;
}

function waterPot(idx, tier) {
  if (useWatering(idx, tier)) {
    saveState();
    render();
  }
}

function harvestPot(idx) {
  if (!potReady(idx)) return;
  const pot = state.pots[idx];
  const pool = plantsByRarity(pot.rarity);
  const plant = pool[Math.floor(Math.random() * pool.length)];
  const isNew = addCard(plant.id);
  clearPot(idx);
  saveState();
  showHarvestReveal(plant, isNew);
  render();
}

// ── Harvest reveal overlay ────────────────────────────────────────────────

function showHarvestReveal(plant, isNew) {
  const overlay = document.createElement('div');
  overlay.id = 'harvestOverlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 200;
    background: rgba(5, 10, 7, 0.92);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 30px;
  `;

  const heading = document.createElement('div');
  heading.style.cssText = `
    font-size: 22px; letter-spacing: 6px; color: #ffe78a; margin-bottom: 18px;
  `;
  heading.textContent = isNew ? 'HARVESTED — NEW CARD!' : 'HARVESTED';
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
