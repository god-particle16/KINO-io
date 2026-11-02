/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, Dices } from 'lucide-react';
import { useMedia } from '../context/MediaContext.tsx';

interface PickMovieButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PickMovieButton: React.FC<PickMovieButtonProps> = ({
  className = '',
  size = 'md',
}) => {
  const { setIsRandomPickerOpen } = useMedia();

  const sizeClasses =
    size === 'sm'
      ? 'px-4 py-2 text-xs gap-2'
      : size === 'lg'
      ? 'px-6 py-3 text-sm sm:text-base gap-3'
      : 'px-5 py-2.5 text-xs sm:text-sm gap-2.5';

  return (
    <div className={`relative group inline-flex items-center ${className}`}>
      {/* Animated glowing gradient halo - reduced glow by 50% */}
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-500/50 via-indigo-500/50 to-pink-500/50 opacity-25 blur-xs group-hover:opacity-40 transition duration-700 group-hover:duration-200 pointer-events-none" />

      {/* Secondary soft ambient glow - reduced by 50% */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/40 to-fuchsia-500/40 opacity-20 blur-xs group-hover:opacity-30 transition duration-300 pointer-events-none" />

      <button
        type="button"
        onClick={() => setIsRandomPickerOpen(true)}
        className={`relative flex items-center justify-center rounded-xl bg-gradient-to-r from-[#0d101d] via-[#12162a] to-[#15102a] hover:from-[#13182b] hover:via-[#191f3b] hover:to-[#1e173b] text-white font-semibold border border-indigo-400/20 hover:border-indigo-300/40 shadow-[0_0_6px_rgba(99,102,241,0.12)] hover:shadow-[0_0_10px_rgba(168,85,247,0.2)] transition-all cursor-pointer active:scale-95 whitespace-nowrap ${sizeClasses}`}
        title="Randomly pick a movie, series, or anime from your watch list with 3D animated reveal"
      >
        <Sparkles className="w-4 h-4 text-amber-300/80 animate-pulse shrink-0" />
        <span className="tracking-wide font-medium text-slate-100 group-hover:text-white transition-colors">
          Pick a movie for me
        </span>
        <Dices className="w-4 h-4 text-indigo-400/80 group-hover:rotate-45 transition-transform duration-300 shrink-0" />
      </button>
    </div>
  );
};
