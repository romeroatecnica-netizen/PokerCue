import React, {useMemo, useState} from 'react';
import {BookmarkPlus, Play, Shuffle, Trash2} from 'lucide-react';
import {
  createRng,
  formatCardPretty,
  HAND_CATEGORY_KEYS,
  makeCard,
  RANK_CHARS,
  SUIT_SYMBOLS,
} from '../engine/cards';
import {runSimulation, SimulationInput, SimulatorMode} from '../engine/simulator';
import {TranslationBundle} from '../i18n/types';
import {SavedSimulationRecord} from '../storage/localStore';
import {HandDistributionSvg} from './HandDistributionSvg';
import {PlayingCard} from './PlayingCard';

type PickerTarget = 'hero' | 'board' | 'dead';

interface HandSimulatorProps {
  t: TranslationBundle;
  input: SimulationInput;
  onChangeInput: (next: SimulationInput) => void;
  onSaveSimulation: (record: SavedSimulationRecord) => void;
}

export const HandSimulator: React.FC<HandSimulatorProps> = ({
  t,
  input,
  onChangeInput,
  onSaveSimulation,
}) => {
  const [activeTarget, setActiveTarget] = useState<PickerTarget>('hero');
  const [savedNotice, setSavedNotice] = useState(false);

  const result = useMemo(() => runSimulation(input), [input]);

  const heroSet = useMemo(() => new Set(input.heroCards), [input.heroCards]);
  const boardSet = useMemo(() => new Set(input.boardCards), [input.boardCards]);
  const deadSet = useMemo(() => new Set(input.deadCards), [input.deadCards]);

  const maxHero = input.mode === 'holdem' ? 2 : 5;
  const maxBoard = input.mode === 'holdem' ? 5 : 0;
  const maxDead = 10;

  const switchMode = (mode: SimulatorMode) => {
    if (mode === input.mode) return;
    if (mode === 'holdem') {
      onChangeInput({
        ...input,
        mode: 'holdem',
        heroCards: [makeCard(12, 0), makeCard(11, 0)], // As Ks
        boardCards: [makeCard(9, 0), makeCard(4, 0), makeCard(1, 1)], // Js 6s 3h
        discardIndices: [],
        deadCards: [],
      });
      setActiveTarget('board');
    } else {
      onChangeInput({
        ...input,
        mode: 'discard',
        heroCards: [
          makeCard(12, 0),
          makeCard(10, 0),
          makeCard(7, 0),
          makeCard(3, 0),
          makeCard(8, 2),
        ], // As Qs 9s 5s Td
        boardCards: [],
        discardIndices: [4],
        deadCards: [],
      });
      setActiveTarget('hero');
    }
  };

  const handleDeckCardClick = (card: number) => {
    // If card is already assigned anywhere, remove it from that zone
    if (heroSet.has(card)) {
      const idx = input.heroCards.indexOf(card);
      const nextHero = input.heroCards.filter((c) => c !== card);
      const nextDiscards = input.discardIndices
        .filter((d) => d !== idx)
        .map((d) => (d > idx ? d - 1 : d));
      onChangeInput({
        ...input,
        heroCards: nextHero,
        discardIndices: nextDiscards,
      });
      return;
    }
    if (boardSet.has(card)) {
      onChangeInput({
        ...input,
        boardCards: input.boardCards.filter((c) => c !== card),
      });
      return;
    }
    if (deadSet.has(card)) {
      onChangeInput({
        ...input,
        deadCards: input.deadCards.filter((c) => c !== card),
      });
      return;
    }

    // Otherwise assign to activeTarget (or cascade if hero full)
    if (activeTarget === 'hero') {
      if (input.heroCards.length < maxHero) {
        onChangeInput({...input, heroCards: [...input.heroCards, card]});
      } else if (input.mode === 'holdem' && input.boardCards.length < maxBoard) {
        onChangeInput({...input, boardCards: [...input.boardCards, card]});
        setActiveTarget('board');
      }
    } else if (activeTarget === 'board' && input.mode === 'holdem') {
      if (input.boardCards.length < maxBoard) {
        onChangeInput({...input, boardCards: [...input.boardCards, card]});
      }
    } else {
      if (input.deadCards.length < maxDead) {
        onChangeInput({...input, deadCards: [...input.deadCards, card]});
      }
    }
  };

  const toggleDiscardIndex = (idx: number) => {
    if (input.mode !== 'discard') return;
    const exists = input.discardIndices.includes(idx);
    if (exists) {
      if (input.discardIndices.length <= 1) return;
      onChangeInput({
        ...input,
        discardIndices: input.discardIndices.filter((i) => i !== idx),
      });
    } else {
      if (input.discardIndices.length >= 3) return;
      onChangeInput({
        ...input,
        discardIndices: [...input.discardIndices, idx].sort((a, b) => a - b),
      });
    }
  };

  const loadPreset = (preset: 'nut_flush' | 'aces_multiway' | 'oesd_flop' | 'discard_flush') => {
    if (preset === 'nut_flush') {
      onChangeInput({
        ...input,
        mode: 'holdem',
        heroCards: [makeCard(12, 1), makeCard(11, 1)], // Ah Kh
        boardCards: [makeCard(8, 1), makeCard(5, 1), makeCard(0, 3)], // Th 7h 2c
        discardIndices: [],
        deadCards: [],
        players: 3,
      });
    } else if (preset === 'aces_multiway') {
      onChangeInput({
        ...input,
        mode: 'holdem',
        heroCards: [makeCard(12, 0), makeCard(12, 2)], // As Ad
        boardCards: [],
        discardIndices: [],
        deadCards: [],
        players: 6,
      });
    } else if (preset === 'oesd_flop') {
      onChangeInput({
        ...input,
        mode: 'holdem',
        heroCards: [makeCard(9, 0), makeCard(8, 1)], // Js Th
        boardCards: [makeCard(7, 2), makeCard(6, 3), makeCard(1, 0)], // 9d 8c 3s
        discardIndices: [],
        deadCards: [],
        players: 4,
      });
    } else {
      onChangeInput({
        ...input,
        mode: 'discard',
        heroCards: [
          makeCard(12, 2),
          makeCard(11, 2),
          makeCard(9, 2),
          makeCard(5, 2),
          makeCard(2, 0),
        ], // Ad Kd Jd 7d 4s
        boardCards: [],
        discardIndices: [4],
        deadCards: [makeCard(7, 2), makeCard(3, 1)], // 9d 5h known
        players: 4,
      });
    }
  };

  const dealRandom = () => {
    const rng = createRng(Date.now() & 0xffffffff);
    const deck = Array.from({length: 52}, (_, i) => i);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }
    if (input.mode === 'holdem') {
      onChangeInput({
        ...input,
        heroCards: deck.slice(0, 2),
        boardCards: deck.slice(2, 5),
        discardIndices: [],
        deadCards: [],
      });
    } else {
      onChangeInput({
        ...input,
        heroCards: deck.slice(0, 5),
        boardCards: [],
        discardIndices: [3, 4],
        deadCards: [],
      });
    }
  };

  const clearTable = () => {
    onChangeInput({
      ...input,
      heroCards: [],
      boardCards: [],
      discardIndices: [],
      deadCards: [],
    });
    setActiveTarget('hero');
  };

  const handleSave = () => {
    if (!result.valid) return;
    onSaveSimulation({
      id: `sim_${Date.now()}`,
      timestamp: new Date().toISOString(),
      mode: input.mode,
      heroCards: [...input.heroCards],
      boardCards: [...input.boardCards],
      discardIndices: [...input.discardIndices],
      deadCards: [...input.deadCards],
      players: input.players,
      iterations: input.iterations,
      winPct: result.winPct,
      tiePct: result.tiePct,
      lossPct: result.lossPct,
      equityPct: result.equityPct,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2200);
  };

  // Ordered ranks from A (12) down to 2 (0)
  const ranksDesc = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

  return (
    <section id="simulator" aria-labelledby="simulator-heading" className="space-y-6">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-7 print-container">
        {/* Header & Mode Switch */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="max-w-2xl">
            <h2 id="simulator-heading" className="text-xl sm:text-2xl font-bold text-slate-900">
              {t.simulatorHeading}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{t.simulatorSubheading}</p>
          </div>

          <div className="no-print flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => switchMode('holdem')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                input.mode === 'holdem'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.simModeHoldem}
            </button>
            <button
              type="button"
              onClick={() => switchMode('discard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                input.mode === 'discard'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.simModeDiscard}
            </button>
          </div>
        </div>

        {/* Presets & Utility Toolbar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 py-4 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">{t.presetsLabel}:</span>
            <button
              type="button"
              onClick={() => loadPreset('nut_flush')}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.presetNutFlush}
            </button>
            <button
              type="button"
              onClick={() => loadPreset('aces_multiway')}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.presetAcesMultiway}
            </button>
            <button
              type="button"
              onClick={() => loadPreset('oesd_flop')}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.presetOesdFlop}
            </button>
            <button
              type="button"
              onClick={() => loadPreset('discard_flush')}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.presetDiscardFlush}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={dealRandom}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              {t.randomDealBtn}
            </button>
            <button
              type="button"
              onClick={clearTable}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t.clearTableBtn}
            </button>
          </div>
        </div>

        {/* Selected Cards Slots + Simulation Parameters */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-5 border-b border-slate-200">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap gap-6 items-start">
              {/* Hero Slot */}
              <div
                onClick={() => setActiveTarget('hero')}
                className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                  activeTarget === 'hero'
                    ? 'border-[#047857] bg-emerald-50/40'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-xs font-bold text-slate-800">{t.slotHeroLabel}</span>
                  <span className="text-[11px] font-mono-tabular text-slate-500">
                    {input.heroCards.length}/{maxHero}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({length: maxHero}).map((_, idx) => {
                    const card = input.heroCards[idx] ?? null;
                    const isDiscarded =
                      input.mode === 'discard' && input.discardIndices.includes(idx);
                    return (
                      <PlayingCard
                        key={`hero-${idx}`}
                        card={card}
                        size="md"
                        discarded={isDiscarded}
                        onClick={
                          card !== null
                            ? (e?: never) => {
                                void e;
                                if (input.mode === 'discard') {
                                  toggleDiscardIndex(idx);
                                } else {
                                  handleDeckCardClick(card);
                                }
                              }
                            : () => setActiveTarget('hero')
                        }
                      />
                    );
                  })}
                </div>
                {input.mode === 'discard' && (
                  <p className="mt-2 text-[11px] text-amber-800 font-medium">
                    {t.discardToggleHint}
                  </p>
                )}
              </div>

              {/* Board Slot (Hold'em) */}
              {input.mode === 'holdem' && (
                <div
                  onClick={() => setActiveTarget('board')}
                  className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                    activeTarget === 'board'
                      ? 'border-[#1E40AF] bg-blue-50/40'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-xs font-bold text-slate-800">{t.slotBoardLabel}</span>
                    <span className="text-[11px] font-mono-tabular text-slate-500">
                      {input.boardCards.length}/5
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({length: 5}).map((_, idx) => {
                      const card = input.boardCards[idx] ?? null;
                      return (
                        <PlayingCard
                          key={`board-${idx}`}
                          card={card}
                          size="md"
                          onClick={
                            card !== null
                              ? () => handleDeckCardClick(card)
                              : () => setActiveTarget('board')
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dead / Exposed Cards Slot */}
              <div
                onClick={() => setActiveTarget('dead')}
                className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                  activeTarget === 'dead'
                    ? 'border-[#D97706] bg-amber-50/40'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-xs font-bold text-slate-800">{t.slotDeadLabel}</span>
                  <span className="text-[11px] font-mono-tabular text-slate-500">
                    {input.deadCards.length}/{maxDead}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[64px] items-center">
                  {input.deadCards.length === 0 ? (
                    <span className="text-xs text-slate-400 px-2">{t.noneLabel}</span>
                  ) : (
                    input.deadCards.map((c) => (
                      <PlayingCard
                        key={`dead-${c}`}
                        card={c}
                        size="sm"
                        dead
                        onClick={() => handleDeckCardClick(c)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 52-Card Interactive Picker Matrix */}
            <div className="no-print pt-2" dir="ltr">
              <div className="space-y-1.5">
                {[0, 1, 2, 3].map((suit) => {
                  const isRed = suit === 1 || suit === 2;
                  return (
                    <div key={suit} className="flex flex-wrap items-center gap-1">
                      <span
                        className={`w-6 text-center text-sm font-bold ${
                          isRed ? 'text-[#DC2626]' : 'text-slate-800'
                        }`}
                      >
                        {SUIT_SYMBOLS[suit]}
                      </span>
                      {ranksDesc.map((rank) => {
                        const card = makeCard(rank, suit);
                        const inHero = heroSet.has(card);
                        const inBoard = boardSet.has(card);
                        const inDead = deadSet.has(card);

                        let btnStyle =
                          'bg-white border-slate-300 hover:border-slate-500 text-slate-900';
                        if (inHero) {
                          btnStyle = 'bg-[#047857] border-[#047857] text-white';
                        } else if (inBoard) {
                          btnStyle = 'bg-[#1E40AF] border-[#1E40AF] text-white';
                        } else if (inDead) {
                          btnStyle = 'bg-amber-600 border-amber-600 text-white';
                        } else if (isRed) {
                          btnStyle =
                            'bg-white border-slate-300 hover:border-slate-500 text-[#DC2626]';
                        }

                        return (
                          <button
                            key={card}
                            type="button"
                            onClick={() => handleDeckCardClick(card)}
                            className={`w-8 h-8 sm:w-9 sm:h-8 text-xs font-mono-tabular font-bold border rounded-md transition-colors cursor-pointer ${btnStyle}`}
                            aria-label={formatCardPretty(card)}
                          >
                            {RANK_CHARS[rank]}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Controls: Players, Iterations, Save */}
          <div className="lg:col-span-4 space-y-5 bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5">
            <div>
              <label
                htmlFor="sim-players"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {t.playersCountLabel}:{' '}
                <span className="font-mono-tabular font-bold text-[#1E40AF]">
                  {input.players} {t.playersUnit}
                </span>
              </label>
              <input
                id="sim-players"
                type="range"
                min={2}
                max={9}
                step={1}
                value={input.players}
                onChange={(e) =>
                  onChangeInput({...input, players: Number(e.target.value)})
                }
                className="w-full accent-[#047857] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono-tabular text-slate-500 mt-0.5">
                <span>2</span>
                <span>5</span>
                <span>9</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="sim-iterations"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {t.iterationsLabel}
              </label>
              <select
                id="sim-iterations"
                value={input.iterations}
                onChange={(e) =>
                  onChangeInput({...input, iterations: Number(e.target.value)})
                }
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#1E40AF]"
              >
                <option value={2000}>2,000</option>
                <option value={5000}>5,000</option>
                <option value={10000}>10,000</option>
                <option value={15000}>15,000</option>
              </select>
            </div>

            <div className="no-print flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                onClick={() => onChangeInput({...input})}
                disabled={!result.valid}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#047857] hover:bg-[#065F46] disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                {t.runSimBtn}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!result.valid}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BookmarkPlus className="w-4 h-4" />
                {t.saveSimBtn}
              </button>
            </div>

            {savedNotice && (
              <p className="text-xs font-semibold text-[#047857]">{t.simSavedToast}</p>
            )}

            {!result.valid && result.errorKey && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs font-medium text-amber-900">
                {t.simErrors[result.errorKey as keyof typeof t.simErrors]}
              </div>
            )}
          </div>
        </div>

        {/* Simulation Results + SVG Distribution Chart */}
        {result.valid && (
          <div className="pt-6 space-y-8">
            {/* Primary 4-KPI Equity Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-6 border-b border-slate-200 print-break-inside-avoid">
              <div>
                <div className="text-xs font-medium text-slate-500">{t.equityPctLabel}</div>
                <div className="mt-1 text-3xl font-bold font-mono-tabular text-[#047857]">
                  {result.equityPct.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">{t.winPctLabel}</div>
                <div className="mt-1 text-3xl font-bold font-mono-tabular text-[#1E40AF]">
                  {result.winPct.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">{t.tiePctLabel}</div>
                <div className="mt-1 text-3xl font-bold font-mono-tabular text-[#D97706]">
                  {result.tiePct.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">{t.lossPctLabel}</div>
                <div className="mt-1 text-3xl font-bold font-mono-tabular text-slate-700">
                  {result.lossPct.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Current Hand & Outs Row (when applicable) */}
            {(result.currentCategory !== null || result.improveOuts !== null) && (
              <div className="flex flex-wrap items-center gap-x-10 gap-y-4 pb-6 border-b border-slate-200 print-break-inside-avoid">
                {result.currentCategory !== null && (
                  <div>
                    <div className="text-xs text-slate-500">{t.currentHandLabel}</div>
                    <div className="mt-0.5 text-base font-bold text-slate-900">
                      {t.handCategories[HAND_CATEGORY_KEYS[result.currentCategory]]}
                    </div>
                  </div>
                )}

                {result.improveOuts !== null && (
                  <div>
                    <div className="text-xs text-slate-500">{t.improveOutsLabel}</div>
                    <div className="mt-0.5 text-base font-bold font-mono-tabular text-[#D97706]">
                      {result.improveOuts}
                    </div>
                  </div>
                )}

                {result.nextStreetImprovePct !== null && (
                  <div>
                    <div className="text-xs text-slate-500">{t.nextCardImproveLabel}</div>
                    <div className="mt-0.5 text-base font-bold font-mono-tabular text-slate-900">
                      {result.nextStreetImprovePct.toFixed(2)}%
                    </div>
                  </div>
                )}

                {result.twoStreetImprovePct !== null && (
                  <div>
                    <div className="text-xs text-slate-500">{t.twoCardImproveLabel}</div>
                    <div className="mt-0.5 text-base font-bold font-mono-tabular text-slate-900">
                      {result.twoStreetImprovePct.toFixed(2)}%
                    </div>
                  </div>
                )}

                {result.improveOutCards.length > 0 && result.improveOutCards.length <= 20 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {result.improveOutCards.map((c) => {
                      const s = Math.floor(c / 13);
                      const isRed = s === 1 || s === 2;
                      return (
                        <span
                          key={`out-${c}`}
                          className={`px-1.5 py-0.5 text-xs font-mono-tabular font-semibold bg-slate-100 border border-slate-200 rounded ${
                            isRed ? 'text-[#DC2626]' : 'text-slate-900'
                          }`}
                        >
                          {formatCardPretty(c)}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Static SVG Hand Distribution Chart */}
            <div className="print-break-inside-avoid">
              <HandDistributionSvg distribution={result.distribution} t={t} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
