import { renderHeader } from '../components/header.js';
import { showModal } from '../components/modal.js';
import { randomPick } from '../utils/helpers.js';
import { recordPlay, getTotalPlays } from '../utils/state.js';
import { track } from '../utils/analytics.js';

// Korean word dictionary for word chain game
// Organized by starting character (초성 + 중성 + 종성 → 첫 글자)
const WORDS = {
  '가': ['가방', '가수', '가을', '가족', '가게', '가구', '가슴', '가위', '가지'],
  '나': ['나무', '나비', '나라', '나이', '나물', '나침반'],
  '다': ['다리', '다람쥐', '다이아몬드', '다음'],
  '라': ['라면', '라디오', '라일락'],
  '마': ['마음', '마을', '마차', '마루', '마늘', '마법'],
  '바': ['바다', '바람', '바나나', '바위', '바지', '바구니'],
  '사': ['사과', '사람', '사자', '사슴', '사탕', '사진', '사다리'],
  '아': ['아기', '아침', '아버지', '아이', '아파트'],
  '자': ['자동차', '자전거', '자리', '자두', '자석'],
  '차': ['차가운', '차례'],
  '카': ['카메라', '카드'],
  '타': ['타조', '타이어'],
  '파': ['파도', '파란', '파리'],
  '하': ['하늘', '하마', '하루', '하나'],
  '고': ['고양이', '고래', '고구마', '고리', '고무'],
  '노': ['노래', '노을', '노트'],
  '도': ['도서관', '도시', '도마', '도토리'],
  '로': ['로봇', '로켓'],
  '모': ['모자', '모래', '모기', '모형'],
  '보': ['보물', '보석', '보리'],
  '소': ['소나무', '소리', '소금', '소방차'],
  '오': ['오리', '오렌지', '오이', '오징어'],
  '조': ['조개', '조카'],
  '토': ['토끼', '토마토'],
  '포': ['포도', '포크'],
  '호': ['호랑이', '호수', '호두'],
  '구': ['구름', '구슬', '구두'],
  '두': ['두부', '두꺼비'],
  '무': ['무지개', '무릎'],
  '부': ['부엌', '부채', '부모'],
  '수': ['수박', '수건', '수영'],
  '우': ['우산', '우유', '우체국', '우주'],
  '주': ['주사위', '주머니', '주전자'],
  '추': ['추석', '추위'],
  '후': ['후추', '후회'],
  '기': ['기차', '기린', '기타'],
  '리': ['리본'],
  '미': ['미소', '미역'],
  '비': ['비행기', '비누', '비둘기'],
  '시': ['시계', '시장', '시소'],
  '이': ['이불', '이슬'],
  '피': ['피아노', '피자'],
  '개': ['개나리', '개미'],
  '새': ['새우'],
  '배': ['배추', '배꼽'],
  '해': ['해바라기', '해적'],
  '래': ['래프팅'],
  '대': ['대나무', '대문'],
  '매': ['매미', '매듭'],
  '세': ['세탁기', '세계'],
  '게': ['게임'],
  '네': ['네모'],
  '레': ['레몬', '레이저'],
  '베': ['베개'],
  '물': ['물고기', '물감'],
  '돌': ['돌고래'],
  '불': ['불꽃'],
  '눈': ['눈사람'],
  '산': ['산타', '산호'],
  '달': ['달팽이', '달력'],
  '말': ['말벌'],
  '발': ['발자국'],
  '장': ['장갑', '장미'],
  '강': ['강아지'],
  '공': ['공룡', '공원'],
  '곰': ['곰팡이'],
  '꽃': ['꽃게'],
  '별': ['별자리'],
  '선': ['선물', '선인장'],
  '연': ['연필', '연꽃'],
  '전': ['전화', '전봇대'],
  '원': ['원숭이'],
};

// Build reverse lookup: last char -> words starting with that char
const ALL_WORDS = [];
for (const [, words] of Object.entries(WORDS)) {
  ALL_WORDS.push(...words);
}

function getLastChar(word) {
  return word[word.length - 1];
}

