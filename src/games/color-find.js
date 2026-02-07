import { renderHeader } from '../components/header.js';
import { showModal } from '../components/modal.js';
import { randInt, getEncouragement, getRetryMessage } from '../utils/helpers.js';
import { recordPlay } from '../utils/state.js';

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
let score = 0;
let totalRounds = 5;

export function render(container, difficulty = 'easy') {
  currentDifficulty = difficulty;
  round = 0;
  score = 0;
  totalRounds = DIFFICULTY_CONFIG[difficulty].rounds;

  renderHeader(container, '색깔 찾기', '#/games');

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

  const feedback = document.createElement('div');
  feedback.className = 'game-feedback';
  feedback.id = 'color-feedback';
  container.appendChild(feedback);

  nextRound();
}

function nextRound() {
  round++;
  if (round > totalRounds) {
    onFinish();
    return;
  }

  updateStatus();
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
  // Disable further clicks
  const cells = grid.querySelectorAll('.color-cell');
  cells.forEach(c => { c.style.pointerEvents = 'none'; });

  if (picked === correct) {
    score++;
    cellEl.classList.add('found');
    showFeedback(getEncouragement(), 'success');
  } else {
    cellEl.classList.add('wrong-pick');
    cells[correct].classList.add('found');
    showFeedback(getRetryMessage(), 'error');
  }

  setTimeout(nextRound, 1000);
}

function updateStatus() {
  const status = document.getElementById('color-status');
  if (status) {
    status.innerHTML = `
      <span>문제: <strong>${round}/${totalRounds}</strong></span>
      <span>점수: <strong>${score}</strong></span>
    `;
  }
}

function showFeedback(msg, type) {
  const fb = document.getElementById('color-feedback');
  if (!fb) return;
  fb.innerHTML = `<div class="feedback feedback-${type}">${msg}</div>`;
  setTimeout(() => { if (fb) fb.innerHTML = ''; }, 800);
}

function onFinish() {
  const finalScore = Math.round((score / totalRounds) * 100);
  recordPlay('color-find', currentDifficulty, finalScore);

  showModal({
    icon: score === totalRounds ? '🏆' : '👁️',
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
