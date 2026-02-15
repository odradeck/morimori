import { renderHeader } from '../components/header.js';
import { showModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { randInt, getEncouragement, getRetryMessage, formatSeconds } from '../utils/helpers.js';
import { recordTimedPlay, getTotalPlays } from '../utils/state.js';
import { track } from '../utils/analytics.js';

const DIFFICULTY_CONFIG = {
  easy: { rounds: 5, maxNum: 20, ops: ['+'] },
  normal: { rounds: 7, maxNum: 50, ops: ['+', '-'] },
  hard: { rounds: 10, maxNum: 99, ops: ['+', '-', '×'] },
};

let currentDifficulty = 'easy';
let round = 0;
let totalRounds = 5;
let currentAnswer = 0;
let inputValue = '';
let wrongCount = 0;
let penaltySeconds = 0;
let startTime = 0;
let timerInterval = null;
let roundResolved = false;
let inputLocked = false;
const WRONG_PENALTY_SECONDS = 3;
let pendingTimeouts = [];

export function render(container, difficulty = 'easy') {
  cleanup();
  currentDifficulty = difficulty;
  round = 0;
  totalRounds = DIFFICULTY_CONFIG[difficulty].rounds;
  inputValue = '';
  wrongCount = 0;
  penaltySeconds = 0;
  startTime = Date.now();
  roundResolved = false;
  inputLocked = false;

  renderHeader(container, '암산 챌린지', '#/games');

  track('game_start', { game_id: 'math-challenge', difficulty: currentDifficulty });

  const status = document.createElement('div');
  status.className = 'game-status game-status-timer';
  status.id = 'math-status';
  container.appendChild(status);

  const content = document.createElement('div');
  content.className = 'game-content';
  content.id = 'math-content';
  container.appendChild(content);

  startTimer();
  nextRound();
}

function generateProblem() {
  const config = DIFFICULTY_CONFIG[currentDifficulty];
  const op = config.ops[randInt(0, config.ops.length - 1)];

  let a, b, answer;

  if (op === '+') {
    a = randInt(1, config.maxNum);
    b = randInt(1, config.maxNum);
    answer = a + b;
  } else if (op === '-') {
    a = randInt(1, config.maxNum);
    b = randInt(1, a); // ensure positive result
    answer = a - b;
  } else {
    // multiplication - keep numbers smaller
    a = randInt(2, Math.min(12, Math.floor(config.maxNum / 3)));
    b = randInt(2, Math.min(12, Math.floor(config.maxNum / 3)));
    answer = a * b;
  }

  return { a, b, op, answer };
}

function nextRound() {
  round++;
  inputValue = '';
  roundResolved = false;

  if (round > totalRounds) {
    onFinish();
    return;
  }

  updateStatus();
  const { a, b, op, answer } = generateProblem();
  currentAnswer = answer;

  const content = document.getElementById('math-content');
  content.innerHTML = '';

  // Problem display
  const problem = document.createElement('div');
  problem.className = 'math-problem';
  problem.innerHTML = `
    <div class="math-expression-inline">
      <span class="math-expression">${a} ${op} ${b}</span>
      <span class="math-equals">=</span>
      <span class="math-inline-input" id="math-display">&nbsp;</span>
    </div>
  `;
  content.appendChild(problem);

  // Numpad
  const numpad = document.createElement('div');
  numpad.className = 'numpad';

  for (let i = 1; i <= 9; i++) {
    numpad.appendChild(createNumpadBtn(String(i), () => appendDigit(String(i))));
  }
  numpad.appendChild(createNumpadBtn('지우기', clearInput, 'numpad-btn-delete'));
  numpad.appendChild(createNumpadBtn('0', () => appendDigit('0')));
  numpad.appendChild(createNumpadBtn('확인', submitAnswer, 'numpad-btn-submit'));

  content.appendChild(numpad);
}

function createNumpadBtn(label, onClick, extraClass = '') {
  const btn = document.createElement('button');
  btn.className = `numpad-btn ${extraClass}`;
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function appendDigit(d) {
  if (roundResolved || inputLocked) return;

  const maxDigits = String(currentAnswer).length;
  if (inputValue.length >= maxDigits) return;
  inputValue += d;
  updateDisplay();

  if (inputValue.length === maxDigits) {
    submitAnswer();
  }
}

function clearInput() {
  if (inputLocked) return;
  inputValue = inputValue.slice(0, -1);
  updateDisplay();
}

function updateDisplay() {
  const display = document.getElementById('math-display');
  if (display) {
    display.textContent = inputValue || '\u00A0';
  }
}

function submitAnswer() {
  if (!inputValue || roundResolved || inputLocked) return;

  const userAnswer = parseInt(inputValue, 10);

  if (userAnswer === currentAnswer) {
    roundResolved = true;
    const numpadBtns = document.querySelectorAll('.numpad-btn');
    numpadBtns.forEach(b => { b.disabled = true; });
    showFeedback(getEncouragement(), 'success');
    queueTimeout(nextRound, 700);
  } else {
    inputLocked = true;
    wrongCount++;
    penaltySeconds += WRONG_PENALTY_SECONDS;
    updateStatus();
    showFeedback(`${getRetryMessage()} +${WRONG_PENALTY_SECONDS}초`, 'error');
    queueTimeout(() => {
      inputValue = '';
      updateDisplay();
      inputLocked = false;
    }, 450);
  }
}

function updateStatus() {
  const status = document.getElementById('math-status');
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
  const { currentBest, isBest } = recordTimedPlay('math-challenge', currentDifficulty, finalTime);
  track('game_complete', { game_id: 'math-challenge', difficulty: currentDifficulty, score: finalTime, total_plays: getTotalPlays() });

  const pbMessage = isBest
    ? '신기록을 달성했어요!'
    : `개인 최고기록까지 ${formatSeconds(finalTime - currentBest)} 남았어요.`;

  showModal({
    icon: isBest ? '🏆' : '🧮',
    title: '게임 완료!',
    message: `최종 시간: ${formatSeconds(finalTime)}\n오답 ${wrongCount}회 (패널티 +${penaltySeconds}초)\n${pbMessage}`,
    buttons: [
      {
        label: '다시 하기',
        class: 'btn-primary',
        action: () => {
          track('game_replay', { game_id: 'math-challenge', difficulty: currentDifficulty });
          const app = document.getElementById('app');
          app.innerHTML = '';
          render(app, currentDifficulty);
        },
      },
      {
        label: '다른 게임 하기',
        class: 'btn-secondary',
        action: () => {
          track('game_exit', { game_id: 'math-challenge' });
          location.hash = '#/games';
        },
      },
    ],
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
