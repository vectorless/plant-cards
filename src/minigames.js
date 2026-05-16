import { state } from './state.js';
import { saveState } from './store.js';

const $ = (id) => document.getElementById(id);

let els = {};
let active = null;  // { type, cleanup, raf, timers: [], ... }

const BALL_COLORS = [
  '#5cb85c', '#4a9be8', '#e8b048', '#d050d8', '#6cc06c',
  '#f4843a', '#ffd24a', '#a674d8',
];

const BAR_ZONES = [
  { from: 0.00, to: 0.40, reward: 0,  label: 'MISS',     color: '#c44040' },
  { from: 0.40, to: 0.45, reward: 10, label: 'OK',       color: '#c4a040' },
  { from: 0.45, to: 0.55, reward: 50, label: 'BULLSEYE', color: '#40c460' },
  { from: 0.55, to: 0.60, reward: 10, label: 'OK',       color: '#c4a040' },
  { from: 0.60, to: 1.00, reward: 0,  label: 'MISS',     color: '#c44040' },
];

const BAR_ROUNDS = 3;

export function initMinigames(refreshCoins) {
  els = {
    minigames: $('minigames'),
    hub: $('mgHub'),
    play: $('mgPlay'),
    title: $('mgTitle'),
    timer: $('mgTimer'),
    score: $('mgScore'),
    quit: $('mgQuit'),
    arena: $('mgArena'),
    result: $('mgResult'),
    resultTitle: $('mgResultTitle'),
    resultLine: $('mgResultLine'),
    playAgain: $('mgPlayAgain'),
    backHub: $('mgBackHub'),
  };
  els.refreshCoins = refreshCoins;

  document.querySelectorAll('.mg-pick [data-game]').forEach(btn => {
    btn.addEventListener('click', () => start(btn.dataset.game));
  });
  els.quit.addEventListener('click', endMinigame);
  els.playAgain.addEventListener('click', () => {
    if (active) {
      const type = active.type;
      cleanup();
      start(type);
    }
  });
  els.backHub.addEventListener('click', endMinigame);
}

export function showHub() {
  cleanup();
  els.hub.classList.remove('hidden');
  els.play.classList.add('hidden');
  els.result.classList.add('hidden');
}

function start(type) {
  cleanup();
  els.hub.classList.add('hidden');
  els.play.classList.remove('hidden');
  els.result.classList.add('hidden');
  els.arena.innerHTML = '';

  if (type === 'balls') startBalls();
  else if (type === 'bar') startBar();
}

function endMinigame() {
  cleanup();
  showHub();
}

function cleanup() {
  if (!active) return;
  if (active.raf) cancelAnimationFrame(active.raf);
  for (const t of active.timers) clearInterval(t);
  if (active.onCleanup) active.onCleanup();
  active = null;
}

function award(coins) {
  state.coins += coins;
  saveState();
  els.refreshCoins();
}

// ── Catch the Ball ─────────────────────────────────────────────────────────

function startBalls() {
  const BALLS = 10;
  const BOMBS = 4;
  const DURATION = 15;
  const SIZE = 26;
  let caught = 0;
  let timeLeft = DURATION;
  let ended = false;
  let bombHit = false;

  els.title.textContent = 'CATCH THE BALL';
  updateBallsHUD();

  const arena = els.arena;
  const rect = arena.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  const PAD = 8;

  const entities = [];

  function spawnEntity(isBomb) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 180 + Math.random() * 140; // px/sec
    const ent = {
      x: PAD + Math.random() * (W - 2 * PAD - SIZE),
      y: PAD + Math.random() * (H - 2 * PAD - SIZE),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      isBomb,
      el: document.createElement('div'),
      alive: true,
    };
    ent.el.className = 'mg-ball';
    ent.el.style.width = ent.el.style.height = SIZE + 'px';
    if (isBomb) {
      ent.el.style.background =
        'radial-gradient(circle at 30% 30%, #6a3030 0%, #2a0a0a 70%, #000 100%)';
      ent.el.style.border = '2px solid #c44040';
      ent.el.textContent = '✖';
      ent.el.style.color = '#ff8a8a';
      ent.el.style.textAlign = 'center';
      ent.el.style.lineHeight = (SIZE - 4) + 'px';
      ent.el.style.fontWeight = 'bold';
    } else {
      const c = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
      ent.el.style.background =
        `radial-gradient(circle at 30% 30%, #fff 0%, ${c} 40%, ${shade(c, -25)} 100%)`;
    }
    ent.el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (ended || !ent.alive) return;
      ent.alive = false;
      ent.el.classList.add('popped');
      if (ent.isBomb) {
        bombHit = true;
        finishBalls();
      } else {
        caught++;
        updateBallsHUD();
        if (caught === BALLS) finishBalls();
      }
    });
    arena.appendChild(ent.el);
    entities.push(ent);
  }

  for (let i = 0; i < BALLS; i++) spawnEntity(false);
  for (let i = 0; i < BOMBS; i++) spawnEntity(true);

  let last = performance.now();
  function frame(now) {
    if (ended) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    for (const e of entities) {
      if (!e.alive) continue;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.x < PAD) { e.x = PAD; e.vx = -e.vx; }
      if (e.y < PAD) { e.y = PAD; e.vy = -e.vy; }
      if (e.x > W - PAD - SIZE) { e.x = W - PAD - SIZE; e.vx = -e.vx; }
      if (e.y > H - PAD - SIZE) { e.y = H - PAD - SIZE; e.vy = -e.vy; }
      e.el.style.left = e.x + 'px';
      e.el.style.top = e.y + 'px';
    }
    active.raf = requestAnimationFrame(frame);
  }

  const timer = setInterval(() => {
    timeLeft--;
    updateBallsHUD();
    if (timeLeft <= 0) finishBalls();
  }, 1000);

  active = {
    type: 'balls',
    timers: [timer],
    raf: requestAnimationFrame(frame),
    onCleanup: () => { ended = true; },
  };

  function updateBallsHUD() {
    els.timer.textContent = `⏱ ${timeLeft}s`;
    els.score.textContent = `${caught}/${BALLS}`;
  }

  function finishBalls() {
    if (ended) return;
    ended = true;
    clearInterval(timer);
    cancelAnimationFrame(active.raf);
    let reward;
    let title, line;
    if (bombHit) {
      reward = 0;
      title = 'BOOM!';
      line = `Bomb clicked — no coins awarded`;
    } else {
      reward = caught * 5;
      title = caught === BALLS ? 'PERFECT!' : caught === 0 ? 'NOTHING…' : 'TIME UP';
      line = `Caught ${caught} of ${BALLS} balls — +${reward} coins`;
    }
    award(reward);
    showResult(title, line);
  }
}

