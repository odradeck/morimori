import { renderHeader } from '../components/header.js';
import { showModal } from '../components/modal.js';
import { getGameStats } from '../utils/state.js';
import { formatSeconds } from '../utils/helpers.js';
import { track } from '../utils/analytics.js';

const GAMES = [
  {
    id: 'card-match',
    name: '카드 짝 맞추기',
    desc: '뒤집힌 카드의 짝을 찾아보세요',
    icon: '🃏',
    color: 'var(--color-coral)',
    area: '기억력',
  },
  {
    id: 'number-sequence',
    name: '숫자 잇기',
    desc: '빈칸에 들어갈 숫자를 맞춰보세요',
    icon: '🔢',
    color: 'var(--color-sky)',
    area: '논리력',
  },
  {
    id: 'color-find',
    name: '색깔 찾기',
    desc: '다른 색깔 하나를 찾아보세요',
    icon: '🎨',
    color: 'var(--color-mint)',
    area: '주의력',
  },
  {
    id: 'math-challenge',
    name: '암산 챌린지',
    desc: '간단한 계산 문제를 풀어보세요',
    icon: '🧮',
    color: 'var(--color-orange)',
    area: '계산력',
  },
];

export function render(container) {
  renderHeader(container, '모리모리', undefined, { hideBack: true, center: true, compact: true });

  const list = document.createElement('div');
  list.className = 'game-list';

  GAMES.forEach(game => {
    const stats = getGameStats(game.id);
    const bestTimeNormal = stats.bestTimes?.normal;
    const bestTimeLabel = Number.isInteger(bestTimeNormal) ? `최고기록(보통): ${formatSeconds(bestTimeNormal)}` : '';
    const card = document.createElement('div');
    card.className = 'game-select-card';
    card.innerHTML = `
      <div class="game-icon" style="background: ${game.color}20;">
        <span>${game.icon}</span>
      </div>
      <div class="game-info">
        <div class="game-name">${game.name}</div>
        <div class="game-desc">${game.desc}</div>
        ${stats.plays > 0 ? `<div class="text-sm" style="margin-top:4px">${stats.plays}회 플레이</div>` : ''}
        ${bestTimeLabel ? `<div class="text-sm">${bestTimeLabel}</div>` : ''}
      </div>
      <div class="game-arrow">→</div>
    `;
    card.addEventListener('click', () => {
      track('game_select', { game_id: game.id, game_name: game.name });
      showDifficultyPicker(game);
    });
    list.appendChild(card);
  });

  container.appendChild(list);
}

export function cleanup() {}

function showDifficultyPicker(game) {
  showModal({
    icon: game.icon,
    title: game.name,
    message: '난이도를 선택해 주세요.',
    buttons: [
      {
        label: '쉬움',
        class: 'btn-secondary',
        action: () => startGame(game.id, 'easy'),
      },
      {
        label: '보통',
        class: 'btn-primary',
        action: () => startGame(game.id, 'normal'),
      },
      {
        label: '어려움',
        class: 'btn-secondary',
        action: () => startGame(game.id, 'hard'),
      },
    ],
  });
}

function startGame(gameId, difficulty) {
  track('difficulty_select', { game_id: gameId, difficulty });
  location.hash = `#/play/${gameId}/${difficulty}`;
}
