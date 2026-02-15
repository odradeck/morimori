import { renderHeader } from '../components/header.js';
import { showGameResultModal } from '../components/game-result-modal.js';
import { showToast } from '../components/toast.js';
import { shuffle, randInt, getEncouragement, getRetryMessage, formatSeconds } from '../utils/helpers.js';
import { recordTimedPlay, getTotalPlays } from '../utils/state.js';
import { track } from '../utils/analytics.js';

const DIFFICULTY_CONFIG = {
  easy: { rounds: 5, maxStep: 5, ops: ['add'] },
  normal: { rounds: 7, maxStep: 10, ops: ['add', 'sub'] },
  hard: { rounds: 10, maxStep: 15, ops: ['add', 'sub', 'mul'] },
};

let currentDifficulty = 'easy';
let round = 0;
let totalRounds = 5;
let wrongCount = 0;
let penaltySeconds = 0;
let startTime = 0;
let timerInterval = null;
const WRONG_PENALTY_SECONDS = 5;
let activeRound = null;
let pendingTimeouts = [];

export function render(container, difficulty = 'easy') {
  cleanup();
  currentDifficulty = difficulty;
  round = 0;
  totalRounds = DIFFICULTY_CONFIG[difficulty].rounds;
  wrongCount = 0;
  penaltySeconds = 0;
  startTime = Date.now();
  activeRound = null;

  renderHeader(container, '숫자 잇기', '#/games');

  track('game_start', { game_id: 'number-sequence', difficulty: currentDifficulty });

  const status = document.createElement('div');
  status.className = 'game-status game-status-timer';
  status.id = 'seq-status';
  container.appendChild(status);

  const content = document.createElement('div');
  content.className = 'game-content';
  content.id = 'seq-content';
  container.appendChild(content);

  startTimer();
  nextRound();
}

function generateSequence() {
  const config = DIFFICULTY_CONFIG[currentDifficulty];
  const op = config.ops[Math.floor(Math.random() * config.ops.length)];

  let sequence = [];
  let answer;

  if (op === 'add') {
    const start = randInt(1, 20);
    const step = randInt(1, config.maxStep);
    const len = 5;
    sequence = Array.from({ length: len }, (_, i) => start + step * i);
  } else if (op === 'sub') {
    const step = randInt(1, config.maxStep);
    const start = randInt(step * 5, step * 5 + 30);
    const len = 5;
    sequence = Array.from({ length: len }, (_, i) => start - step * i);
  } else {
    const base = randInt(1, 5);
    const multiplier = randInt(2, 4);
    const len = 5;
    sequence = Array.from({ length: len }, (_, i) => base * Math.pow(multiplier, i));
  }

  // Pick a position to blank out (not first or last)
  const blankPos = randInt(1, sequence.length - 2);
  answer = sequence[blankPos];

  // Generate wrong answers
  const step = Math.abs(sequence[1] - sequence[0]) || 1;
  const wrongs = new Set();
  while (wrongs.size < 3) {
    const offset = randInt(1, step * 3) * (Math.random() > 0.5 ? 1 : -1);
    const wrong = answer + offset;
    if (wrong !== answer && wrong > 0) wrongs.add(wrong);
  }

  const options = shuffle([answer, ...wrongs]);
  return { sequence, blankPos, answer, options };
}

function nextRound() {
  round++;
  if (round > totalRounds) {
    onFinish();
    return;
  }

  const { sequence, blankPos, answer, options } = generateSequence();
  activeRound = { sequence, blankPos, answer, options };
  updateStatus();
  renderRound();
}

function renderRound() {
  if (!activeRound) return;
  const { sequence, blankPos, answer, options } = activeRound;

  const content = document.getElementById('seq-content');
  content.innerHTML = '';

  // Sequence display
  const seqDisplay = document.createElement('div');
  seqDisplay.className = 'sequence-display';
  sequence.forEach((num, i) => {
    if (i > 0) {
      const arrow = document.createElement('span');
      arrow.className = 'sequence-arrow';
      arrow.textContent = '→';
      seqDisplay.appendChild(arrow);
    }
    const numEl = document.createElement('span');
    numEl.className = `sequence-number ${i === blankPos ? 'sequence-blank' : ''}`;
    numEl.textContent = i === blankPos ? '?' : num;
    numEl.id = i === blankPos ? 'blank-slot' : '';
    seqDisplay.appendChild(numEl);
  });
  content.appendChild(seqDisplay);

  // Options
  const optionsEl = document.createElement('div');
  optionsEl.className = 'answer-options';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'answer-btn';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(opt, answer, optionsEl));
    optionsEl.appendChild(btn);
  });
  content.appendChild(optionsEl);
}

function handleAnswer(selected, answer, optionsEl) {
  const buttons = optionsEl.querySelectorAll('.answer-btn');
  if (selected === answer) {
    buttons.forEach(b => { b.disabled = true; });
    buttons.forEach(b => {
      if (parseInt(b.textContent) === answer) b.classList.add('correct');
    });
    const blank = document.getElementById('blank-slot');
    if (blank) {
      blank.textContent = answer;
      blank.classList.remove('sequence-blank');
      blank.classList.add('animate-pop');
    }
    showFeedback(getEncouragement(), 'success');
    queueTimeout(nextRound, 800);
  } else {
    wrongCount++;
    penaltySeconds += WRONG_PENALTY_SECONDS;
    updateStatus();
    buttons.forEach(b => {
      const value = parseInt(b.textContent, 10);
      if (value === selected) b.classList.add('wrong');
      b.disabled = true;
    });
    showFeedback(`${getRetryMessage()} +${WRONG_PENALTY_SECONDS}초`, 'error');
    queueTimeout(() => renderRound(), 650);
  }
}

function updateStatus() {
  const status = document.getElementById('seq-status');
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
  showToast(msg, type, 850);
}

function onFinish() {
  stopTimer();
  const finalTime = getElapsedSeconds();
  const { currentBest, isBest } = recordTimedPlay('number-sequence', currentDifficulty, finalTime);
  track('game_complete', { game_id: 'number-sequence', difficulty: currentDifficulty, score: finalTime, total_plays: getTotalPlays() });

  showGameResultModal({
    gameId: 'number-sequence',
    gameTitle: '숫자 잇기',
    difficulty: currentDifficulty,
    thumbnail: '/thumbnails/number-sequence.svg',
    timeSeconds: finalTime,
    currentBest,
    isBest,
    details: [
      `오답 ${wrongCount}회`,
      `오답 패널티 +${penaltySeconds}초`,
    ],
    onReplay: () => {
      track('game_replay', { game_id: 'number-sequence', difficulty: currentDifficulty });
      const app = document.getElementById('app');
      app.innerHTML = '';
      render(app, currentDifficulty);
    },
    onExit: () => {
      track('game_exit', { game_id: 'number-sequence' });
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
