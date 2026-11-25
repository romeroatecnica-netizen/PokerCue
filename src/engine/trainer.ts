import {createRng, makeCard, nCr} from './cards';
import {runSimulation, SimulationResult} from './simulator';

export type TrainerTarget =
  | 'flush_draw'
  | 'oesd'
  | 'set_trips'
  | 'two_pair_top_pair'
  | 'discard_draw';

export type TrainerPhase = 'flop_to_river' | 'turn_to_river' | 'discard_1_3';

export type QuestionFocus = 'showdown_equity' | 'hit_target';

export interface TrainerConfig {
  target: TrainerTarget;
  players: number; // 2..9
  phase: TrainerPhase;
  potSize: number;
  callAmount: number;
  questionFocus: QuestionFocus;
  challengeSeed: number;
}

export interface TrainerScenario {
  config: TrainerConfig;
  mode: 'holdem' | 'discard';
  heroCards: number[];
  boardCards: number[];
  discardIndices: number[];
  deadCards: number[];
  exactOuts: number;
  unseenCardsCount: number;
  exactHitPct: number;
  ruleOf42Pct: number;
  potOddsPct: number;
  recommendedAction: 'call' | 'fold' | 'marginal';
  simulation: SimulationResult;
  answerMetricPct: number;
  scenarioLabelKey: string;
}

/**
 * Generates a deterministic, mathematically consistent training scenario
 * matching target hand, player count, street/discard phase, and pot odds.
 */
