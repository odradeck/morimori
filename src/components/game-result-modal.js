import { showModal } from './modal.js';
import { showToast } from './toast.js';
import { formatSeconds, randomPick } from '../utils/helpers.js';
import { shareGameResult } from '../utils/share-result.js';

const BEST_MESSAGES = [
  '이 정도면 정말 어려운 단계도 충분히 해낼 수 있어요.',
  '기록이 아주 좋습니다. 지금 흐름이면 더 단축할 수 있어요.',
  '정말 잘하고 있어요. 이 기록은 자랑해도 됩니다.',
];

const CLOSE_MESSAGES = [
  '거의 다 왔어요. 한 번 더 하면 금방 갱신합니다.',
  '지금도 충분히 좋습니다. 다음 도전에서 더 빨라질 거예요.',
  '리듬이 잡히고 있어요. 한 번만 더 도전해볼까요?',
];

const RETRY_MESSAGES = [
  '처음엔 누구나 시간이 걸려요. 다시 하면 금방 익숙해집니다.',
  '지금도 잘하고 있습니다. 한 문제씩 차분히 하면 기록이 내려갑니다.',
  '실력은 쌓이고 있어요. 다음 판에서 훨씬 편해질 거예요.',
];

function getEncouragement({ isBest, deltaSeconds }) {
  if (isBest) return randomPick(BEST_MESSAGES);
  if (deltaSeconds <= 5) return randomPick(CLOSE_MESSAGES);
  return randomPick(RETRY_MESSAGES);
}

export function showGameResultModal({
  gameId,
  gameTitle,
  difficulty,
  thumbnail,
  timeSeconds,
  currentBest,
  isBest,
  details,
  onReplay,
  onExit,
}) {
  const deltaSeconds = Number.isInteger(currentBest) ? Math.max(0, timeSeconds - currentBest) : null;
  const encouragement = getEncouragement({ isBest, deltaSeconds: deltaSeconds ?? 999 });
  const recordLine = isBest
    ? '신기록입니다.'
    : `개인 최고기록까지 ${formatSeconds(deltaSeconds)} 남았어요.`;

  const message = [
    ...details,
    recordLine,
    '',
    encouragement,
  ].join('\n');

  showModal({
    thumbnail,
    title: formatSeconds(timeSeconds),
    message,
    buttons: [
      {
        label: '공유하기',
        class: 'btn-primary',
        closeOnClick: false,
        action: async () => {
          try {
            const result = await shareGameResult({
              gameId,
              gameTitle,
              difficulty,
              timeSeconds,
              thumbnail,
              details,
              encouragement,
            });
            if (result.fallback) {
              showToast('공유 기능이 없어 링크를 복사했어요.', 'info', 1200);
            }
          } catch (err) {
            if (err?.name !== 'AbortError') {
              showToast('공유를 열지 못했어요. 다시 시도해 주세요.', 'error', 1200);
            }
          }
        },
      },
      {
        label: '다시 하기',
        class: 'btn-secondary',
        action: onReplay,
      },
      {
        label: '다른 게임 하기',
        class: 'btn-secondary',
        action: onExit,
      },
    ],
  });
}
