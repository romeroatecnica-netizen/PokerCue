import React, {useRef, useState} from 'react';
import {Download, Link2, Printer, RotateCcw, Trash2, Upload} from 'lucide-react';
import {formatCardPretty} from '../engine/cards';
import {TranslationBundle} from '../i18n/types';
import {
  exportStateAsJson,
  PokerCuePersistedState,
  sanitizePersistedState,
  SavedSimulationRecord,
} from '../storage/localStore';

interface LocalWorkspacePanelProps {
  t: TranslationBundle;
  state: PokerCuePersistedState;
  shareUrl: string;
  onUpdateNotes: (notes: string) => void;
  onImportState: (next: PokerCuePersistedState) => void;
  onResetStats: () => void;
  onLoadSimulation: (record: SavedSimulationRecord) => void;
  onDeleteSimulation: (id: string) => void;
}

export const LocalWorkspacePanel: React.FC<LocalWorkspacePanelProps> = ({
  t,
  state,
  shareUrl,
  onUpdateNotes,
  onImportState,
  onResetStats,
  onLoadSimulation,
  onDeleteSimulation,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusMsg, setStatusMsg] = useState<{text: string; ok: boolean} | null>(null);

  const showToast = (text: string, ok = true) => {
    setStatusMsg({text, ok});
    setTimeout(() => setStatusMsg(null), 2600);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(t.linkCopied, true);
    } catch {
      showToast(shareUrl, true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const sanitized = sanitizePersistedState(parsed);
        if (!sanitized) {
          showToast(t.importError, false);
          return;
        }
        onImportState(sanitized);
        showToast(t.importSuccess, true);
      } catch {
        showToast(t.importError, false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <section className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-7 print-container">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-900">{t.savedPanelTitle}</h2>

        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Link2 className="w-3.5 h-3.5" />
            {t.copyLink}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            {t.printSummary}
          </button>

          <button
            type="button"
            onClick={() => exportStateAsJson(state)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            {t.exportJson}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            {t.importJson}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={onResetStats}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#DC2626] bg-white border border-slate-300 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.clearStorage}
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`mt-3 text-xs font-semibold ${
            statusMsg.ok ? 'text-[#047857]' : 'text-[#DC2626]'
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
        {/* Saved Simulations */}
        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">{t.recentSimsTitle}</h3>
          {state.savedSimulations.length === 0 ? (
            <p className="text-sm text-slate-500 py-3">{t.noRecentSims}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-semibold">{t.slotHeroLabel}</th>
                    <th className="py-2 pr-3 font-semibold">{t.slotBoardLabel}</th>
                    <th className="py-2 pr-3 font-semibold tabular-nums">{t.playersCountLabel}</th>
                    <th className="py-2 pr-3 font-semibold tabular-nums">{t.equityPctLabel}</th>
                    <th className="no-print py-2 text-right font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {state.savedSimulations.map((sim) => (
                    <tr key={sim.id} className="hover:bg-slate-50">
                      <td className="py-2.5 pr-3 font-mono-tabular font-semibold text-slate-900 whitespace-nowrap">
                        {sim.heroCards.map((c) => formatCardPretty(c)).join(' ')}
                      </td>
                      <td className="py-2.5 pr-3 font-mono-tabular text-slate-600 whitespace-nowrap">
                        {sim.mode === 'holdem'
                          ? sim.boardCards.length > 0
                            ? sim.boardCards.map((c) => formatCardPretty(c)).join(' ')
                            : 'Preflop'
                          : `Swap ${sim.discardIndices.length}`}
                      </td>
                      <td className="py-2.5 pr-3 font-mono-tabular text-slate-700">
                        {sim.players}
                      </td>
                      <td className="py-2.5 pr-3 font-mono-tabular font-bold text-[#047857]">
                        {sim.equityPct.toFixed(1)}%
                      </td>
                      <td className="no-print py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onLoadSimulation(sim)}
                          className="text-[#1E40AF] font-semibold hover:underline mr-3 cursor-pointer"
                        >
                          {t.loadSimBtn}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSimulation(sim.id)}
                          aria-label={t.deleteSimBtn}
                          className="text-slate-400 hover:text-[#DC2626] align-middle cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Local Notes */}
        <div className="lg:col-span-5 space-y-2">
          <label htmlFor="local-study-notes" className="block text-sm font-semibold text-slate-800">
            {t.notesLabel}
          </label>
          <textarea
            id="local-study-notes"
            rows={4}
            value={state.notes}
            onChange={(e) => onUpdateNotes(e.target.value)}
            placeholder={t.notesPlaceholder}
            className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#1E40AF]"
          />
        </div>
      </div>
    </section>
  );
};