function findWordStartingWith(char, usedWords) {
  const candidates = WORDS[char];
  if (!candidates) return null;
  const available = candidates.filter(w => !usedWords.has(w));
  return available.length > 0 ? randomPick(available) : null;
}

const DIFFICULTY_CONFIG = {
  easy: { hintEnabled: true, maxTurns: 5 },
  normal: { hintEnabled: true, maxTurns: 8 },
  hard: { hintEnabled: false, maxTurns: 12 },
};

let currentDifficulty = 'easy';
let usedWords = new Set();
let history = [];
let currentChar = '';
let turnCount = 0;
let maxTurns = 5;

export function render(container, difficulty = 'easy') {
  currentDifficulty = difficulty;
  usedWords = new Set();
  history = [];
  turnCount = 0;
  maxTurns = DIFFICULTY_CONFIG[difficulty].maxTurns;

  renderHeader(container, '끝말잇기', '#/games');

  track('game_start', { game_id: 'word-chain', difficulty: currentDifficulty });

  const diffWrap = document.createElement('div');
  diffWrap.className = 'difficulty-selector';
  ['easy', 'normal', 'hard'].forEach(d => {
    const btn = document.createElement('button');
    btn.className = `difficulty-btn ${d === currentDifficulty ? 'active' : ''}`;
    btn.textContent = d === 'easy' ? '쉬움' : d === 'normal' ? '보통' : '어려움';
    btn.addEventListener('click', () => {
      track('difficulty_change', { game_id: 'word-chain', difficulty: d });
      container.innerHTML = '';
      render(container, d);
    });
    diffWrap.appendChild(btn);
  });
  container.appendChild(diffWrap);

  const status = document.createElement('div');
  status.className = 'game-status';
  status.id = 'word-status';
  container.appendChild(status);

  // Word chain area
  const area = document.createElement('div');
  area.className = 'word-chain-area';

  const wordHistory = document.createElement('div');
  wordHistory.className = 'word-history';
  wordHistory.id = 'word-history';
  area.appendChild(wordHistory);

  const hint = document.createElement('div');
  hint.className = 'word-hint';
  hint.id = 'word-hint';
  area.appendChild(hint);

  const inputArea = document.createElement('div');
  inputArea.className = 'word-input-area';
  inputArea.innerHTML = `
    <input type="text" class="word-input" id="word-input" placeholder="단어를 입력하세요" autocomplete="off" />
    <button class="btn btn-primary" id="word-submit">전송</button>
  `;
  area.appendChild(inputArea);

  container.appendChild(area);

  const feedback = document.createElement('div');
  feedback.className = 'game-feedback';
  feedback.id = 'word-feedback';
  container.appendChild(feedback);

  // Event listeners
  document.getElementById('word-submit').addEventListener('click', handleSubmit);
  document.getElementById('word-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSubmit();
  });

  // Computer goes first
  computerTurn();
  updateStatus();
}

function computerTurn() {
  let word;
  if (history.length === 0) {
    // First word - pick a random starting word
    const starters = ALL_WORDS.filter(w => !usedWords.has(w));
    word = randomPick(starters);
  } else {
    word = findWordStartingWith(currentChar, usedWords);
  }

  if (!word) {
    // Computer can't find a word - player wins!
    onPlayerWin();
    return;
  }

  usedWords.add(word);
  history.push({ word, who: 'computer' });
  currentChar = getLastChar(word);
  addBubble(word, 'computer');
  updateHint();
}

