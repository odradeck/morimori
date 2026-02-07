import { renderHeader } from '../components/header.js';
import { showModal } from '../components/modal.js';
import { randInt, getEncouragement, getRetryMessage } from '../utils/helpers.js';
import { recordPlay } from '../utils/state.js';

const DIFFICULTY_CONFIG = {
  easy: { rounds: 5, maxNum: 20, ops: ['+'] },
  normal: { rounds: 7, maxNum: 50, ops: ['+', '-'] },
  hard: { rounds: 10, maxNum: 99, ops: ['+', '-', '×'] },
};

let currentDifficulty = 'easy';
let round = 0;
let score = 0;
let totalRounds = 5;
let currentAnswer = 0;
let inputValue = '';

export function render(container, difficulty = 'easy') {
  currentDifficulty = difficulty;
  round = 0;
  score = 0;
  totalRounds = DIFFICULTY_CONFIG[difficulty].rounds;
  inputValue = '';

  renderHeader(container, '암산 챌린지', '#/games');

  const diffWrap = document.createElement('div');
  diffWrap.className = 'difficulty-selector';
  ['easy', 'normal', 'hard'].forEach(d => {
    const btn = document.createElement('button');
    btn.className = `difficulty-btn ${d === currentDifficulty ? 'active' : ''}`;
    btn.textContent = d === 'easy' ? '쉬움' : d === 'normal' ? '보통' : '어려움';
    btn.addEventListener('click', () => {
      container.innerHTML = '';
      render(container, d);
    });
    diffWrap.appendChild(btn);
  });
  container.appendChild(diffWrap);

  const status = document.createElement('div');
  status.className = 'game-status';
  status.id = 'math-status';
  container.appendChild(status);

  const content = document.createElement('div');
  content.className = 'game-content';
  content.id = 'math-content';
  container.appendChild(content);

  const feedback = document.createElement('div');
  feedback.className = 'game-feedback';
  feedback.id = 'math-feedback';
  container.appendChild(feedback);

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
    <div class="math-expression">${a} ${op} ${b}</div>
    <div class="math-equals">= ?</div>
  `;
  content.appendChild(problem);

  // Input display
  const inputWrap = document.createElement('div');
  inputWrap.className = 'math-input-wrap';
  inputWrap.innerHTML = `<div class="math-input" id="math-display">&nbsp;</div>`;
  content.appendChild(inputWrap);

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
  if (inputValue.length >= 6) return;
  inputValue += d;
  updateDisplay();
}

function clearInput() {
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
  if (!inputValue) return;

  const userAnswer = parseInt(inputValue, 10);
  const numpadBtns = document.querySelectorAll('.numpad-btn');
  numpadBtns.forEach(b => { b.disabled = true; });

  if (userAnswer === currentAnswer) {
    score++;
    showFeedback(getEncouragement(), 'success');
  } else {
    showFeedback(`정답은 ${currentAnswer}이에요. ${getRetryMessage()}`, 'error');
  }

  setTimeout(nextRound, 1200);
}

function updateStatus() {
  const status = document.getElementById('math-status');
  if (status) {
    status.innerHTML = `
      <span>문제: <strong>${round}/${totalRounds}</strong></span>
      <span>점수: <strong>${score}</strong></span>
    `;
  }
}

function showFeedback(msg, type) {
  const fb = document.getElementById('math-feedback');
  if (!fb) return;
  fb.innerHTML = `<div class="feedback feedback-${type}">${msg}</div>`;
  setTimeout(() => { if (fb) fb.innerHTML = ''; }, 1000);
}

function onFinish() {
  const finalScore = Math.round((score / totalRounds) * 100);
  recordPlay('math-challenge', currentDifficulty, finalScore);

  showModal({
    icon: score === totalRounds ? '🏆' : '🧮',
    title: '게임 완료!',
    message: `${totalRounds}문제 중 ${score}문제 정답!\n점수: ${finalScore}점`,
    buttons: [
      {
        label: '다시 하기',
        class: 'btn-primary',
        action: () => {
          const app = document.getElementById('app');
          app.innerHTML = '';
          render(app, currentDifficulty);
        },
      },
      {
        label: '다른 게임 하기',
        class: 'btn-secondary',
        action: () => { location.hash = '#/games'; },
      },
    ],
  });
}

export function cleanup() {}
