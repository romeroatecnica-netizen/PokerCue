import {SimulatorMode} from '../engine/simulator';

export interface TrainerStats {
  attempts: number;
  accurateHits: number;
  totalAbsError: number;
  currentStreak: number;
  bestStreak: number;
}

export interface SavedSimulationRecord {
  id: string;
  timestamp: string;
  mode: SimulatorMode;
  heroCards: number[];
  boardCards: number[];
  discardIndices: number[];
  deadCards: number[];
  players: number;
  iterations: number;
  winPct: number;
  tiePct: number;
  lossPct: number;
  equityPct: number;
}

export interface PokerCuePersistedState {
  version: 1;
  trainerStats: TrainerStats;
  savedSimulations: SavedSimulationRecord[];
  notes: string;
}

const STORAGE_KEY = 'pokercue_state_v1';

export const DEFAULT_PERSISTED_STATE: PokerCuePersistedState = {
  version: 1,
  trainerStats: {
    attempts: 0,
    accurateHits: 0,
    totalAbsError: 0,
    currentStreak: 0,
    bestStreak: 0,
  },
  savedSimulations: [],
  notes: '',
};

export function loadPersistedState(): PokerCuePersistedState {
  if (typeof window === 'undefined') return DEFAULT_PERSISTED_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PERSISTED_STATE;
    const parsed = JSON.parse(raw);
    return sanitizePersistedState(parsed) ?? DEFAULT_PERSISTED_STATE;
  } catch {
    return DEFAULT_PERSISTED_STATE;
  }
}

export function savePersistedState(state: PokerCuePersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors
  }
}

export function sanitizePersistedState(raw: unknown): PokerCuePersistedState | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const stats = obj.trainerStats as Record<string, unknown> | undefined;
  const sims = Array.isArray(obj.savedSimulations) ? obj.savedSimulations : [];

  if (!stats || typeof stats !== 'object') return null;

  const num = (v: unknown, fallback = 0): number =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;

  const validSims: SavedSimulationRecord[] = [];
  for (const s of sims.slice(0, 30)) {
    if (!s || typeof s !== 'object') continue;
    const rec = s as Record<string, unknown>;
    if (
      typeof rec.id === 'string' &&
      (rec.mode === 'holdem' || rec.mode === 'discard') &&
      Array.isArray(rec.heroCards) &&
      Array.isArray(rec.boardCards) &&
      Array.isArray(rec.discardIndices) &&
      Array.isArray(rec.deadCards)
    ) {
      validSims.push({
        id: rec.id,
        timestamp: typeof rec.timestamp === 'string' ? rec.timestamp : new Date().toISOString(),
        mode: rec.mode,
        heroCards: rec.heroCards.filter((c): c is number => typeof c === 'number'),
        boardCards: rec.boardCards.filter((c): c is number => typeof c === 'number'),
        discardIndices: rec.discardIndices.filter((c): c is number => typeof c === 'number'),
        deadCards: rec.deadCards.filter((c): c is number => typeof c === 'number'),
        players: Math.min(9, Math.max(2, Math.round(num(rec.players, 2)))),
        iterations: Math.min(15000, Math.max(1000, Math.round(num(rec.iterations, 5000)))),
        winPct: num(rec.winPct),
        tiePct: num(rec.tiePct),
        lossPct: num(rec.lossPct),
        equityPct: num(rec.equityPct),
      });
    }
  }

  return {
    version: 1,
    trainerStats: {
      attempts: Math.round(num(stats.attempts)),
      accurateHits: Math.round(num(stats.accurateHits)),
      totalAbsError: num(stats.totalAbsError),
      currentStreak: Math.round(num(stats.currentStreak)),
      bestStreak: Math.round(num(stats.bestStreak)),
    },
    savedSimulations: validSims,
    notes: typeof obj.notes === 'string' ? obj.notes.slice(0, 8000) : '',
  };
}

export function exportStateAsJson(state: PokerCuePersistedState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `pokercue-session-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
