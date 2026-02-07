const STORAGE_KEY = 'morimori_state';

function getDefaultState() {
  return {
    totalPlays: 0,
    games: {
      'card-match': { plays: 0, bestScores: { easy: 0, normal: 0, hard: 0 } },
      'number-sequence': { plays: 0, bestScores: { easy: 0, normal: 0, hard: 0 } },
      'color-find': { plays: 0, bestScores: { easy: 0, normal: 0, hard: 0 } },
      'math-challenge': { plays: 0, bestScores: { easy: 0, normal: 0, hard: 0 } },
      'word-chain': { plays: 0, bestScores: { easy: 0, normal: 0, hard: 0 } },
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
      return { ...defaults, ...parsed, games: { ...defaults.games, ...parsed.games } };
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
  return state.games[gameId] || { plays: 0, bestScores: { easy: 0, normal: 0, hard: 0 } };
}

export function recordPlay(gameId, difficulty, score) {
  state.totalPlays++;
  if (!state.games[gameId]) {
    state.games[gameId] = { plays: 0, bestScores: { easy: 0, normal: 0, hard: 0 } };
  }
  state.games[gameId].plays++;
  const best = state.games[gameId].bestScores[difficulty] || 0;
  if (score > best) {
    state.games[gameId].bestScores[difficulty] = score;
  }
  save(state);
}
