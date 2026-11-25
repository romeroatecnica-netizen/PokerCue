import React from 'react';
import {getRank, getSuit, RANK_CHARS, SUIT_SYMBOLS} from '../engine/cards';

interface PlayingCardProps {
  card: number | null;
  size?: 'sm' | 'md' | 'lg';
  discarded?: boolean;
  dead?: boolean;
  emptyLabel?: string;
  onClick?: () => void;
  title?: string;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  size = 'md',
  discarded = false,
  dead = false,
  emptyLabel = '?',
  onClick,
  title,
}) => {
  const sizeClasses =
    size === 'sm'
      ? 'w-10 h-14 text-xs rounded-md'
      : size === 'lg'
        ? 'w-14 h-20 text-base rounded-lg'
        : 'w-12 h-16 text-sm rounded-lg';

  if (card === null || card < 0 || card > 51) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        title={title}
        className={`${sizeClasses} inline-flex items-center justify-center border border-dashed border-slate-300 bg-slate-50 text-slate-400 font-mono-tabular font-semibold select-none transition-colors ${
          onClick ? 'hover:border-slate-400 hover:bg-slate-100 cursor-pointer' : 'cursor-default'
        }`}
      >
        {emptyLabel}
      </button>
    );
  }

  const rank = RANK_CHARS[getRank(card)];
  const suitIdx = getSuit(card);
  const suitSymbol = SUIT_SYMBOLS[suitIdx];
  const isRed = suitIdx === 1 || suitIdx === 2;

  const baseBg = discarded
    ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-400/50'
    : dead
      ? 'bg-slate-100 border-slate-300 opacity-85'
      : 'bg-white border-slate-300';

  const textColor = dead
    ? 'text-slate-600'
    : isRed
      ? 'text-[#DC2626]'
      : 'text-slate-900';

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? {type: 'button' as const, onClick} : {})}
      title={title}
      className={`${sizeClasses} ${baseBg} ${textColor} relative inline-flex flex-col items-center justify-between py-1.5 px-1 border select-none font-mono-tabular font-bold leading-none transition-transform duration-150 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF]' : ''
      }`}
    >
      <span className="self-start leading-none">{rank}</span>
      <span className={size === 'sm' ? 'text-base leading-none' : 'text-xl leading-none'} aria-hidden="true">
        {suitSymbol}
      </span>
      <span className="self-end leading-none rotate-180">{rank}</span>
      {discarded && (
        <span className="absolute -top-2 inset-x-0.5 text-center bg-amber-600 text-white text-[9px] font-sans font-semibold tracking-tight py-0.5 rounded-sm leading-none">
          SWAP
        </span>
      )}
    </Tag>
  );
};
