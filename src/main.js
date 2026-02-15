import * as home from './screens/home.js';
import * as gameSelect from './screens/game-select.js';
import * as cardMatch from './games/card-match.js';
import * as numberSequence from './games/number-sequence.js';
import * as colorFind from './games/color-find.js';
import * as mathChallenge from './games/math-challenge.js';
import { initAnalytics, track } from './utils/analytics.js';
import { getTotalPlays } from './utils/state.js';

const GAMES = {
  'card-match': cardMatch,
  'number-sequence': numberSequence,
  'color-find': colorFind,
  'math-challenge': mathChallenge,
};

let currentCleanup = null;
let currentScreenName = null;
let screenEnteredAt = 0;

function getApp() {
  return document.getElementById('app');
}

function navigate() {
  const hash = location.hash || '#/';
  const app = getApp();
  const nextScreenName = resolveScreenName(hash);

  if (currentScreenName && screenEnteredAt > 0) {
    track('screen_exit', {
      screen_name: currentScreenName,
      next_screen: nextScreenName,
      duration_ms: Date.now() - screenEnteredAt,
    });
  }

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
    setCurrentScreen('home');
  } else if (hash === '#/games') {
    track('screen_view', { screen_name: 'game_select' });
    gameSelect.render(app);
    currentCleanup = gameSelect.cleanup;
    setCurrentScreen('game_select');
  } else if (hash.startsWith('#/play/')) {
    const playPath = hash.replace('#/play/', '');
    const [gameId, difficultyRaw] = playPath.split('/');
    const difficulty = ['easy', 'normal', 'hard'].includes(difficultyRaw) ? difficultyRaw : 'easy';
    const gameModule = GAMES[gameId];
    if (gameModule) {
      track('screen_view', { screen_name: `play_${gameId}` });
      gameModule.render(app, difficulty);
      currentCleanup = gameModule.cleanup;
      setCurrentScreen(`play_${gameId}`);
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
      setCurrentScreen('not_found');
    }
  } else {
    // Default: go home
    location.hash = '#/';
  }
}

function setCurrentScreen(screenName) {
  currentScreenName = screenName;
  screenEnteredAt = Date.now();
}

function resolveScreenName(hash) {
  if (hash === '#/' || hash === '' || hash === '#') return 'home';
  if (hash === '#/games') return 'game_select';
  if (hash.startsWith('#/play/')) {
    const playPath = hash.replace('#/play/', '');
    const [gameId] = playPath.split('/');
    return `play_${gameId}`;
  }
  return 'unknown';
}

// Initialize analytics
initAnalytics();
track('app_open', { total_plays: getTotalPlays() });

// Listen for hash changes
window.addEventListener('hashchange', navigate);

// Initial navigation
navigate();