export function generateTrainerScenario(config: TrainerConfig): TrainerScenario {
  const effectivePhase: TrainerPhase =
    config.target === 'discard_draw' ? 'discard_1_3' : config.phase;
  const rng = createRng(
    config.challengeSeed * 7919 +
      config.players * 97 +
      config.target.length * 31 +
      (effectivePhase === 'turn_to_river' ? 17 : effectivePhase === 'discard_1_3' ? 29 : 7),
  );

  const pickSuit = (exclude?: number): number => {
    const s = Math.floor(rng() * 4);
    if (exclude !== undefined && s === exclude) return (s + 1) % 4;
    return s;
  };

  let heroCards: number[] = [];
  let boardCards: number[] = [];
  let discardIndices: number[] = [];
  let deadCards: number[] = [];
  let exactOuts = 0;
  let exactHitPct = 0;
  let ruleOf42Pct = 0;
  let mode: 'holdem' | 'discard' = 'holdem';
  let scenarioLabelKey = 'scenario_flush_draw';

  if (effectivePhase === 'discard_1_3' || config.target === 'discard_draw') {
    mode = 'discard';
    const variant = config.challengeSeed % 4;

    if (variant === 0) {
      // 4-Flush Draw, discard 1 off-suit card (9 outs in 47 unseen)
      const s = pickSuit();
      const sOff = pickSuit(s);
      const ranks = pickDistinctRanks(rng, 4, 2, 12);
      const offRank = pickDifferentRank(rng, ranks);
      heroCards = [
        makeCard(ranks[0], s),
        makeCard(ranks[1], s),
        makeCard(ranks[2], s),
        makeCard(ranks[3], s),
        makeCard(offRank, sOff),
      ];
      discardIndices = [4];
      deadCards = pickExtraDead(rng, heroCards, config.players <= 7 ? 2 : 0);
      const unseen = 52 - 5 - deadCards.length;
      const deadFlush = deadCards.filter((c) => Math.floor(c / 13) === s).length;
      exactOuts = 13 - 4 - deadFlush;
      exactHitPct = (exactOuts / unseen) * 100;
      ruleOf42Pct = exactOuts * 2;
      scenarioLabelKey = 'scenario_discard_flush';
    } else if (variant === 1) {
      // Open-Ended Straight Draw in 5-card hand, discard 1 (8 outs)
      const base = 4 + Math.floor(rng() * 5); // 6..10
      const s0 = pickSuit();
      const s1 = pickSuit(s0);
      const s2 = pickSuit(s1);
      const s3 = pickSuit(s0);
      const offRank = (base + 6) % 13;
      heroCards = [
        makeCard(base, s0),
        makeCard(base + 1, s1),
        makeCard(base + 2, s2),
        makeCard(base + 3, s3),
        makeCard(offRank, s1),
      ];
      discardIndices = [4];
      deadCards = pickExtraDead(rng, heroCards, config.players <= 7 ? 2 : 0);
      const unseen = 52 - 5 - deadCards.length;
      const deadLow = deadCards.filter((c) => c % 13 === base - 1).length;
      const deadHigh = deadCards.filter((c) => c % 13 === base + 4).length;
      exactOuts = 4 - deadLow + (4 - deadHigh);
      exactHitPct = (exactOuts / unseen) * 100;
      ruleOf42Pct = exactOuts * 2;
      scenarioLabelKey = 'scenario_discard_oesd';
    } else if (variant === 2) {
      // One Pair keeping 2, discarding 3 -> hit Trips+ (at least 1 matching rank or quads/FH)
      const pairRank = 6 + Math.floor(rng() * 7); // 8..A
      const kickers = pickDistinctRanks(rng, 3, 0, 12, [pairRank]);
      heroCards = [
        makeCard(pairRank, 0),
        makeCard(pairRank, 1),
        makeCard(kickers[0], 2),
        makeCard(kickers[1], 3),
        makeCard(kickers[2], 0),
      ];
      discardIndices = [2, 3, 4];
      deadCards = pickExtraDead(rng, heroCards, config.players <= 7 ? 1 : 0);
      const unseen = 52 - 5 - deadCards.length;
      const deadPair = deadCards.filter((c) => c % 13 === pairRank).length;
      const availPairCards = 2 - deadPair;
      // Probability of drawing >=1 of the remaining pair cards in 3 draws
      const missAll = nCr(unseen - availPairCards, 3) / nCr(unseen, 3);
      exactOuts = availPairCards;
      exactHitPct = (1 - missAll) * 100;
      ruleOf42Pct = availPairCards * 6;
      scenarioLabelKey = 'scenario_discard_pair3';
    } else {
      // Two Pair keeping 4, discarding 1 -> hit Full House (4 outs)
      const rA = 8 + Math.floor(rng() * 5); // T..A
      const rB = (rA - 3 + 13) % 13;
      const rK = pickDifferentRank(rng, [rA, rB]);
      heroCards = [
        makeCard(rA, 0),
        makeCard(rA, 2),
        makeCard(rB, 1),
        makeCard(rB, 3),
        makeCard(rK, 0),
      ];
      discardIndices = [4];
      deadCards = pickExtraDead(rng, heroCards, config.players <= 7 ? 2 : 0);
      const unseen = 52 - 5 - deadCards.length;
      const deadFH = deadCards.filter((c) => c % 13 === rA || c % 13 === rB).length;
      exactOuts = 4 - deadFH;
      exactHitPct = (exactOuts / unseen) * 100;
      ruleOf42Pct = exactOuts * 2;
      scenarioLabelKey = 'scenario_discard_twopair';
    }
  } else {
    mode = 'holdem';
    const isTurn = effectivePhase === 'turn_to_river';

    if (config.target === 'flush_draw') {
      const s = pickSuit();
      const sOff1 = pickSuit(s);
      const sOff2 = pickSuit(sOff1);
      const flushRanks = pickDistinctRanks(rng, 4, 2, 12);
      const offRanks = pickDistinctRanks(rng, isTurn ? 2 : 1, 0, 12, flushRanks);
      heroCards = [makeCard(flushRanks[0], s), makeCard(flushRanks[1], s)];
      boardCards = [
        makeCard(flushRanks[2], s),
        makeCard(flushRanks[3], s),
        makeCard(offRanks[0], sOff1),
      ];
      if (isTurn) boardCards.push(makeCard(offRanks[1], sOff2));
      scenarioLabelKey = 'scenario_flush_draw';
    } else if (config.target === 'oesd') {
      const low = 3 + Math.floor(rng() * 6); // 5..10
      const s0 = pickSuit();
      const s1 = pickSuit(s0);
      const s2 = pickSuit(s1);
      const s3 = pickSuit(s0);
      const off = (low + 6) % 13;
      const off2 = (low + 8) % 13;
      heroCards = [makeCard(low + 1, s0), makeCard(low + 2, s1)];
      boardCards = [makeCard(low, s2), makeCard(low + 3, s3), makeCard(off, s1)];
      if (isTurn) boardCards.push(makeCard(off2, s2));
      scenarioLabelKey = 'scenario_oesd';
    } else if (config.target === 'set_trips') {
      const pairRank = 4 + Math.floor(rng() * 8); // 6..K
      const boardRanks = pickDistinctRanks(rng, isTurn ? 4 : 3, 0, 12, [pairRank]);
      heroCards = [makeCard(pairRank, 0), makeCard(pairRank, 2)];
      boardCards = [
        makeCard(boardRanks[0], 1),
        makeCard(boardRanks[1], 3),
        makeCard(boardRanks[2], 0),
      ];
      if (isTurn) boardCards.push(makeCard(boardRanks[3], 2));
      scenarioLabelKey = 'scenario_set_trips';
    } else {
      // Two Pair / Top Pair (hero holds suited/offsuit broadways, paired top board, 5 outs to two pair/trips)
      const topRank = 10 + Math.floor(rng() * 3); // Q..A
      const kicker = 7 + Math.floor(rng() * 3); // 9..J
      const otherRanks = pickDistinctRanks(rng, isTurn ? 3 : 2, 0, 8, [topRank, kicker]);
      heroCards = [makeCard(topRank, 0), makeCard(kicker, 1)];
      boardCards = [
        makeCard(topRank, 2),
        makeCard(otherRanks[0], 3),
        makeCard(otherRanks[1], 1),
      ];
      if (isTurn) boardCards.push(makeCard(otherRanks[2], 0));
      scenarioLabelKey = 'scenario_two_pair_top_pair';
    }

    // Optional known dead card (e.g., 1 exposed card when seed is odd)
    if (config.challengeSeed % 3 === 1) {
      deadCards = pickExtraDead(rng, [...heroCards, ...boardCards], 1);
    }

    const unseen = 52 - heroCards.length - boardCards.length - deadCards.length;

    if (config.target === 'flush_draw') {
      const s = Math.floor(heroCards[0] / 13);
      const deadSameSuit = deadCards.filter((c) => Math.floor(c / 13) === s).length;
      exactOuts = 9 - deadSameSuit;
    } else if (config.target === 'oesd') {
      const ranks = [...heroCards, ...boardCards].map((c) => c % 13).sort((a, b) => a - b);
      // Find the 4 consecutive ranks
      let startConsec = ranks[0];
      for (let i = 0; i <= ranks.length - 4; i++) {
        if (ranks[i + 3] - ranks[i] === 3) {
          startConsec = ranks[i];
          break;
        }
      }
      const needLow = startConsec - 1;
      const needHigh = startConsec + 4;
      const deadNeed = deadCards.filter((c) => {
        const r = c % 13;
        return r === needLow || r === needHigh;
      }).length;
      exactOuts = 8 - deadNeed;
    } else if (config.target === 'set_trips') {
      const pRank = heroCards[0] % 13;
      const deadSet = deadCards.filter((c) => c % 13 === pRank).length;
      exactOuts = 2 - deadSet;
    } else {
      // Top pair improving to Two Pair or Trips: 3 kicker cards + 2 remaining top cards = 5 outs
      const r0 = heroCards[0] % 13;
      const r1 = heroCards[1] % 13;
      const deadImp = deadCards.filter((c) => c % 13 === r0 || c % 13 === r1).length;
      exactOuts = 5 - deadImp;
    }

    if (isTurn) {
      exactHitPct = (exactOuts / unseen) * 100;
      ruleOf42Pct = Math.min(100, exactOuts * 2);
    } else {
      const miss = ((unseen - exactOuts) / unseen) * ((unseen - 1 - exactOuts) / (unseen - 1));
      exactHitPct = (1 - miss) * 100;
      ruleOf42Pct = Math.min(100, exactOuts * 4);
    }
  }

  const simulation = runSimulation({
    mode,
    heroCards,
    boardCards,
    discardIndices,
    deadCards,
    players: config.players,
    iterations: 4000,
  });

  const potTotal = Math.max(1, config.potSize) + Math.max(0, config.callAmount);
  const potOddsPct = config.callAmount <= 0 ? 0 : (config.callAmount / potTotal) * 100;
  const answerMetricPct =
    config.questionFocus === 'hit_target' ? exactHitPct : simulation.equityPct;

  const diffFromPotOdds = simulation.equityPct - potOddsPct;
  const recommendedAction: 'call' | 'fold' | 'marginal' =
    Math.abs(diffFromPotOdds) <= 1.5
      ? 'marginal'
      : diffFromPotOdds > 1.5
        ? 'call'
        : 'fold';

  const unseenCardsCount =
    52 - heroCards.length - boardCards.length - deadCards.length;

  return {
    config: {...config, phase: effectivePhase},
    mode,
    heroCards,
    boardCards,
    discardIndices,
    deadCards,
    exactOuts,
    unseenCardsCount,
    exactHitPct,
    ruleOf42Pct,
    potOddsPct,
    recommendedAction,
    simulation,
    answerMetricPct,
    scenarioLabelKey,
  };
}

function pickDistinctRanks(
  rng: () => number,
  count: number,
  minRank: number,
  maxRank: number,
  exclude: number[] = [],
): number[] {
  const pool: number[] = [];
  for (let r = minRank; r <= maxRank; r++) {
    if (!exclude.includes(r)) pool.push(r);
  }
  const picked: number[] = [];
  while (picked.length < count && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

function pickDifferentRank(rng: () => number, exclude: number[]): number {
  const pool: number[] = [];
  for (let r = 0; r < 13; r++) {
    if (!exclude.includes(r)) pool.push(r);
  }
  return pool[Math.floor(rng() * pool.length)];
}

function pickExtraDead(rng: () => number, used: number[], count: number): number[] {
  if (count <= 0) return [];
  const usedSet = new Set(used);
  const avail: number[] = [];
  for (let c = 0; c < 52; c++) {
    if (!usedSet.has(c)) avail.push(c);
  }
  const out: number[] = [];
  for (let i = 0; i < count && avail.length > 0; i++) {
    const idx = Math.floor(rng() * avail.length);
    out.push(avail[idx]);
    avail.splice(idx, 1);
  }
  return out;
}
