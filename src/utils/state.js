const STORAGE_KEY = 'morimori_state';
const DEFAULT_LEVELS = { easy: 0, normal: 0, hard: 0 };
const DEFAULT_TIME_LEVELS = { easy: null, normal: null, hard: null };

function getDefaultState() {
  return {
    totalPlays: 0,
    games: {
      'card-match': { plays: 0, bestScores: { ...DEFAULT_LEVELS }, bestTimes: { ...DEFAULT_TIME_LEVELS } },
      'number-sequence': { plays: 0, bestScores: { ...DEFAULT_LEVELS }, bestTimes: { ...DEFAULT_TIME_LEVELS } },
      'color-find': { plays: 0, bestScores: { ...DEFAULT_LEVELS }, bestTimes: { ...DEFAULT_TIME_LEVELS } },
      'math-challenge': { plays: 0, bestScores: { ...DEFAULT_LEVELS }, bestTimes: { ...DEFAULT_TIME_LEVELS } },
      'word-chain': { plays: 0, bestScores: { ...DEFAULT_LEVELS }, bestTimes: { ...DEFAULT_TIME_LEVELS } },
    },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults to handle new fields
      const defaults = getDefaultState();
      const mergedGames = { ...defaults.games };
      Object.keys(mergedGames).forEach((gameId) => {
        const parsedGame = parsed.games?.[gameId] || {};
        mergedGames[gameId] = {
          ...mergedGames[gameId],
          ...parsedGame,
          bestScores: { ...DEFAULT_LEVELS, ...(parsedGame.bestScores || {}) },
          bestTimes: { ...DEFAULT_TIME_LEVELS, ...(parsedGame.bestTimes || {}) },
        };
      });
      return { ...defaults, ...parsed, games: mergedGames };
    }
  } catch { /* ignore */ }
  return getDefaultState();
}

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

let state = load();

export function getState() {
  return state;
}

export function getTotalPlays() {
  return state.totalPlays;
}

export function getGameStats(gameId) {
  return state.games[gameId] || { plays: 0, bestScores: { ...DEFAULT_LEVELS }, bestTimes: { ...DEFAULT_TIME_LEVELS } };
}

export function recordPlay(gameId, difficulty, score) {
  state.totalPlays++;
  if (!state.games[gameId]) {
    state.games[gameId] = { plays: 0, bestScores: { ...DEFAULT_LEVELS }, bestTimes: { ...DEFAULT_TIME_LEVELS } };
  }
  state.games[gameId].plays++;
  const best = state.games[gameId].bestScores[difficulty] || 0;
  if (score > best) {
    state.games[gameId].bestScores[difficulty] = score;
  }
  save(state);
}

export function recordTimedPlay(gameId, difficulty, seconds) {
  state.totalPlays++;
  if (!state.games[gameId]) {
    state.games[gameId] = { plays: 0, bestScores: { ...DEFAULT_LEVELS }, bestTimes: { ...DEFAULT_TIME_LEVELS } };
  }
  state.games[gameId].plays++;

  const currentBest = state.games[gameId].bestTimes[difficulty];
  const isBest = currentBest === null || seconds < currentBest;
  if (isBest) {
    state.games[gameId].bestTimes[difficulty] = seconds;
  }
  save(state);

  return { currentBest, isBest };
}
