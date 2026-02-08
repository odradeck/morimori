import { renderHeader } from '../components/header.js';
import { showModal } from '../components/modal.js';
import { shuffle, randInt, getEncouragement, getRetryMessage } from '../utils/helpers.js';
import { recordPlay, getTotalPlays } from '../utils/state.js';
import { track } from '../utils/analytics.js';

const DIFFICULTY_CONFIG = {
  easy: { rounds: 5, maxStep: 5, ops: ['add'] },
  normal: { rounds: 7, maxStep: 10, ops: ['add', 'sub'] },
  hard: { rounds: 10, maxStep: 15, ops: ['add', 'sub', 'mul'] },
};

let currentDifficulty = 'easy';
let round = 0;
let score = 0;
let totalRounds = 5;

export function render(container, difficulty = 'easy') {
  currentDifficulty = difficulty;
  round = 0;
  score = 0;
  totalRounds = DIFFICULTY_CONFIG[difficulty].rounds;

  renderHeader(container, '숫자 잇기', '#/games');

  track('game_start', { game_id: 'number-sequence', difficulty: currentDifficulty });

  const diffWrap = document.createElement('div');
  diffWrap.className = 'difficulty-selector';
  ['easy', 'normal', 'hard'].forEach(d => {
    const btn = document.createElement('button');
    btn.className = `difficulty-btn ${d === currentDifficulty ? 'active' : ''}`;
    btn.textContent = d === 'easy' ? '쉬움' : d === 'normal' ? '보통' : '어려움';
    btn.addEventListener('click', () => {
      track('difficulty_change', { game_id: 'number-sequence', difficulty: d });
      container.innerHTML = '';
      render(container, d);
    });
    diffWrap.appendChild(btn);
  });
  container.appendChild(diffWrap);

  const status = document.createElement('div');
  status.className = 'game-status';
  status.id = 'seq-status';
  container.appendChild(status);

  const content = document.createElement('div');
  content.className = 'game-content';
  content.id = 'seq-content';
  container.appendChild(content);

  const feedback = document.createElement('div');
  feedback.className = 'game-feedback';
  feedback.id = 'seq-feedback';
  container.appendChild(feedback);

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

  updateStatus();
  const { sequence, blankPos, answer, options } = generateSequence();

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
  buttons.forEach(b => { b.disabled = true; });

  if (selected === answer) {
    score++;
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
  } else {
    buttons.forEach(b => {
      if (parseInt(b.textContent) === selected) b.classList.add('wrong');
      if (parseInt(b.textContent) === answer) b.classList.add('correct');
    });
    showFeedback(getRetryMessage(), 'error');
  }

  setTimeout(nextRound, 1200);
}

function updateStatus() {
  const status = document.getElementById('seq-status');
  if (status) {
    status.innerHTML = `
      <span>문제: <strong>${round}/${totalRounds}</strong></span>
      <span>점수: <strong>${score}</strong></span>
    `;
  }
}

function showFeedback(msg, type) {
  const fb = document.getElementById('seq-feedback');
  if (!fb) return;
  fb.innerHTML = `<div class="feedback feedback-${type}">${msg}</div>`;
  setTimeout(() => { if (fb) fb.innerHTML = ''; }, 1000);
}

function onFinish() {
  const finalScore = Math.round((score / totalRounds) * 100);
  recordPlay('number-sequence', currentDifficulty, finalScore);
  track('game_complete', { game_id: 'number-sequence', difficulty: currentDifficulty, score: finalScore, total_plays: getTotalPlays() });

  showModal({
    icon: score === totalRounds ? '🏆' : '⭐',
    title: '게임 완료!',
    message: `${totalRounds}문제 중 ${score}문제 정답!\n점수: ${finalScore}점`,
    buttons: [
      {
        label: '다시 하기',
        class: 'btn-primary',
        action: () => {
          track('game_replay', { game_id: 'number-sequence', difficulty: currentDifficulty });
          const app = document.getElementById('app');
          app.innerHTML = '';
          render(app, currentDifficulty);
        },
      },
      {
        label: '다른 게임 하기',
        class: 'btn-secondary',
        action: () => {
          track('game_exit', { game_id: 'number-sequence' });
          location.hash = '#/games';
        },
      },
    ],
  });
}

export function cleanup() {}
