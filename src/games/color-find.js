import { renderHeader } from '../components/header.js';
import { showGameResultModal } from '../components/game-result-modal.js';
import { showToast } from '../components/toast.js';
import { randInt, getEncouragement, getRetryMessage, formatSeconds } from '../utils/helpers.js';
import { recordTimedPlay, getTotalPlays } from '../utils/state.js';
import { track } from '../utils/analytics.js';

const DIFFICULTY_CONFIG = {
  easy: { gridSize: 9, cols: 3, colorDiff: 60, rounds: 5 },
  normal: { gridSize: 16, cols: 4, colorDiff: 35, rounds: 7 },
  hard: { gridSize: 25, cols: 5, colorDiff: 20, rounds: 10 },
};

const BASE_COLORS = [
  { h: 0, s: 70, l: 60 },    // red
  { h: 30, s: 80, l: 55 },   // orange
  { h: 60, s: 70, l: 50 },   // yellow
  { h: 120, s: 50, l: 50 },  // green
  { h: 200, s: 60, l: 55 },  // blue
  { h: 260, s: 50, l: 60 },  // purple
  { h: 340, s: 60, l: 60 },  // pink
];

let currentDifficulty = 'easy';
let round = 0;
let totalRounds = 5;
let wrongCount = 0;
let penaltySeconds = 0;
let startTime = 0;
let timerInterval = null;
let acceptingPick = true;
const WRONG_PENALTY_SECONDS = 3;
let pendingTimeouts = [];

export function render(container, difficulty = 'easy') {
  cleanup();
  currentDifficulty = difficulty;
  round = 0;
  totalRounds = DIFFICULTY_CONFIG[difficulty].rounds;
  wrongCount = 0;
  penaltySeconds = 0;
  startTime = Date.now();
  acceptingPick = true;

  renderHeader(container, '색깔 찾기', '#/games');

  track('game_start', { game_id: 'color-find', difficulty: currentDifficulty });

  const status = document.createElement('div');
  status.className = 'game-status game-status-timer';
  status.id = 'color-status';
  container.appendChild(status);

  const hint = document.createElement('div');
  hint.className = 'feedback feedback-info';
  hint.textContent = '다른 색깔 하나를 찾아주세요!';
  hint.style.marginBottom = 'var(--spacing-md)';
  container.appendChild(hint);

  const content = document.createElement('div');
  content.className = 'game-content';
  content.id = 'color-content';
  container.appendChild(content);

  startTimer();
  nextRound();
}

function nextRound() {
  round++;
  if (round > totalRounds) {
    onFinish();
    return;
  }

  updateStatus();
  acceptingPick = true;
  const config = DIFFICULTY_CONFIG[currentDifficulty];

  // Pick a base color
  const base = BASE_COLORS[randInt(0, BASE_COLORS.length - 1)];
  const diff = config.colorDiff;

  // Create the "different" color by shifting hue or lightness
  const shiftType = Math.random() > 0.5 ? 'h' : 'l';
  const shiftDir = Math.random() > 0.5 ? 1 : -1;
  const oddColor = { ...base };
  if (shiftType === 'h') {
    oddColor.h = (base.h + diff * shiftDir + 360) % 360;
  } else {
    oddColor.l = Math.min(85, Math.max(25, base.l + diff * shiftDir * 0.5));
  }

  const baseCSS = `hsl(${base.h}, ${base.s}%, ${base.l}%)`;
  const oddCSS = `hsl(${oddColor.h}, ${oddColor.s}%, ${oddColor.l}%)`;

  // Pick random position for the odd one
  const oddIndex = randInt(0, config.gridSize - 1);

  const content = document.getElementById('color-content');
  content.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = `color-grid color-grid-${currentDifficulty}`;

  for (let i = 0; i < config.gridSize; i++) {
    const cell = document.createElement('div');
    cell.className = 'color-cell';
    cell.style.backgroundColor = i === oddIndex ? oddCSS : baseCSS;
    cell.addEventListener('click', () => handlePick(i, oddIndex, cell, grid));
    grid.appendChild(cell);
  }

  content.appendChild(grid);
}

function handlePick(picked, correct, cellEl, grid) {
  if (!acceptingPick) return;
  const cells = grid.querySelectorAll('.color-cell');

  if (picked === correct) {
    acceptingPick = false;
    cells.forEach(c => { c.style.pointerEvents = 'none'; });
    cellEl.classList.add('found');
    showFeedback(getEncouragement(), 'success');
    queueTimeout(nextRound, 800);
  } else {
    wrongCount++;
    penaltySeconds += WRONG_PENALTY_SECONDS;
    updateStatus();
    cellEl.classList.add('wrong-pick');
    showFeedback(`${getRetryMessage()} +${WRONG_PENALTY_SECONDS}초`, 'error');
    queueTimeout(() => {
      cellEl.classList.remove('wrong-pick');
    }, 300);
  }
}

function updateStatus() {
  const status = document.getElementById('color-status');
  if (status) {
    const elapsed = getElapsedSeconds();
    status.innerHTML = `
      <span>문제: <strong>${round}/${totalRounds}</strong></span>
      <span class="timer-main">시간: <strong>${formatSeconds(elapsed)}</strong></span>
      <span>오답: <strong>${wrongCount}</strong></span>
    `;
  }
}

function showFeedback(msg, type) {
  showToast(msg, type, 800);
}

function onFinish() {
  stopTimer();
  const finalTime = getElapsedSeconds();
  const { currentBest, isBest } = recordTimedPlay('color-find', currentDifficulty, finalTime);
  track('game_complete', { game_id: 'color-find', difficulty: currentDifficulty, score: finalTime, total_plays: getTotalPlays() });

  showGameResultModal({
    gameId: 'color-find',
    gameTitle: '색깔 찾기',
    difficulty: currentDifficulty,
    thumbnail: '/thumbnails/color-find.svg',
    timeSeconds: finalTime,
    currentBest,
    isBest,
    details: [
      `오답 ${wrongCount}회`,
      `오답 패널티 +${penaltySeconds}초`,
    ],
    onReplay: () => {
      track('game_replay', { game_id: 'color-find', difficulty: currentDifficulty });
      const app = document.getElementById('app');
      app.innerHTML = '';
      render(app, currentDifficulty);
    },
    onExit: () => {
      track('game_exit', { game_id: 'color-find' });
      location.hash = '#/games';
    },
  });
}

function getElapsedSeconds() {
  if (!startTime) return penaltySeconds;
  const baseSeconds = Math.floor((Date.now() - startTime) / 1000);
  return baseSeconds + penaltySeconds;
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(updateStatus, 250);
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
