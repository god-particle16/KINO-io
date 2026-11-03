/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Film, Tv, Sparkles } from 'lucide-react';
import { MediaCategory } from '../types/media.ts';

export interface PosterFallbackProps {
  title: string;
  category?: MediaCategory;
  releaseYear?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const PosterFallback: React.FC<PosterFallbackProps> = ({
  title,
  category = 'movie',
  releaseYear,
  size = 'md',
  className = '',
}) => {
  const renderIcon = () => {
    switch (category) {
      case 'tv':
        return (
          <Tv
            className={
              size === 'xs'
                ? 'w-3.5 h-3.5 text-indigo-400'
                : size === 'lg'
                ? 'w-8 h-8 text-indigo-400'
                : 'w-4 h-4 text-indigo-400'
            }
          />
        );
      case 'anime':
        return (
          <Sparkles
            className={
              size === 'xs'
                ? 'w-3.5 h-3.5 text-fuchsia-400'
                : size === 'lg'
                ? 'w-8 h-8 text-fuchsia-400'
                : 'w-4 h-4 text-fuchsia-400'
            }
          />
        );
      case 'movie':
      default:
        return (
          <Film
            className={
              size === 'xs'
                ? 'w-3.5 h-3.5 text-indigo-400'
                : size === 'lg'
                ? 'w-8 h-8 text-indigo-400'
                : 'w-4 h-4 text-indigo-400'
            }
          />
        );
    }
  };

  if (size === 'xs') {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center p-1 text-center bg-gradient-to-b from-[#181d2e] via-[#101322] to-[#070910] select-none ${className}`}
      >
        <div className="mb-0.5 shrink-0 flex items-center justify-center">
          {renderIcon()}
        </div>
        <span className="text-[9px] font-semibold text-slate-300 leading-tight text-center line-clamp-2 px-0.5 break-words max-w-full">
          {title}
        </span>
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#181d2e] via-[#101322] to-[#070910] select-none ${className}`}
      >
        <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mb-3 shadow-xl shadow-black/50 shrink-0">
          {renderIcon()}
        </div>
        <span className="text-base sm:text-xl font-bold text-slate-100 line-clamp-3 leading-snug max-w-full px-2 drop-shadow-md text-center">
          {title}
        </span>
        {releaseYear && (
          <span className="text-xs sm:text-sm text-slate-400 font-mono mt-2 tabular-nums">
            {releaseYear}
          </span>
        )}
      </div>
    );
  }

  // 'sm' and 'md' (default used in MediaCard)
  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-b from-[#181d2e] via-[#101322] to-[#070910] select-none ${className}`}
    >
      <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mb-2 shadow-md shadow-black/40 shrink-0">
        {renderIcon()}
      </div>
      <span className="text-xs font-semibold text-slate-200 line-clamp-2 leading-snug px-1 max-w-full break-words text-center">
        {title}
      </span>
      {releaseYear && (
        <span className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
          {releaseYear}
        </span>
      )}
    </div>
  );
};

export interface PosterImageProps {
  url?: string | null;
  title: string;
  category?: MediaCategory;
  releaseYear?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  imgClassName?: string;
}

export const PosterImage: React.FC<PosterImageProps> = ({
  url,
  title,
  category = 'movie',
  releaseYear,
  size = 'md',
  className = '',
  imgClassName = '',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [url]);

  const showFallback = !url || hasError;

  return (
    <div className={`relative w-full h-full overflow-hidden bg-[#0c0e15] ${className}`}>
      {/* Visible fallback layer at z-0 (no -z-10), visible when image is absent or failing */}
      <div className="absolute inset-0 z-0">
        <PosterFallback
          title={title}
          category={category}
          releaseYear={releaseYear}
          size={size}
        />
      </div>

      {!showFallback && (
        <img
          src={url}
          alt={title}
          referrerPolicy="no-referrer"
          loading="lazy"
          className={`relative z-10 w-full h-full object-cover ${imgClassName}`}
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
};
