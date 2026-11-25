import {
  createDeckExcluding,
  createRng,
  evaluate5,
  evaluate7,
  evaluateCards,
  getHandCategory,
  HAND_CATEGORY_KEYS,
  HandCategory,
  HandCategoryKey,
  hashNumbers,
} from './cards';

export type SimulatorMode = 'holdem' | 'discard';

export interface SimulationInput {
  mode: SimulatorMode;
  heroCards: number[]; // 2 cards in holdem, 5 cards in discard
  boardCards: number[]; // 0, 3, 4, or 5 cards in holdem
  discardIndices: number[]; // 1..3 indices in heroCards (for discard mode)
  deadCards: number[]; // optional known discarded/exposed cards
  players: number; // 2..9
  iterations: number; // 2000..15000
}

export interface CategoryDistributionItem {
  category: HandCategory;
  key: HandCategoryKey;
  heroPct: number;
  opponentWinPct: number;
  heroCount: number;
}

export interface SimulationResult {
  valid: boolean;
  errorKey?: string;
  mode: SimulatorMode;
  players: number;
  iterations: number;
  winPct: number;
  tiePct: number;
  lossPct: number;
  equityPct: number;
  currentCategory: HandCategory | null;
  improveOuts: number | null;
  improveOutCards: number[];
  nextStreetImprovePct: number | null;
  twoStreetImprovePct: number | null;
  distribution: CategoryDistributionItem[];
  elapsedMs: number;
}

/**
 * Runs a fast, deterministic simulation in the browser.
 * Identical inputs always yield identical outputs.
 */
