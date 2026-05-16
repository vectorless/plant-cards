import { state, tickCoins, applyOfflineCatchup } from './state.js';
import { loadState, saveState } from './store.js';
import { initUI, refreshCoins, revealAll } from './ui.js';

loadState();
applyOfflineCatchup();
saveState();

initUI();

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
