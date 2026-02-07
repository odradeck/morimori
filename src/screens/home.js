import { getTotalPlays } from '../utils/state.js';

export function render(container) {
  const plays = getTotalPlays();

  container.innerHTML = `
    <div class="home-screen">
      <div>
        <div class="home-logo">🧠</div>
        <h1 class="home-title">모리모리</h1>
        <p class="home-subtitle">매일매일 두뇌 훈련</p>
      </div>

      ${plays > 0 ? `
        <div class="home-stats">
          <div class="stat-item">
            <div class="stat-value">${plays}</div>
            <div class="stat-label">총 플레이</div>
          </div>
        </div>
      ` : ''}

      <button class="btn btn-primary btn-block" id="start-btn">
        시작하기
      </button>

      <p class="text-sm" style="margin-top: var(--spacing-md);">
        기억력 · 논리력 · 주의력 · 계산력 · 언어력
      </p>
    </div>
  `;

  container.querySelector('#start-btn').addEventListener('click', () => {
    location.hash = '#/games';
  });
}

export function cleanup() {}
