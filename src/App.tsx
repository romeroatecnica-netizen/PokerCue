import React, {useEffect, useState} from 'react';
import {Globe} from 'lucide-react';
import {makeCard} from './engine/cards';
import {SimulationInput} from './engine/simulator';
import {
  detectInitialLanguage,
  LangCode,
  SUPPORTED_LANGS,
  TRANSLATIONS,
} from './i18n';
import {getCanonicalUrl, syncDocumentSeo} from './i18n/seo';
import {
  DEFAULT_PERSISTED_STATE,
  loadPersistedState,
  PokerCuePersistedState,
  savePersistedState,
  SavedSimulationRecord,
} from './storage/localStore';
import {ProbabilityTrainer} from './components/ProbabilityTrainer';
import {HandSimulator} from './components/HandSimulator';
import {LocalWorkspacePanel} from './components/LocalWorkspacePanel';
import {
  EditorialGuideSection,
  FaqSection,
  MediaNetAdSlot,
  PracticeGearSection,
} from './components/MonetizationAndSeo';

type ActiveTab = 'trainer' | 'simulator';

const INITIAL_SIM_INPUT: SimulationInput = {
  mode: 'holdem',
  heroCards: [makeCard(12, 1), makeCard(11, 1)], // Ah Kh
  boardCards: [makeCard(8, 1), makeCard(5, 1), makeCard(0, 3)], // Th 7h 2c
  discardIndices: [],
  deadCards: [],
  players: 3,
  iterations: 5000,
};

