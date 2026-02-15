import { renderHeader } from '../components/header.js';
import { showGameResultModal } from '../components/game-result-modal.js';
import { showToast } from '../components/toast.js';
import { shuffle, getEncouragement, formatSeconds } from '../utils/helpers.js';
import { recordTimedPlay, getTotalPlays } from '../utils/state.js';
import { track } from '../utils/analytics.js';

const EMOJI_POOL = ['🍎', '🍊', '🍋', '🍇', '🍓', '🌸', '🌻', '⭐', '🌈', '🎵', '🐶', '🐱', '🐸', '🦋', '🐢', '🐘'];

const DIFFICULTY = {
  easy: { pairs: 3, cols: 3 },
  normal: { pairs: 6, cols: 4 },
  hard: { pairs: 8, cols: 4 },
};

let currentDifficulty = 'easy';
let cards = [];
let flipped = [];
let matched = [];
let moves = 0;
let locked = false;
let startTime = 0;
let timerInterval = null;
let pendingTimeouts = [];

export function render(container, difficulty = 'easy') {
  cleanup();
  currentDifficulty = difficulty;
  moves = 0;
  matched = [];
  flipped = [];
  locked = false;
  startTime = Date.now();

  renderHeader(container, '카드 짝 맞추기', '#/games');

  track('game_start', { game_id: 'card-match', difficulty: currentDifficulty });

  // Status
  const status = document.createElement('div');
  status.className = 'game-status game-status-timer';
  status.id = 'card-status';
  status.innerHTML = `
    <span>시도: <strong id="move-count">0</strong></span>
    <span class="timer-main">시간: <strong id="card-timer">00:00</strong></span>
    <span>남은 짝: <strong id="remaining">${DIFFICULTY[currentDifficulty].pairs}</strong></span>
  `;
  container.appendChild(status);

  // Build cards
  const config = DIFFICULTY[currentDifficulty];
  const selectedEmojis = shuffle(EMOJI_POOL).slice(0, config.pairs);
  cards = shuffle([...selectedEmojis, ...selectedEmojis]);

  const grid = document.createElement('div');
  grid.className = `card-grid card-grid-${currentDifficulty}`;

  cards.forEach((emoji, index) => {
    const card = document.createElement('div');
    card.className = 'game-card game-card-hidden';
    card.dataset.index = index;
    card.dataset.emoji = emoji;
    card.addEventListener('click', () => handleCardClick(card, index));
    grid.appendChild(card);
  });

  container.appendChild(grid);

  startTimer();
}

function handleCardClick(cardEl, index) {
  if (locked) return;
  if (flipped.includes(index)) return;
  if (matched.includes(index)) return;

  // Reveal card
  cardEl.className = 'game-card game-card-revealed';
  cardEl.textContent = cards[index];
  flipped.push(index);

  if (flipped.length === 2) {
    moves++;
    document.getElementById('move-count').textContent = moves;
    locked = true;

    const [i1, i2] = flipped;
    if (cards[i1] === cards[i2]) {
      // Match found
      matched.push(i1, i2);
      const allCards = document.querySelectorAll('.game-card');
      allCards[i1].className = 'game-card game-card-matched';
      allCards[i2].className = 'game-card game-card-matched';

      document.getElementById('remaining').textContent =
        DIFFICULTY[currentDifficulty].pairs - matched.length / 2;

      showFeedback(getEncouragement(), 'success');
      flipped = [];
      locked = false;

      // Check win
      if (matched.length === cards.length) {
        queueTimeout(() => onWin(), 500);
      }
    } else {
      // No match - flip back
      queueTimeout(() => {
        const allCards = document.querySelectorAll('.game-card');
        allCards[i1].className = 'game-card game-card-hidden';
        allCards[i1].textContent = '';
        allCards[i2].className = 'game-card game-card-hidden';
        allCards[i2].textContent = '';
        flipped = [];
        locked = false;
      }, 800);
    }
  }
}

function showFeedback(msg, type) {
  showToast(msg, type, 900);
}

function onWin() {
  stopTimer();
  const finalTime = getElapsedSeconds();
  const missCount = Math.max(0, moves - DIFFICULTY[currentDifficulty].pairs);
  const { currentBest, isBest } = recordTimedPlay('card-match', currentDifficulty, finalTime);
  track('game_complete', {
    game_id: 'card-match',
    difficulty: currentDifficulty,
    score: finalTime,
    mismatch_count: missCount,
    total_plays: getTotalPlays(),
  });

  showGameResultModal({
    gameId: 'card-match',
    gameTitle: '카드 짝 맞추기',
    difficulty: currentDifficulty,
    thumbnail: '/thumbnails/card-match.svg',
    timeSeconds: finalTime,
    currentBest,
    isBest,
    details: [
      `시도 ${moves}회`,
      `미스매치 ${missCount}회`,
    ],
    onReplay: () => {
      track('game_replay', { game_id: 'card-match', difficulty: currentDifficulty });
      const app = document.getElementById('app');
      app.innerHTML = '';
      render(app, currentDifficulty);
    },
    onExit: () => {
      track('game_exit', { game_id: 'card-match' });
      location.hash = '#/games';
    },
  });
}

function getElapsedSeconds() {
  if (!startTime) return 0;
  return Math.floor((Date.now() - startTime) / 1000);
}

function updateTimer() {
  const timerEl = document.getElementById('card-timer');
  if (timerEl) {
    timerEl.textContent = formatSeconds(getElapsedSeconds());
  }
}

function startTimer() {
  stopTimer();
  updateTimer();
  timerInterval = setInterval(updateTimer, 250);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function queueTimeout(fn, ms) {
  const id = setTimeout(() => {
    pendingTimeouts = pendingTimeouts.filter(timeoutId => timeoutId !== id);
    fn();
  }, ms);
  pendingTimeouts.push(id);
}

function clearPendingTimeouts() {
  pendingTimeouts.forEach(clearTimeout);
  pendingTimeouts = [];
}

export function cleanup() {
  stopTimer();
  clearPendingTimeouts();
}
