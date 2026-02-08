import * as home from './screens/home.js';
import * as gameSelect from './screens/game-select.js';
import * as cardMatch from './games/card-match.js';
import * as numberSequence from './games/number-sequence.js';
import * as colorFind from './games/color-find.js';
import * as mathChallenge from './games/math-challenge.js';
import * as wordChain from './games/word-chain.js';
import { initAnalytics, track } from './utils/analytics.js';
import { getTotalPlays } from './utils/state.js';

const GAMES = {
  'card-match': cardMatch,
  'number-sequence': numberSequence,
  'color-find': colorFind,
  'math-challenge': mathChallenge,
  'word-chain': wordChain,
};

let currentCleanup = null;

function getApp() {
  return document.getElementById('app');
}

function navigate() {
  const hash = location.hash || '#/';
  const app = getApp();

  // Clean up previous screen
  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }
  app.innerHTML = '';

  // Route matching
  if (hash === '#/' || hash === '' || hash === '#') {
    track('screen_view', { screen_name: 'home' });
    home.render(app);
    currentCleanup = home.cleanup;
  } else if (hash === '#/games') {
    track('screen_view', { screen_name: 'game_select' });
    gameSelect.render(app);
    currentCleanup = gameSelect.cleanup;
  } else if (hash.startsWith('#/play/')) {
    const gameId = hash.replace('#/play/', '');
    const gameModule = GAMES[gameId];
    if (gameModule) {
      track('screen_view', { screen_name: `play_${gameId}` });
      gameModule.render(app);
      currentCleanup = gameModule.cleanup;
    } else {
      app.innerHTML = `
        <div class="home-screen">
          <div class="home-logo">🤔</div>
          <h2 class="title-md">게임을 찾을 수 없어요</h2>
          <button class="btn btn-primary" onclick="location.hash='#/games'">
            게임 목록으로
          </button>
        </div>
      `;
    }
  } else {
    // Default: go home
    location.hash = '#/';
  }
}

// Initialize analytics
initAnalytics();
track('app_open', { total_plays: getTotalPlays() });

// Listen for hash changes
window.addEventListener('hashchange', navigate);

// Initial navigation
navigate();
