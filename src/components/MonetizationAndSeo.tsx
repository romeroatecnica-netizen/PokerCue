import React, {useState} from 'react';
import {ChevronDown, ExternalLink} from 'lucide-react';
import {GearItem, TranslationBundle} from '../i18n/types';

export const MediaNetAdSlot: React.FC<{
  slotId: string;
  label: string;
  variant: 'leaderboard' | 'bottom';
}> = ({slotId, label, variant}) => {
  const minHeightClass =
    variant === 'leaderboard' ? 'min-h-[90px] sm:min-h-[100px]' : 'min-h-[120px] sm:min-h-[250px]';

  return (
    <aside
      className={`no-print w-full bg-slate-100/80 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center px-4 py-3 ${minHeightClass}`}
      aria-label={label}
      data-ad-provider="media-net"
      data-ad-slot={slotId}
    >
      {/* Media.net Ad Slot: Replace inner container with your Media.net <div id="..."> + mnet script tag */}
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <div id={slotId} className="w-full max-w-[728px] flex items-center justify-center text-xs text-slate-400 mt-1">
        Media.net · {variant === 'leaderboard' ? '728×90 / Responsive' : '970×250 / Responsive'}
      </div>
    </aside>
  );
};

const GearIllustration: React.FC<{category: GearItem['category']}> = ({category}) => {
  if (category === 'book') {
    return (
      <svg viewBox="0 0 40 40" className="w-8 h-8 text-[#1E40AF]" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="M8 7h18a3 3 0 0 1 3 3v23H11a3 3 0 0 1-3-3V7z" />
        <path d="M11 27h18" />
        <path d="M14 13h10M14 18h7" />
      </svg>
    );
  }
  if (category === 'mat') {
    return (
      <svg viewBox="0 0 40 40" className="w-8 h-8 text-[#047857]" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <rect x="4" y="10" width="32" height="20" rx="10" />
        <rect x="9" y="14" width="22" height="12" rx="6" strokeDasharray="3 2" />
      </svg>
    );
  }
  if (category === 'cards') {
    return (
      <svg viewBox="0 0 40 40" className="w-8 h-8 text-slate-800" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <rect x="8" y="8" width="16" height="22" rx="2.5" />
        <rect x="16" y="10" width="16" height="22" rx="2.5" fill="#FFFFFF" />
        <path d="M24 18c-1.5 2-3.5 3.5-3.5 5.2a2 2 0 0 0 2 2c.6 0 1.1-.2 1.5-.6.4.4.9.6 1.5.6a2 2 0 0 0 2-2c0-1.7-2-3.2-3.5-5.2z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" className="w-8 h-8 text-[#D97706]" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <circle cx="20" cy="22" r="12" />
      <path d="M16 6h8M20 6v4M20 22l5-4M20 15v7" />
    </svg>
  );
};

export const PracticeGearSection: React.FC<{t: TranslationBundle}> = ({t}) => {
  return (
    <section className="no-print bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-7">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900">{t.gearHeading}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.gearSubheading}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {t.gearItems.map((item) => (
          <a
            key={item.title}
            href={item.href}
            target="_blank"
            rel="sponsored nofollow noopener"
            className="group flex flex-col justify-between p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition-colors"
          >
            <div>
              <div className="mb-3">
                <GearIllustration category={item.category} />
              </div>
              <div className="text-xs font-medium text-slate-500">{item.subtitle}</div>
              <h3 className="mt-0.5 text-sm font-bold text-slate-900 group-hover:text-[#1E40AF]">
                {item.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                {item.description}
              </p>
            </div>
            <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#1E40AF]">
              {item.cta}
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};

export const EditorialGuideAndFaq: React.FC<{t: TranslationBundle}> = ({t}) => {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  return (
    <div className="space-y-8">
      {/* Editorial SEO Guide */}
      <section id="guide" aria-labelledby="guide-heading" className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-7">
        <div className="max-w-3xl mb-6">
          <h2 id="guide-heading" className="text-xl sm:text-2xl font-bold text-slate-900">
            {t.guideHeading}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">{t.guideSubheading}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {t.guideSections.map((sec) => (
            <article key={sec.title} className="pt-4 border-t border-slate-200">
              <h3 className="text-base font-bold text-slate-900">{sec.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{sec.body}</p>
              <p className="mt-2.5 text-xs font-mono-tabular font-semibold text-[#047857]">
                {sec.highlight}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Interactive FAQ Accordion */}
      <section id="faq" aria-labelledby="faq-heading" className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-7">
        <h2 id="faq-heading" className="text-xl font-bold text-slate-900 mb-4">
          {t.faqHeading}
        </h2>

        <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
          {t.faqItems.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-slate-900 hover:text-[#1E40AF] transition-colors cursor-pointer"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 text-slate-500 transition-transform duration-150 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="pb-4 text-sm leading-relaxed text-slate-600">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-xs leading-relaxed text-slate-500">{t.disclaimerText}</p>
      </section>
    </div>
  );
};
