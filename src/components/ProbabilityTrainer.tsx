import React, {useMemo, useState} from 'react';
import {CheckCircle2, RefreshCw, ArrowRight} from 'lucide-react';
import {
  generateTrainerScenario,
  QuestionFocus,
  TrainerConfig,
  TrainerPhase,
  TrainerTarget,
} from '../engine/trainer';
import {SimulatorMode} from '../engine/simulator';
import {TranslationBundle} from '../i18n/types';
import {TrainerStats} from '../storage/localStore';
import {PlayingCard} from './PlayingCard';

interface ProbabilityTrainerProps {
  t: TranslationBundle;
  stats: TrainerStats;
  onRecordAttempt: (absError: number) => void;
  onOpenInSimulator: (payload: {
    mode: SimulatorMode;
    heroCards: number[];
    boardCards: number[];
    discardIndices: number[];
    deadCards: number[];
    players: number;
  }) => void;
}

export const ProbabilityTrainer: React.FC<ProbabilityTrainerProps> = ({
  t,
  stats,
  onRecordAttempt,
  onOpenInSimulator,
}) => {
  const [config, setConfig] = useState<TrainerConfig>({
    target: 'flush_draw',
    players: 4,
    phase: 'flop_to_river',
    potSize: 100,
    callAmount: 35,
    questionFocus: 'showdown_equity',
    challengeSeed: 1,
  });

  const [estimateInput, setEstimateInput] = useState<number>(35);
  const [checkedSeed, setCheckedSeed] = useState<string | null>(null);
  const [lastDelta, setLastDelta] = useState<number | null>(null);

  const scenario = useMemo(() => generateTrainerScenario(config), [config]);

  const currentKey = `${config.target}|${config.players}|${config.phase}|${config.questionFocus}|${config.challengeSeed}|${config.potSize}|${config.callAmount}`;
  const isRevealed = checkedSeed === currentKey;

  const updateConfig = (patch: Partial<TrainerConfig>) => {
    setConfig((prev) => {
      const next = {...prev, ...patch};
      if (patch.target === 'discard_draw') {
        next.phase = 'discard_1_3';
      } else if (patch.phase === 'discard_1_3' && next.target !== 'discard_draw') {
        next.target = 'discard_draw';
      } else if (patch.phase && patch.phase !== 'discard_1_3' && next.target === 'discard_draw') {
        next.target = 'flush_draw';
      }
      return next;
    });
    setCheckedSeed(null);
    setLastDelta(null);
  };

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const clamped = Math.min(100, Math.max(0, Number(estimateInput) || 0));
    const delta = Math.abs(clamped - scenario.answerMetricPct);
    if (!isRevealed) {
      onRecordAttempt(delta);
    }
    setLastDelta(delta);
    setCheckedSeed(currentKey);
  };

  const handleNextChallenge = () => {
    setConfig((prev) => ({
      ...prev,
      challengeSeed: prev.challengeSeed + 1,
    }));
    setCheckedSeed(null);
    setLastDelta(null);
  };

  const meanError = stats.attempts > 0 ? stats.totalAbsError / stats.attempts : 0;

  const promptText =
    config.questionFocus === 'hit_target'
      ? t.estimatePromptHit
      : t.estimatePromptEquity.replace('{players}', String(config.players));

  const accuracyLabel =
    lastDelta === null
      ? ''
      : lastDelta <= 3
        ? t.accurateBadge
        : lastDelta <= 7
          ? t.closeBadge
          : t.offBadge;

  const accuracyColor =
    lastDelta === null
      ? ''
      : lastDelta <= 3
        ? 'text-[#047857]'
        : lastDelta <= 7
          ? 'text-[#D97706]'
          : 'text-[#DC2626]';

  const verdictText =
    scenario.recommendedAction === 'call'
      ? t.verdictCall
      : scenario.recommendedAction === 'fold'
        ? t.verdictFold
        : t.verdictMarginal;

  const verdictColor =
    scenario.recommendedAction === 'call'
      ? 'text-[#047857]'
      : scenario.recommendedAction === 'fold'
        ? 'text-[#DC2626]'
        : 'text-[#D97706]';

  return (
    <section id="trainer" aria-labelledby="trainer-heading" className="space-y-6">
      {/* Main Trainer Container */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-7 print-container">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="max-w-2xl">
            <h2 id="trainer-heading" className="text-xl sm:text-2xl font-bold text-slate-900">
              {t.trainerHeading}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{t.trainerSubheading}</p>
          </div>
          <button
            type="button"
            onClick={handleNextChallenge}
            className="no-print inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            {t.newChallengeBtn}
          </button>
        </div>

        {/* Variable Configuration Grid */}
        <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 py-5 border-b border-slate-200">
          <div>
            <label
              htmlFor="trainer-target"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {t.targetHandLabel}
            </label>
            <select
              id="trainer-target"
              value={config.target}
              onChange={(e) => updateConfig({target: e.target.value as TrainerTarget})}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#1E40AF]"
            >
              <option value="flush_draw">{t.targetFlushDraw}</option>
              <option value="oesd">{t.targetOesd}</option>
              <option value="set_trips">{t.targetSetTrips}</option>
              <option value="two_pair_top_pair">{t.targetTwoPairTopPair}</option>
              <option value="discard_draw">{t.targetDiscardDraw}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="trainer-phase"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {t.phaseLabel}
            </label>
            <select
              id="trainer-phase"
              value={scenario.config.phase}
              onChange={(e) => updateConfig({phase: e.target.value as TrainerPhase})}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#1E40AF]"
            >
              <option value="flop_to_river">{t.phaseFlopToRiver}</option>
              <option value="turn_to_river">{t.phaseTurnToRiver}</option>
              <option value="discard_1_3">{t.phaseDiscard13}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="trainer-players"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              {t.playersCountLabel}:{' '}
              <span className="tabular-nums font-bold text-[#1E40AF]">
                {config.players} {t.playersUnit}
              </span>
            </label>
            <input
              id="trainer-players"
              type="range"
              min={2}
              max={9}
              step={1}
              value={config.players}
              onChange={(e) => updateConfig({players: Number(e.target.value)})}
              className="w-full mt-2 accent-[#047857] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono-tabular mt-0.5">
              <span>2</span>
              <span>5</span>
              <span>9</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="trainer-pot"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {t.potSizeLabel}
              </label>
              <input
                id="trainer-pot"
                type="number"
                min={1}
                max={100000}
                value={config.potSize}
                onChange={(e) =>
                  updateConfig({potSize: Math.max(1, Number(e.target.value) || 1)})
                }
                className="w-full px-2.5 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#1E40AF]"
              />
            </div>
            <div>
              <label
                htmlFor="trainer-call"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                {t.callAmountLabel}
              </label>
              <input
                id="trainer-call"
                type="number"
                min={0}
                max={100000}
                value={config.callAmount}
                onChange={(e) =>
                  updateConfig({callAmount: Math.max(0, Number(e.target.value) || 0)})
                }
                className="w-full px-2.5 py-2 text-sm font-mono-tabular bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#1E40AF]"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t.questionFocusLabel}
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => updateConfig({questionFocus: 'showdown_equity' as QuestionFocus})}
                className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors truncate cursor-pointer ${
                  config.questionFocus === 'showdown_equity'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={t.focusShowdownEquity}
              >
                {t.focusShowdownEquity}
              </button>
              <button
                type="button"
                onClick={() => updateConfig({questionFocus: 'hit_target' as QuestionFocus})}
                className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors truncate cursor-pointer ${
                  config.questionFocus === 'hit_target'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={t.focusHitTarget}
              >
                {t.focusHitTarget}
              </button>
            </div>
          </div>
        </div>

        {/* Dealt Scenario Stage + Estimate Interaction */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-6 items-start">
          {/* Left Stage: Cards & Pot Context */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
              <span className="font-semibold text-slate-900">
                {t.scenarioLabels[scenario.scenarioLabelKey as keyof typeof t.scenarioLabels]}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {config.players} {t.playersUnit}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {t.potSizeLabel}: {config.potSize} / {t.callAmountLabel}: {config.callAmount}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-5">
              <div className="flex flex-wrap gap-6 items-start">
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-2">
                    {t.heroCardsLabel}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {scenario.heroCards.map((c, idx) => (
                      <PlayingCard
                        key={`${c}-${idx}`}
                        card={c}
                        size="lg"
                        discarded={scenario.discardIndices.includes(idx)}
                      />
                    ))}
                  </div>
                </div>

                {scenario.mode === 'holdem' && (
                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-2">
                      {t.boardCardsLabel}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {scenario.boardCards.map((c, idx) => (
                        <PlayingCard key={`${c}-${idx}`} card={c} size="lg" />
                      ))}
                      {Array.from({length: 5 - scenario.boardCards.length}).map((_, idx) => (
                        <PlayingCard key={`empty-${idx}`} card={null} size="lg" />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-2">
                    {t.deadCardsLabel}
                  </div>
                  {scenario.deadCards.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {scenario.deadCards.map((c, idx) => (
                        <PlayingCard key={`dead-${c}-${idx}`} card={c} size="md" dead />
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 py-3">{t.noneLabel}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Deck: Estimate Form */}
          <form onSubmit={handleCheck} className="lg:col-span-5 space-y-4">
            <p className="text-sm font-medium text-slate-800">{promptText}</p>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="estimate-input"
                  className="text-xs font-semibold text-slate-700"
                >
                  {t.yourEstimateLabel}
                </label>
                <span className="text-2xl font-bold font-mono-tabular text-[#047857]">
                  {estimateInput.toFixed(1)}%
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={estimateInput}
                onChange={(e) => setEstimateInput(Number(e.target.value))}
                aria-label={t.yourEstimateLabel}
                className="w-full accent-[#047857] cursor-pointer mb-3"
              />

              <div className="flex items-center gap-3">
                <input
                  id="estimate-input"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={estimateInput}
                  onChange={(e) => setEstimateInput(Number(e.target.value))}
                  className="w-28 px-3 py-2 text-base font-mono-tabular font-semibold bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-[#047857]"
                />
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#047857] hover:bg-[#065F46] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {t.checkEstimateBtn}
                </button>
              </div>
            </div>

            {isRevealed && lastDelta !== null && (
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    {t.yourErrorLabel}
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${accuracyColor}`}>
                    ±{lastDelta.toFixed(1)}% · {accuracyLabel}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onOpenInSimulator({
                      mode: scenario.mode,
                      heroCards: scenario.heroCards,
                      boardCards: scenario.boardCards,
                      discardIndices: scenario.discardIndices,
                      deadCards: scenario.deadCards,
                      players: config.players,
                    })
                  }
                  className="no-print inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E40AF] hover:underline cursor-pointer"
                >
                  {t.tabSimulator}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Exact Math Breakdown (Revealed on Check or when printing) */}
        {isRevealed && (
          <div className="pt-5 border-t border-slate-200 print-break-inside-avoid">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="py-2">
                <div className="text-xs text-slate-500">{t.exactHitProbLabel}</div>
                <div className="mt-1 text-xl font-bold font-mono-tabular text-[#047857]">
                  {scenario.exactHitPct.toFixed(2)}%
                </div>
              </div>

              <div className="py-2">
                <div className="text-xs text-slate-500">{t.showdownEquityLabel}</div>
                <div className="mt-1 text-xl font-bold font-mono-tabular text-[#1E40AF]">
                  {scenario.simulation.equityPct.toFixed(1)}%
                </div>
              </div>

              <div className="py-2">
                <div className="text-xs text-slate-500">{t.outsCombosLabel}</div>
                <div className="mt-1 text-xl font-bold font-mono-tabular text-[#D97706]">
                  {scenario.exactOuts} / {scenario.unseenCardsCount}
                </div>
              </div>

              <div className="py-2">
                <div className="text-xs text-slate-500">{t.rule42Label}</div>
                <div className="mt-1 text-xl font-bold font-mono-tabular text-slate-900">
                  {scenario.ruleOf42Pct.toFixed(1)}%
                </div>
              </div>

              <div className="py-2">
                <div className="text-xs text-slate-500">{t.potOddsLabel}</div>
                <div className="mt-1 text-xl font-bold font-mono-tabular text-slate-900">
                  {scenario.potOddsPct.toFixed(1)}%
                </div>
              </div>

              <div className="py-2">
                <div className="text-xs text-slate-500">{t.decisionVerdictLabel}</div>
                <div className={`mt-1 text-sm font-bold ${verdictColor}`}>
                  {verdictText}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Session Stats Strip */}
        <div className="mt-6 pt-5 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div>
            <div className="text-xs text-slate-500">{t.statsAttempts}</div>
            <div className="text-lg font-bold font-mono-tabular text-slate-900">
              {stats.attempts}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">{t.statsAccurate}</div>
            <div className="text-lg font-bold font-mono-tabular text-[#047857]">
              {stats.accurateHits}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">{t.statsAvgError}</div>
            <div className="text-lg font-bold font-mono-tabular text-slate-900">
              {meanError.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">{t.statsStreak}</div>
            <div className="text-lg font-bold font-mono-tabular text-[#1E40AF]">
              {stats.currentStreak}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">{t.statsBestStreak}</div>
            <div className="text-lg font-bold font-mono-tabular text-slate-900">
              {stats.bestStreak}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
