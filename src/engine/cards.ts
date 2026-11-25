export type SuitIndex = 0 | 1 | 2 | 3; // 0: Spades, 1: Hearts, 2: Diamonds, 3: Clubs
export type RankIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12; // 0: 2 .. 12: A

export const RANK_CHARS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
export const SUIT_CHARS = ['s', 'h', 'd', 'c'] as const;
export const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'] as const;

export enum HandCategory {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
}

export const HAND_CATEGORY_KEYS = [
  'high_card',
  'one_pair',
  'two_pair',
  'three_of_a_kind',
  'straight',
  'flush',
  'full_house',
  'four_of_a_kind',
  'straight_flush',
] as const;

export type HandCategoryKey = (typeof HAND_CATEGORY_KEYS)[number];

export function getRank(card: number): number {
  return card % 13;
}

export function getSuit(card: number): number {
  return Math.floor(card / 13);
}

export function makeCard(rank: number, suit: number): number {
  return suit * 13 + rank;
}

export function formatCard(card: number): string {
  return `${RANK_CHARS[getRank(card)]}${SUIT_CHARS[getSuit(card)]}`;
}

export function formatCardPretty(card: number): string {
  return `${RANK_CHARS[getRank(card)]}${SUIT_SYMBOLS[getSuit(card)]}`;
}

export function parseCard(code: string): number | null {
  const trimmed = code.trim();
  if (trimmed.length !== 2) return null;
  const r = RANK_CHARS.indexOf(trimmed[0].toUpperCase() as (typeof RANK_CHARS)[number]);
  const s = SUIT_CHARS.indexOf(trimmed[1].toLowerCase() as (typeof SUIT_CHARS)[number]);
  if (r === -1 || s === -1) return null;
  return makeCard(r, s);
}

export function createDeckExcluding(excluded: Iterable<number>): number[] {
  const blocked = new Uint8Array(52);
  for (const c of excluded) {
    if (c >= 0 && c < 52) blocked[c] = 1;
  }
  const deck: number[] = [];
  for (let i = 0; i < 52; i++) {
    if (!blocked[i]) deck.push(i);
  }
  return deck;
}

/**
 * Mulberry32 deterministic PRNG
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashNumbers(values: number[]): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < values.length; i++) {
    h ^= values[i] & 0xff;
    h = Math.imul(h, 16777619) >>> 0;
    h ^= (values[i] >>> 8) & 0xff;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Exact combinatorial nCr
 */
export function nCr(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  if (r === 0 || r === n) return 1;
  const k = Math.min(r, n - r);
  let res = 1;
  for (let i = 1; i <= k; i++) {
    res = (res * (n - k + i)) / i;
  }
  return Math.round(res);
}

// Lookup / scratch arrays reused carefully inside tight evaluation loops
const RANK_COUNTS = new Int32Array(13);

/**
 * Evaluates a 5-card poker hand into a lexicographically sortable 24-bit integer:
 * (category << 20) | (r0 << 16) | (r1 << 12) | (r2 << 8) | (r3 << 4) | r4
 */
