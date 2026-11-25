import React from 'react';
import {CategoryDistributionItem} from '../engine/simulator';
import {TranslationBundle} from '../i18n/types';

interface HandDistributionSvgProps {
  distribution: CategoryDistributionItem[];
  t: TranslationBundle;
}

export const HandDistributionSvg: React.FC<HandDistributionSvgProps> = ({distribution, t}) => {
  // Display from Straight Flush down to High Card for clean poker hierarchy
  const ordered = [...distribution].reverse();
  const maxPct = Math.max(
    25,
    ...ordered.map((d) => Math.max(d.heroPct, d.opponentWinPct)),
  );
  const axisMax = Math.min(100, Math.ceil(maxPct / 10) * 10);

  const width = 680;
  const rowHeight = 32;
  const topPad = 24;
  const bottomPad = 28;
  const leftLabelWidth = 152;
  const rightValueWidth = 96;
  const plotWidth = width - leftLabelWidth - rightValueWidth;
  const height = topPad + ordered.length * rowHeight + bottomPad;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(axisMax * f));

  return (
    <div className="w-full" dir="ltr">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{t.chartTitle}</h3>
          <p className="text-xs text-slate-500">{t.chartSubtitle}</p>
        </div>
        <div className="flex items-center gap-5 text-xs font-medium text-slate-700">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#047857] inline-block" aria-hidden="true" />
            {t.chartHeroSeries}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#1E40AF] inline-block" aria-hidden="true" />
            {t.chartOppWinSeries}
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[480px] h-auto block"
          role="img"
          aria-label={t.chartTitle}
        >
          <title>{t.chartTitle}</title>
          <desc>{t.chartSubtitle}</desc>

          {/* Vertical gridlines and top axis labels */}
          {ticks.map((tick) => {
            const x = leftLabelWidth + (tick / axisMax) * plotWidth;
            return (
              <g key={tick}>
                <line
                  x1={x}
                  y1={topPad - 4}
                  x2={x}
                  y2={height - bottomPad + 4}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray={tick === 0 ? undefined : '3 3'}
                />
                <text
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#64748B"
                  fontSize="11"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* Horizontal baseline */}
          <line
            x1={leftLabelWidth}
            y1={topPad - 4}
            x2={leftLabelWidth}
            y2={height - bottomPad + 4}
            stroke="#CBD5E1"
            strokeWidth="1"
          />

          {ordered.map((item, idx) => {
            const y = topPad + idx * rowHeight;
            const heroW = Math.max(0, (item.heroPct / axisMax) * plotWidth);
            const oppW = Math.max(0, (item.opponentWinPct / axisMax) * plotWidth);
            const label = t.handCategories[item.key];

            return (
              <g key={item.key}>
                {/* Subtle alternating stripe */}
                {idx % 2 === 0 && (
                  <rect
                    x={0}
                    y={y}
                    width={width}
                    height={rowHeight}
                    fill="#F8FAFC"
                  />
                )}

                <text
                  x={leftLabelWidth - 10}
                  y={y + rowHeight / 2 + 4}
                  textAnchor="end"
                  fill="#0F172A"
                  fontSize="12"
                  fontWeight={item.heroPct >= 5 ? '600' : '400'}
                  fontFamily="Inter, sans-serif"
                >
                  {label}
                </text>

                {/* Hero bar */}
                <rect
                  x={leftLabelWidth}
                  y={y + 6}
                  width={heroW}
                  height={9}
                  rx="2"
                  fill="#047857"
                />

                {/* Opponent winning bar */}
                <rect
                  x={leftLabelWidth}
                  y={y + 17}
                  width={oppW}
                  height={9}
                  rx="2"
                  fill="#1E40AF"
                  fillOpacity="0.85"
                />

                {/* Tabular percentage readouts */}
                <text
                  x={width - 6}
                  y={y + rowHeight / 2 + 4}
                  textAnchor="end"
                  fill="#334155"
                  fontSize="11"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {item.heroPct.toFixed(1)}% / {item.opponentWinPct.toFixed(1)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
