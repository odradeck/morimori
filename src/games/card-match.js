import { renderHeader } from '../components/header.js';
import { showModal } from '../components/modal.js';
import { shuffle, getEncouragement } from '../utils/helpers.js';
import { recordPlay, getTotalPlays } from '../utils/state.js';
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
let cleanupFn = null;

export function render(container, difficulty = 'easy') {
  currentDifficulty = difficulty;
  moves = 0;
  matched = [];
  flipped = [];
  locked = false;

  renderHeader(container, '카드 짝 맞추기', '#/games');

  track('game_start', { game_id: 'card-match', difficulty: currentDifficulty });

  // Difficulty selector
  const diffWrap = document.createElement('div');
  diffWrap.className = 'difficulty-selector';
  ['easy', 'normal', 'hard'].forEach(d => {
    const btn = document.createElement('button');
    btn.className = `difficulty-btn ${d === currentDifficulty ? 'active' : ''}`;
    btn.textContent = d === 'easy' ? '쉬움' : d === 'normal' ? '보통' : '어려움';
    btn.addEventListener('click', () => {
      track('difficulty_change', { game_id: 'card-match', difficulty: d });
      container.innerHTML = '';
      render(container, d);
    });
    diffWrap.appendChild(btn);
  });
  container.appendChild(diffWrap);

  // Status
  const status = document.createElement('div');
  status.className = 'game-status';
  status.innerHTML = `
    <span>시도: <strong id="move-count">0</strong></span>
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

  // Feedback area
  const feedback = document.createElement('div');
  feedback.className = 'game-feedback';
  feedback.id = 'card-feedback';
  container.appendChild(feedback);

  cleanupFn = null;
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
        setTimeout(() => onWin(), 500);
      }
    } else {
      // No match - flip back
      setTimeout(() => {
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
  const fb = document.getElementById('card-feedback');
  if (!fb) return;
  fb.innerHTML = `<div class="feedback feedback-${type}">${msg}</div>`;
  setTimeout(() => { if (fb) fb.innerHTML = ''; }, 1500);
}

function onWin() {
  const score = Math.max(100 - (moves - DIFFICULTY[currentDifficulty].pairs) * 5, 10);
  recordPlay('card-match', currentDifficulty, score);
  track('game_complete', { game_id: 'card-match', difficulty: currentDifficulty, score, total_plays: getTotalPlays() });

  showModal({
    icon: '🎉',
    title: '완료!',
    message: `${moves}번 만에 모든 짝을 찾았어요!\n점수: ${score}점`,
    buttons: [
      {
        label: '다시 하기',
        class: 'btn-primary',
        action: () => {
          track('game_replay', { game_id: 'card-match', difficulty: currentDifficulty });
          const app = document.getElementById('app');
          app.innerHTML = '';
          render(app, currentDifficulty);
        },
      },
      {
        label: '다른 게임 하기',
        class: 'btn-secondary',
        action: () => {
          track('game_exit', { game_id: 'card-match' });
          location.hash = '#/games';
        },
      },
    ],
  });
}

export function cleanup() {
  if (cleanupFn) cleanupFn();
}
