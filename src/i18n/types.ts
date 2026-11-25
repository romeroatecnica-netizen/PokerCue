export const CANONICAL_ORIGIN = 'https://pokercue.bastelar.com';

export type LangCode = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'ar' | 'hi' | 'ru' | 'zh' | 'ja';

export interface LangMeta {
  code: LangCode;
  label: string;
  nativeLabel: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGS: LangMeta[] = [
  {code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr'},
  {code: 'es', label: 'Spanish', nativeLabel: 'Español', dir: 'ltr'},
  {code: 'fr', label: 'French', nativeLabel: 'Français', dir: 'ltr'},
  {code: 'de', label: 'German', nativeLabel: 'Deutsch', dir: 'ltr'},
  {code: 'pt', label: 'Portuguese', nativeLabel: 'Português', dir: 'ltr'},
  {code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl'},
  {code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', dir: 'ltr'},
  {code: 'ru', label: 'Russian', nativeLabel: 'Русский', dir: 'ltr'},
  {code: 'zh', label: 'Chinese', nativeLabel: '中文', dir: 'ltr'},
  {code: 'ja', label: 'Japanese', nativeLabel: '日本語', dir: 'ltr'},
];

export interface GuideSection {
  title: string;
  body: string;
  highlight: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface GearItem {
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  href: string;
  category: 'book' | 'mat' | 'cards' | 'timer';
}

export interface TranslationBundle {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  h1Title: string;
  h1Subtitle: string;
  navTrainer: string;
  navSimulator: string;
  navGuide: string;
  navFaq: string;
  tabTrainer: string;
  tabSimulator: string;
  printSummary: string;
  copyLink: string;
  linkCopied: string;
  exportJson: string;
  importJson: string;
  importSuccess: string;
  importError: string;
  clearStorage: string;

  // Trainer
  trainerHeading: string;
  trainerSubheading: string;
  targetHandLabel: string;
  targetFlushDraw: string;
  targetOesd: string;
  targetSetTrips: string;
  targetTwoPairTopPair: string;
  targetDiscardDraw: string;
  playersCountLabel: string;
  playersUnit: string;
  phaseLabel: string;
  phaseFlopToRiver: string;
  phaseTurnToRiver: string;
  phaseDiscard13: string;
  potSizeLabel: string;
  callAmountLabel: string;
  questionFocusLabel: string;
  focusShowdownEquity: string;
  focusHitTarget: string;
  estimatePromptEquity: string;
  estimatePromptHit: string;
  yourEstimateLabel: string;
  checkEstimateBtn: string;
  newChallengeBtn: string;
  heroCardsLabel: string;
  boardCardsLabel: string;
  discardMarkedLabel: string;
  deadCardsLabel: string;
  noneLabel: string;
  exactHitProbLabel: string;
  showdownEquityLabel: string;
  outsCombosLabel: string;
  rule42Label: string;
  potOddsLabel: string;
  decisionVerdictLabel: string;
  verdictCall: string;
  verdictFold: string;
  verdictMarginal: string;
  yourErrorLabel: string;
  accurateBadge: string;
  closeBadge: string;
  offBadge: string;
  statsAttempts: string;
  statsAccurate: string;
  statsAvgError: string;
  statsStreak: string;
  statsBestStreak: string;
  scenarioLabels: {
    scenario_flush_draw: string;
    scenario_oesd: string;
    scenario_set_trips: string;
    scenario_two_pair_top_pair: string;
    scenario_discard_flush: string;
    scenario_discard_oesd: string;
    scenario_discard_pair3: string;
    scenario_discard_twopair: string;
  };

  // Simulator
  simulatorHeading: string;
  simulatorSubheading: string;
  simModeHoldem: string;
  simModeDiscard: string;
  presetsLabel: string;
  presetNutFlush: string;
  presetAcesMultiway: string;
  presetOesdFlop: string;
  presetDiscardFlush: string;
  randomDealBtn: string;
  clearTableBtn: string;
  slotHeroLabel: string;
  slotBoardLabel: string;
  slotDeadLabel: string;
  discardToggleHint: string;
  iterationsLabel: string;
  runSimBtn: string;
  saveSimBtn: string;
  simSavedToast: string;
  winPctLabel: string;
  tiePctLabel: string;
  lossPctLabel: string;
  equityPctLabel: string;
  currentHandLabel: string;
  improveOutsLabel: string;
  nextCardImproveLabel: string;
  twoCardImproveLabel: string;
  chartTitle: string;
  chartSubtitle: string;
  chartHeroSeries: string;
  chartOppWinSeries: string;
  handCategories: Record<
    | 'high_card'
    | 'one_pair'
    | 'two_pair'
    | 'three_of_a_kind'
    | 'straight'
    | 'flush'
    | 'full_house'
    | 'four_of_a_kind'
    | 'straight_flush',
    string
  >;
  simErrors: {
    error_invalid_players: string;
    error_need_two_hero: string;
    error_need_five_hero: string;
    error_board_count: string;
    error_discard_count: string;
    error_duplicate_cards: string;
    error_not_enough_cards: string;
  };

  // Workspace Log & Notes
  savedPanelTitle: string;
  notesLabel: string;
  notesPlaceholder: string;
  recentSimsTitle: string;
  noRecentSims: string;
  loadSimBtn: string;
  deleteSimBtn: string;

  // Editorial SEO & FAQ & Gear & Disclaimer
  adLabel: string;
  gearHeading: string;
  gearSubheading: string;
  gearItems: GearItem[];
  guideHeading: string;
  guideSubheading: string;
  guideSections: GuideSection[];
  faqHeading: string;
  faqItems: FaqItem[];
  howToTitle: string;
  howToSteps: {name: string; text: string}[];
  disclaimerText: string;
  footerNote: string;
}
