import { state, tickCoins, applyOfflineCatchup,
         dailyEligible, claimDaily, DAILY_BONUS } from './state.js';
import { loadState, saveState } from './store.js';
import { initUI, refreshCoins, revealAll } from './ui.js';

loadState();
applyOfflineCatchup();
saveState();

initUI();

if (dailyEligible()) showDailyBonus();

function showDailyBonus() {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 300;
    background: rgba(5, 10, 7, 0.92);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; padding: 30px;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    background: linear-gradient(160deg, #2a200c, #1a1208);
    border: 2px solid #d6b048; border-radius: 12px;
    padding: 40px 60px; text-align: center;
    box-shadow: 0 0 60px rgba(232, 176, 72, 0.4);
    max-width: 420px;
  `;

  const icon = document.createElement('div');
  icon.textContent = '🌞';
  icon.style.cssText = 'font-size: 64px; line-height: 1; margin-bottom: 12px;';
  box.appendChild(icon);

  const title = document.createElement('div');
  title.textContent = 'DAILY BONUS';
  title.style.cssText = `
    font-size: 22px; letter-spacing: 8px; color: #ffe78a; margin-bottom: 12px;
  `;
  box.appendChild(title);

  const amount = document.createElement('div');
  amount.textContent = `+${DAILY_BONUS} coins`;
  amount.style.cssText = `
    font-size: 32px; letter-spacing: 4px; color: #fff8d0;
    font-family: 'Georgia', serif; margin: 8px 0 6px;
  `;
  box.appendChild(amount);

  const sub = document.createElement('div');
  sub.textContent = 'Welcome back. Come back tomorrow for more.';
  sub.style.cssText = `
    color: #c8b890; font-size: 13px; font-style: italic; margin-bottom: 22px;
  `;
  box.appendChild(sub);

  const btn = document.createElement('button');
  btn.textContent = 'CLAIM';
  btn.style.cssText = `
    padding: 12px 44px; font-size: 14px; letter-spacing: 6px;
    background: #1c2620; color: #ffe78a; border: 1px solid #d6b048;
    border-radius: 3px; cursor: pointer; font-family: inherit;
  `;
  btn.addEventListener('click', () => {
    claimDaily();
    saveState();
    refreshCoins();
    overlay.remove();
  });
  box.appendChild(btn);

  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

setInterval(() => {
  tickCoins();
  refreshCoins();
  // Save every 5 seconds to avoid hammering localStorage
  if (Math.floor(Date.now() / 1000) % 5 === 0) saveState();
}, 1000);

// Save on tab close so latest coins persist
window.addEventListener('beforeunload', saveState);
window.addEventListener('visibilitychange', () => {
  if (document.hidden) saveState();
});

// Reveal-all shortcut for impatient players
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    if (state.view === 'opening') {
      e.preventDefault();
      revealAll();
    }
  }
});

// Expose for debugging
window.__plant = { state };