export function runSimulation(input: SimulationInput): SimulationResult {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const {mode, heroCards, boardCards, discardIndices, deadCards, players, iterations} = input;

  if (players < 2 || players > 9) {
    return invalidResult(input, 'error_invalid_players');
  }

  if (mode === 'holdem') {
    if (heroCards.length !== 2) {
      return invalidResult(input, 'error_need_two_hero');
    }
    if (![0, 3, 4, 5].includes(boardCards.length)) {
      return invalidResult(input, 'error_board_count');
    }
  } else {
    if (heroCards.length !== 5) {
      return invalidResult(input, 'error_need_five_hero');
    }
    if (discardIndices.length < 1 || discardIndices.length > 3) {
      return invalidResult(input, 'error_discard_count');
    }
  }

  const usedSet = new Set<number>([...heroCards, ...boardCards, ...deadCards]);
  const expectedUnique = heroCards.length + boardCards.length + deadCards.length;
  if (usedSet.size !== expectedUnique) {
    return invalidResult(input, 'error_duplicate_cards');
  }

  const remainingDeck = createDeckExcluding(usedSet);
  const cardsNeededPerIter =
    mode === 'holdem'
      ? (5 - boardCards.length) + (players - 1) * 2
      : discardIndices.length + (players - 1) * 5;

  if (remainingDeck.length < cardsNeededPerIter) {
    return invalidResult(input, 'error_not_enough_cards');
  }

  // Current made hand & exact next-card outs when on Flop or Turn (Hold'em) or kept cards (Discard)
  let currentCategory: HandCategory | null = null;
  let improveOuts: number | null = null;
  let improveOutCards: number[] = [];
  let nextStreetImprovePct: number | null = null;
  let twoStreetImprovePct: number | null = null;

  if (mode === 'holdem' && boardCards.length >= 3) {
    const baseScore = evaluateCards([...heroCards, ...boardCards]);
    currentCategory = getHandCategory(baseScore);

    if (boardCards.length === 3 || boardCards.length === 4) {
      const outs: number[] = [];
      for (let i = 0; i < remainingDeck.length; i++) {
        const card = remainingDeck[i];
        const nextScore = evaluateCards([...heroCards, ...boardCards, card]);
        if (getHandCategory(nextScore) > currentCategory) {
          outs.push(card);
        }
      }
      improveOuts = outs.length;
      improveOutCards = outs;
      nextStreetImprovePct = (outs.length / remainingDeck.length) * 100;
      if (boardCards.length === 3) {
        const missNext =
          ((remainingDeck.length - outs.length) / remainingDeck.length) *
          ((remainingDeck.length - 1 - outs.length) / (remainingDeck.length - 1));
        twoStreetImprovePct = (1 - missNext) * 100;
      }
    }
  } else if (mode === 'discard') {
    const baseScore = evaluate5(
      heroCards[0],
      heroCards[1],
      heroCards[2],
      heroCards[3],
      heroCards[4],
    );
    currentCategory = getHandCategory(baseScore);
  }

  const seed = hashNumbers([
    mode === 'holdem' ? 1 : 2,
    players,
    iterations,
    ...heroCards,
    ...boardCards,
    ...discardIndices,
    ...deadCards,
  ]);
  const rng = createRng(seed);

  const deckWork = remainingDeck.slice();
  const deckLen = deckWork.length;

  let wins = 0;
  let ties = 0;
  let losses = 0;
  let equitySum = 0;
  const heroCategoryCounts = new Int32Array(9);
  const oppWinCategoryCounts = new Int32Array(9);

  if (mode === 'holdem') {
    const missingBoard = 5 - boardCards.length;
    const b0 = boardCards[0] ?? -1;
    const b1 = boardCards[1] ?? -1;
    const b2 = boardCards[2] ?? -1;
    const b3 = boardCards[3] ?? -1;
    const b4 = boardCards[4] ?? -1;
    const h0 = heroCards[0];
    const h1 = heroCards[1];

    for (let iter = 0; iter < iterations; iter++) {
      // Partial Fisher-Yates for cardsNeededPerIter
      for (let k = 0; k < cardsNeededPerIter; k++) {
        const j = k + ((rng() * (deckLen - k)) | 0);
        const tmp = deckWork[k];
        deckWork[k] = deckWork[j];
        deckWork[j] = tmp;
      }

      let idx = 0;
      const r0 = b0 !== -1 ? b0 : deckWork[idx++];
      const r1 = b1 !== -1 ? b1 : deckWork[idx++];
      const r2 = b2 !== -1 ? b2 : deckWork[idx++];
      const r3 = b3 !== -1 ? b3 : deckWork[idx++];
      const r4 = b4 !== -1 ? b4 : deckWork[idx++];
      void missingBoard;

      const heroScore = evaluate7(h0, h1, r0, r1, r2, r3, r4);
      heroCategoryCounts[getHandCategory(heroScore)]++;

      let bestOppScore = -1;
      let tiedWithHero = 0;
      let heroBeatAll = true;

      for (let p = 1; p < players; p++) {
        const o0 = deckWork[idx++];
        const o1 = deckWork[idx++];
        const oppScore = evaluate7(o0, o1, r0, r1, r2, r3, r4);
        if (oppScore > bestOppScore) {
          bestOppScore = oppScore;
        }
        if (oppScore > heroScore) {
          heroBeatAll = false;
        } else if (oppScore === heroScore) {
          tiedWithHero++;
        }
      }

      if (heroBeatAll && tiedWithHero === 0) {
        wins++;
        equitySum += 1;
      } else if (heroBeatAll && tiedWithHero > 0) {
        ties++;
        equitySum += 1 / (tiedWithHero + 1);
      } else {
        losses++;
        oppWinCategoryCounts[getHandCategory(bestOppScore)]++;
      }
    }
  } else {
    // Discard / Draw mode (5-card hands)
    const discardSet = new Set(discardIndices);
    const keptCards = heroCards.filter((_, i) => !discardSet.has(i));
    const drawCount = discardIndices.length;

    for (let iter = 0; iter < iterations; iter++) {
      for (let k = 0; k < cardsNeededPerIter; k++) {
        const j = k + ((rng() * (deckLen - k)) | 0);
        const tmp = deckWork[k];
        deckWork[k] = deckWork[j];
        deckWork[j] = tmp;
      }

      let idx = 0;
      const hc = [
        keptCards[0] ?? deckWork[idx++],
        keptCards[1] ?? deckWork[idx++],
        keptCards[2] ?? deckWork[idx++],
        keptCards[3] ?? deckWork[idx++],
        keptCards[4] ?? deckWork[idx++],
      ];
      // Ensure exactly `drawCount` cards drawn
      void drawCount;

      const heroScore = evaluate5(hc[0], hc[1], hc[2], hc[3], hc[4]);
      heroCategoryCounts[getHandCategory(heroScore)]++;

      let bestOppScore = -1;
      let tiedWithHero = 0;
      let heroBeatAll = true;

      for (let p = 1; p < players; p++) {
        const oppScore = evaluate5(
          deckWork[idx++],
          deckWork[idx++],
          deckWork[idx++],
          deckWork[idx++],
          deckWork[idx++],
        );
        if (oppScore > bestOppScore) bestOppScore = oppScore;
        if (oppScore > heroScore) {
          heroBeatAll = false;
        } else if (oppScore === heroScore) {
          tiedWithHero++;
        }
      }

      if (heroBeatAll && tiedWithHero === 0) {
        wins++;
        equitySum += 1;
      } else if (heroBeatAll && tiedWithHero > 0) {
        ties++;
        equitySum += 1 / (tiedWithHero + 1);
      } else {
        losses++;
        oppWinCategoryCounts[getHandCategory(bestOppScore)]++;
      }
    }
  }

  const distribution: CategoryDistributionItem[] = HAND_CATEGORY_KEYS.map((key, idx) => ({
    category: idx as HandCategory,
    key,
    heroPct: (heroCategoryCounts[idx] / iterations) * 100,
    opponentWinPct: (oppWinCategoryCounts[idx] / iterations) * 100,
    heroCount: heroCategoryCounts[idx],
  }));

  const elapsedMs = Math.max(
    1,
    Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start),
  );

  return {
    valid: true,
    mode,
    players,
    iterations,
    winPct: (wins / iterations) * 100,
    tiePct: (ties / iterations) * 100,
    lossPct: (losses / iterations) * 100,
    equityPct: (equitySum / iterations) * 100,
    currentCategory,
    improveOuts,
    improveOutCards,
    nextStreetImprovePct,
    twoStreetImprovePct,
    distribution,
    elapsedMs,
  };
}

function invalidResult(input: SimulationInput, errorKey: string): SimulationResult {
  return {
    valid: false,
    errorKey,
    mode: input.mode,
    players: input.players,
    iterations: input.iterations,
    winPct: 0,
    tiePct: 0,
    lossPct: 0,
    equityPct: 0,
    currentCategory: null,
    improveOuts: null,
    improveOutCards: [],
    nextStreetImprovePct: null,
    twoStreetImprovePct: null,
    distribution: HAND_CATEGORY_KEYS.map((key, idx) => ({
      category: idx as HandCategory,
      key,
      heroPct: 0,
      opponentWinPct: 0,
      heroCount: 0,
    })),
    elapsedMs: 0,
  };
}