export function evaluate5(c0: number, c1: number, c2: number, c3: number, c4: number): number {
  const s0 = (c0 / 13) | 0;
  const s1 = (c1 / 13) | 0;
  const s2 = (c2 / 13) | 0;
  const s3 = (c3 / 13) | 0;
  const s4 = (c4 / 13) | 0;
  const isFlush = s0 === s1 && s1 === s2 && s2 === s3 && s3 === s4;

  const r0 = c0 % 13;
  const r1 = c1 % 13;
  const r2 = c2 % 13;
  const r3 = c3 % 13;
  const r4 = c4 % 13;

  const mask = (1 << r0) | (1 << r1) | (1 << r2) | (1 << r3) | (1 << r4);

  // Check straight if all 5 ranks are distinct
  // Note: popcount via mask check — if 5 distinct bits, check wheel or consecutive
  let straightHigh = -1;
  if (mask === 4111) {
    // A-2-3-4-5 wheel (bits 12, 3, 2, 1, 0)
    straightHigh = 3;
  } else {
    const lsb = mask & -mask;
    if (mask === lsb * 31) {
      // 5 consecutive bits set -> find MSB
      straightHigh = 31 - Math.clz32(mask);
    }
  }

  if (straightHigh !== -1) {
    if (isFlush) {
      return (HandCategory.StraightFlush << 20) | (straightHigh << 16);
    }
    return (HandCategory.Straight << 20) | (straightHigh << 16);
  }

  if (isFlush) {
    // Sort 5 distinct ranks descending from bitmask
    let score = HandCategory.Flush << 20;
    let shift = 16;
    for (let r = 12; r >= 0; r--) {
      if (mask & (1 << r)) {
        score |= r << shift;
        shift -= 4;
      }
    }
    return score;
  }

  RANK_COUNTS.fill(0);
  RANK_COUNTS[r0]++;
  RANK_COUNTS[r1]++;
  RANK_COUNTS[r2]++;
  RANK_COUNTS[r3]++;
  RANK_COUNTS[r4]++;

  let quad = -1;
  let trip = -1;
  let pairHigh = -1;
  let pairLow = -1;
  let k0 = -1;
  let k1 = -1;
  let k2 = -1;

  for (let r = 12; r >= 0; r--) {
    const cnt = RANK_COUNTS[r];
    if (cnt === 4) {
      quad = r;
    } else if (cnt === 3) {
      trip = r;
    } else if (cnt === 2) {
      if (pairHigh === -1) pairHigh = r;
      else pairLow = r;
    } else if (cnt === 1) {
      if (k0 === -1) k0 = r;
      else if (k1 === -1) k1 = r;
      else k2 = r;
    }
  }

  if (quad !== -1) {
    return (HandCategory.FourOfAKind << 20) | (quad << 16) | (k0 << 12);
  }
  if (trip !== -1 && pairHigh !== -1) {
    return (HandCategory.FullHouse << 20) | (trip << 16) | (pairHigh << 12);
  }
  if (trip !== -1) {
    return (HandCategory.ThreeOfAKind << 20) | (trip << 16) | (k0 << 12) | (k1 << 8);
  }
  if (pairLow !== -1) {
    return (HandCategory.TwoPair << 20) | (pairHigh << 16) | (pairLow << 12) | (k0 << 8);
  }
  if (pairHigh !== -1) {
    return (
      (HandCategory.OnePair << 20) |
      (pairHigh << 16) |
      (k0 << 12) |
      (k1 << 8) |
      (k2 << 4)
    );
  }

  // High Card (all 5 ranks distinct)
  let hc = HandCategory.HighCard << 20;
  let shift = 16;
  for (let r = 12; r >= 0; r--) {
    if (mask & (1 << r)) {
      hc |= r << shift;
      shift -= 4;
    }
  }
  return hc;
}

/**
 * Evaluates best 5-card hand from 7 cards (21 combinations)
 */
export function evaluate7(
  c0: number,
  c1: number,
  c2: number,
  c3: number,
  c4: number,
  c5: number,
  c6: number,
): number {
  const arr = [c0, c1, c2, c3, c4, c5, c6];
  let best = -1;
  for (let skip1 = 0; skip1 < 6; skip1++) {
    for (let skip2 = skip1 + 1; skip2 < 7; skip2++) {
      let a = -1;
      let b = -1;
      let c = -1;
      let d = -1;
      let e = -1;
      for (let i = 0; i < 7; i++) {
        if (i === skip1 || i === skip2) continue;
        if (a === -1) a = arr[i];
        else if (b === -1) b = arr[i];
        else if (c === -1) c = arr[i];
        else if (d === -1) d = arr[i];
        else e = arr[i];
      }
      const val = evaluate5(a, b, c, d, e);
      if (val > best) best = val;
    }
  }
  return best;
}

/**
 * Evaluates best 5-card hand from 5, 6, or 7 cards
 */
export function evaluateCards(cards: readonly number[]): number {
  const n = cards.length;
  if (n < 5) return 0;
  if (n === 5) return evaluate5(cards[0], cards[1], cards[2], cards[3], cards[4]);
  if (n === 6) {
    let best = -1;
    for (let skip = 0; skip < 6; skip++) {
      const five: number[] = [];
      for (let i = 0; i < 6; i++) {
        if (i !== skip) five.push(cards[i]);
      }
      const val = evaluate5(five[0], five[1], five[2], five[3], five[4]);
      if (val > best) best = val;
    }
    return best;
  }
  return evaluate7(cards[0], cards[1], cards[2], cards[3], cards[4], cards[5], cards[6]);
}

export function getHandCategory(score: number): HandCategory {
  return (score >>> 20) as HandCategory;
}