function handleSubmit() {
  const input = document.getElementById('word-input');
  const word = input.value.trim();
  input.value = '';

  if (!word) return;

  // Validate
  if (word.length < 2) {
    showFeedback('두 글자 이상 입력해주세요!', 'error');
    return;
  }

  if (word[0] !== currentChar) {
    showFeedback(`"${currentChar}"(으)로 시작하는 단어를 입력해주세요!`, 'error');
    return;
  }

  if (usedWords.has(word)) {
    showFeedback('이미 사용한 단어예요!', 'error');
    return;
  }

  // Accept the word (in a real game we'd validate against a dictionary,
  // but for simplicity we accept all Korean words)
  usedWords.add(word);
  history.push({ word, who: 'user' });
  currentChar = getLastChar(word);
  turnCount++;
  addBubble(word, 'user');
  updateStatus();

  if (turnCount >= maxTurns) {
    onComplete();
    return;
  }

  // Computer responds after a short delay
  setTimeout(() => {
    computerTurn();
    updateStatus();

    // Focus back on input
    const inputEl = document.getElementById('word-input');
    if (inputEl) inputEl.focus();
  }, 600);
}

function addBubble(word, who) {
  const historyEl = document.getElementById('word-history');
  if (!historyEl) return;

  const row = document.createElement('div');
  row.className = `word-row word-row-${who}`;

  const bubble = document.createElement('span');
  bubble.className = `word-bubble word-bubble-${who}`;
  bubble.textContent = word;

  row.appendChild(bubble);
  historyEl.appendChild(row);
  historyEl.scrollTop = historyEl.scrollHeight;
}

function updateHint() {
  const hint = document.getElementById('word-hint');
  if (!hint) return;
  const config = DIFFICULTY_CONFIG[currentDifficulty];
  if (config.hintEnabled) {
    hint.textContent = `"${currentChar}"(으)로 시작하는 단어를 입력하세요`;
  } else {
    hint.textContent = `다음 글자: "${currentChar}"`;
  }
}

function updateStatus() {
  const status = document.getElementById('word-status');
  if (status) {
    status.innerHTML = `
      <span>턴: <strong>${turnCount}/${maxTurns}</strong></span>
      <span>사용 단어: <strong>${usedWords.size}</strong></span>
    `;
  }
}

function showFeedback(msg, type) {
  const fb = document.getElementById('word-feedback');
  if (!fb) return;
  fb.innerHTML = `<div class="feedback feedback-${type}">${msg}</div>`;
  setTimeout(() => { if (fb) fb.innerHTML = ''; }, 1500);
}

function onPlayerWin() {
  const finalScore = 100;
  recordPlay('word-chain', currentDifficulty, finalScore);
  track('game_complete', { game_id: 'word-chain', difficulty: currentDifficulty, score: finalScore, total_plays: getTotalPlays() });

  showModal({
    icon: '🏆',
    title: '승리!',
    message: `컴퓨터가 단어를 찾지 못했어요!\n${turnCount}턴 만에 이겼습니다!`,
    buttons: [
      {
        label: '다시 하기',
        class: 'btn-primary',
        action: () => {
          track('game_replay', { game_id: 'word-chain', difficulty: currentDifficulty });
          const app = document.getElementById('app');
          app.innerHTML = '';
          render(app, currentDifficulty);
        },
      },
      {
        label: '다른 게임 하기',
        class: 'btn-secondary',
        action: () => {
          track('game_exit', { game_id: 'word-chain' });
          location.hash = '#/games';
        },
      },
    ],
  });
}

function onComplete() {
  const finalScore = Math.round((turnCount / maxTurns) * 100);
  recordPlay('word-chain', currentDifficulty, finalScore);
  track('game_complete', { game_id: 'word-chain', difficulty: currentDifficulty, score: finalScore, total_plays: getTotalPlays() });

  showModal({
    icon: '⭐',
    title: '게임 완료!',
    message: `${maxTurns}턴을 모두 완료했어요!\n총 ${usedWords.size}개 단어를 사용했습니다.`,
    buttons: [
      {
        label: '다시 하기',
        class: 'btn-primary',
        action: () => {
          track('game_replay', { game_id: 'word-chain', difficulty: currentDifficulty });
          const app = document.getElementById('app');
          app.innerHTML = '';
          render(app, currentDifficulty);
        },
      },
      {
        label: '다른 게임 하기',
        class: 'btn-secondary',
        action: () => {
          track('game_exit', { game_id: 'word-chain' });
          location.hash = '#/games';
        },
      },
    ],
  });
}

export function cleanup() {}