export default function App() {
  const [lang, setLang] = useState<LangCode>(() => detectInitialLanguage());
  const [activeTab, setActiveTab] = useState<ActiveTab>('trainer');
  const [persistedState, setPersistedState] = useState<PokerCuePersistedState>(() =>
    loadPersistedState(),
  );
  const [simInput, setSimInput] = useState<SimulationInput>(INITIAL_SIM_INPUT);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    syncDocumentSeo(lang, t);
    try {
      window.localStorage.setItem('pokercue_lang', lang);
    } catch {
      // Ignore storage access errors
    }
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (lang === 'en') {
        url.searchParams.delete('lang');
      } else {
        url.searchParams.set('lang', lang);
      }
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  }, [lang, t]);

  useEffect(() => {
    savePersistedState(persistedState);
  }, [persistedState]);

  const handleRecordAttempt = (absError: number) => {
    const isAccurate = absError <= 3;
    setPersistedState((prev) => {
      const nextStreak = isAccurate ? prev.trainerStats.currentStreak + 1 : 0;
      return {
        ...prev,
        trainerStats: {
          attempts: prev.trainerStats.attempts + 1,
          accurateHits: prev.trainerStats.accurateHits + (isAccurate ? 1 : 0),
          totalAbsError: prev.trainerStats.totalAbsError + absError,
          currentStreak: nextStreak,
          bestStreak: Math.max(prev.trainerStats.bestStreak, nextStreak),
        },
      };
    });
  };

  const handleSaveSimulation = (record: SavedSimulationRecord) => {
    setPersistedState((prev) => ({
      ...prev,
      savedSimulations: [record, ...prev.savedSimulations].slice(0, 20),
    }));
  };

  const handleLoadSimulation = (record: SavedSimulationRecord) => {
    setSimInput({
      mode: record.mode,
      heroCards: record.heroCards,
      boardCards: record.boardCards,
      discardIndices: record.discardIndices,
      deadCards: record.deadCards,
      players: record.players,
      iterations: record.iterations,
    });
    setActiveTab('simulator');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleDeleteSimulation = (id: string) => {
    setPersistedState((prev) => ({
      ...prev,
      savedSimulations: prev.savedSimulations.filter((s) => s.id !== id),
    }));
  };

  const handleOpenInSimulator = (payload: {
    mode: SimulationInput['mode'];
    heroCards: number[];
    boardCards: number[];
    discardIndices: number[];
    deadCards: number[];
    players: number;
  }) => {
    setSimInput((prev) => ({
      ...prev,
      ...payload,
    }));
    setActiveTab('simulator');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleResetStats = () => {
    setPersistedState((prev) => ({
      ...DEFAULT_PERSISTED_STATE,
      notes: prev.notes,
    }));
  };

  const shareUrl = getCanonicalUrl(lang);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Three-Zone Top Bar */}
      <header className="no-print sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element wordmark */}
          <a
            href={shareUrl}
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({top: 0, behavior: 'smooth'});
            }}
            className="font-display text-xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            PokerCue
          </a>

          {/* Zone 2: Single-line nav links */}
          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a
              href="#trainer"
              onClick={() => setActiveTab('trainer')}
              className="hover:text-slate-900 hover:underline underline-offset-4 whitespace-nowrap shrink-0 transition-colors"
            >
              {t.navTrainer}
            </a>
            <a
              href="#simulator"
              onClick={() => setActiveTab('simulator')}
              className="hover:text-slate-900 hover:underline underline-offset-4 whitespace-nowrap shrink-0 transition-colors"
            >
              {t.navSimulator}
            </a>
            <a
              href="#guide"
              className="hover:text-slate-900 hover:underline underline-offset-4 whitespace-nowrap shrink-0 transition-colors"
            >
              {t.navGuide}
            </a>
            <a
              href="#faq"
              className="hover:text-slate-900 hover:underline underline-offset-4 whitespace-nowrap shrink-0 transition-colors"
            >
              {t.navFaq}
            </a>
          </nav>

          {/* Zone 3: Language Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="lang-select" className="sr-only">
              Language
            </label>
            <div className="relative inline-flex items-center">
              <Globe
                className="w-4 h-4 text-slate-500 absolute start-2.5 pointer-events-none"
                aria-hidden="true"
              />
              <select
                id="lang-select"
                value={lang}
                onChange={(e) => setLang(e.target.value as LangCode)}
                className="ps-8 pe-3 py-1.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-800 cursor-pointer focus:outline-none focus:border-[#1E40AF]"
              >
                {SUPPORTED_LANGS.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.nativeLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* Hero Title & Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 text-balance">
              {t.h1Title}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600">{t.h1Subtitle}</p>
          </div>

          <div
            role="tablist"
            aria-label="Workspace Mode"
            className="no-print inline-flex items-center p-1 bg-slate-200/80 rounded-xl self-start lg:self-auto shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'trainer'}
              onClick={() => setActiveTab('trainer')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'trainer'
                  ? 'bg-[#047857] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              {t.tabTrainer}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'simulator'}
              onClick={() => setActiveTab('simulator')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-[#1E40AF] text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              {t.tabSimulator}
            </button>
          </div>
        </div>

        {/* Active Tool Workspace */}
        {activeTab === 'trainer' ? (
          <ProbabilityTrainer
            t={t}
            stats={persistedState.trainerStats}
            onRecordAttempt={handleRecordAttempt}
            onOpenInSimulator={handleOpenInSimulator}
          />
        ) : (
          <HandSimulator
            t={t}
            input={simInput}
            onChangeInput={setSimInput}
            onSaveSimulation={handleSaveSimulation}
          />
        )}

        {/* Local Persistence, JSON Export/Import & Print Summary */}
        <LocalWorkspacePanel
          t={t}
          state={persistedState}
          shareUrl={shareUrl}
          onUpdateNotes={(notes) => setPersistedState((prev) => ({...prev, notes}))}
          onImportState={(next) => setPersistedState(next)}
          onResetStats={handleResetStats}
          onLoadSimulation={handleLoadSimulation}
          onDeleteSimulation={handleDeleteSimulation}
        />

        {/* Media.net Ad Placement 1 (Between tool & editorial SEO) */}
        <MediaNetAdSlot
          slotId="pokercue-mnet-mid"
          label={t.adLabel}
          variant="leaderboard"
        />

        {/* Editorial SEO Guide (with contextual study book recommendation) */}
        <EditorialGuideSection t={t} />

        {/* Contextual Practice Gear (Amazon.es Affiliate Placement) */}
        <PracticeGearSection t={t} />

        {/* Interactive FAQ & Transparent Disclaimer */}
        <FaqSection t={t} />

        {/* Media.net Ad Placement 2 (Bottom of page) */}
        <MediaNetAdSlot
          slotId="pokercue-mnet-bottom"
          label={t.adLabel}
          variant="bottom"
        />
      </main>

      {/* Quiet Footer */}
      <footer className="no-print border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <span>{t.footerNote}</span>
            <a
              href={shareUrl}
              className="font-mono-tabular text-slate-600 hover:text-slate-900 hover:underline"
            >
              {shareUrl}
            </a>
          </div>
          <p className="text-[11px] text-slate-500">{t.affiliateDisclosure}</p>
        </div>
      </footer>
    </div>
  );
}
