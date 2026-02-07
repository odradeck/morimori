/** Shuffle an array in place (Fisher-Yates) */
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Random integer between min and max (inclusive) */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random item from an array */
export function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Encouragement messages */
const ENCOURAGEMENTS = [
  '잘하셨어요! 👏',
  '대단해요! ✨',
  '훌륭해요! 🌟',
  '멋져요! 💪',
  '정답이에요! 🎉',
  '최고예요! 🏆',
];

const RETRY_MESSAGES = [
  '아쉬워요, 다시 해볼까요? 😊',
  '괜찮아요, 한 번 더! 💪',
  '조금만 더 힘내봐요! 🌈',
  '다음엔 꼭 맞출 수 있어요! ⭐',
];

export function getEncouragement() {
  return randomPick(ENCOURAGEMENTS);
}

export function getRetryMessage() {
  return randomPick(RETRY_MESSAGES);
}

/** Delay helper */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