// ── Timing Bar ─────────────────────────────────────────────────────────────

function startBar() {
  els.title.textContent = 'TIMING BAR';
  els.score.textContent = '';

  const arena = els.arena;
  arena.innerHTML = '';

  const bar = document.createElement('div');
  bar.id = 'mgBar';
  arena.appendChild(bar);

  const marker = document.createElement('div');
  marker.id = 'mgMarker';
  bar.appendChild(marker);

  for (const z of BAR_ZONES) {
    if (z.reward === 0) continue;
    const lbl = document.createElement('div');
    lbl.className = 'zone-label';
    lbl.style.left = ((z.from + z.to) / 2 * 100) + '%';
    lbl.textContent = `${z.label} +${z.reward}`;
    lbl.style.color = z.color;
    bar.appendChild(lbl);
  }

  const hint = document.createElement('div');
  hint.id = 'mgBarHint';
  hint.textContent = 'CLICK to lock in — miss any round and you get NOTHING';
  arena.appendChild(hint);

  let round = 1;
  let pos = 0;
  let dir = 1;
  let speed = 1.4;
  let last = performance.now();
  let ended = false;
  let total = 0;
  let resolving = false;
  updateBarHUD();

  function frame(now) {
    if (ended) return;
    const dt = (now - last) / 1000;
    last = now;
    if (!resolving) {
      pos += dir * speed * dt;
      if (pos > 1) { pos = 1; dir = -1; }
      if (pos < 0) { pos = 0; dir = 1; }
      marker.style.left = `calc(${pos * 100}% - 3px)`;
    }
    active.raf = requestAnimationFrame(frame);
  }
  active = {
    type: 'bar',
    timers: [],
    raf: requestAnimationFrame(frame),
    onCleanup: () => {
      ended = true;
      arena.removeEventListener('click', click);
    },
  };

  function click() {
    if (ended || resolving) return;
    const zone = BAR_ZONES.find(z => pos >= z.from && pos < z.to) ?? BAR_ZONES[BAR_ZONES.length - 1];
    if (zone.reward === 0) {
      // One miss = full failure
      ended = true;
      cancelAnimationFrame(active.raf);
      flashMarker('#c44040');
      showResult('MISSED', `Round ${round} of ${BAR_ROUNDS} — chain broken, +0 coins`);
      return;
    }
    total += zone.reward;
    flashMarker(zone.color);
    resolving = true;
    if (round >= BAR_ROUNDS) {
      ended = true;
      cancelAnimationFrame(active.raf);
      award(total);
      const allBullseye = total === BAR_ZONES.find(z => z.label === 'BULLSEYE').reward * BAR_ROUNDS;
      showResult(
        allBullseye ? 'FLAWLESS!' : 'COMPLETE',
        `${BAR_ROUNDS} rounds cleared — +${total} coins`
      );
      return;
    }
    setTimeout(() => {
      round++;
      speed *= 1.2;        // gets faster each round
      pos = Math.random();  // reset position
      dir = Math.random() < 0.5 ? -1 : 1;
      resolving = false;
      updateBarHUD();
    }, 450);
  }
  arena.addEventListener('click', click);

  function updateBarHUD() {
    els.timer.textContent = `ROUND ${round}/${BAR_ROUNDS}`;
    els.score.textContent = total > 0 ? `+${total}` : '';
  }

  function flashMarker(color) {
    marker.style.background = color;
    marker.style.boxShadow = `0 0 18px ${color}`;
    setTimeout(() => {
      marker.style.background = '#f0f0f0';
      marker.style.boxShadow = '0 0 12px #fff';
    }, 250);
  }
}

// ── Result screen ──────────────────────────────────────────────────────────

function showResult(title, line) {
  els.result.classList.remove('hidden');
  els.resultTitle.textContent = title;
  els.resultLine.textContent = line;
}

function shade(hex, pct) {
  if (!hex || !hex.startsWith('#')) return '#444';
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const t = pct < 0 ? 0 : 255;
  const p = Math.abs(pct) / 100;
  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
