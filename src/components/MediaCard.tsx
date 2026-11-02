/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Heart, Bookmark, Plus, Film, Tv, Sparkles } from 'lucide-react';
import { MediaItem } from '../types/media.ts';
import { RatingStars } from './RatingStars.tsx';
import { useMedia } from '../context/MediaContext.tsx';

interface MediaCardProps {
  item: MediaItem;
  showQuickProgress?: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item }) => {
  const { setViewingItem, toggleFavorite, toggleWatchlist, incrementSeason } = useMedia();

  const getCategoryIcon = () => {
    switch (item.category) {
      case 'movie':
        return <Film className="w-3 h-3 text-slate-400" />;
      case 'tv':
        return <Tv className="w-3 h-3 text-slate-400" />;
      case 'anime':
        return <Sparkles className="w-3 h-3 text-slate-400" />;
    }
  };

  const getCategoryLabel = () => {
    switch (item.category) {
      case 'movie':
        return 'Movie';
      case 'tv':
        return 'TV Series';
      case 'anime':
        return 'Anime';
    }
  };

  const getStatusLabel = () => {
    switch (item.status) {
      case 'watched':
        return 'Watched';
      case 'watching':
        return 'Watching';
      case 'watch_later':
        return 'Watch List';
      default:
        return item.status;
    }
  };

  // Season progress calculations
  let progressPercent = 0;
  let seasonText = '';
  if (item.category === 'tv' && item.totalSeasons) {
    const curSeason = item.currentSeason || 0;
    progressPercent = Math.min(100, Math.round((curSeason / item.totalSeasons) * 100));
    seasonText = `Season ${curSeason} of ${item.totalSeasons}`;
  } else if (item.category === 'anime' && item.animeTotalSeasons) {
    const curSeason = item.animeCurrentSeason || 0;
    progressPercent = Math.min(100, Math.round((curSeason / item.animeTotalSeasons) * 100));
    seasonText = `Season ${curSeason} of ${item.animeTotalSeasons}`;
  }

  const handleCardClick = () => {
    setViewingItem(item);
  };

  return (
    <div className="group relative flex flex-col bg-[#0c0e15] border border-white/[0.06] hover:border-indigo-500/40 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-950/20">
      {/* Poster Media Box (2:3 aspect ratio) */}
      <div
        onClick={handleCardClick}
        className="relative aspect-[2/3] w-full bg-[#12151f] overflow-hidden cursor-pointer"
      >
        {item.posterUrl ? (
          <img
            src={item.posterUrl}
            alt={item.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : null}

        {/* Fallback container with typography */}
        <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center p-4 text-center bg-gradient-to-b from-[#141824] to-[#0d1019]">
          <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-2 text-slate-400">
            {getCategoryIcon()}
          </div>
          <span className="text-xs font-semibold text-slate-300 line-clamp-2 leading-snug">
            {item.title}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
            {item.releaseYear}
          </span>
        </div>

        {/* Subtle scrim on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
          {/* Top action icons */}
          <div className="flex items-center justify-between w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(item.id);
              }}
              className={`p-1.5 rounded-md backdrop-blur-md transition-colors cursor-pointer ${
                item.isFavorite
                  ? 'bg-rose-500/25 text-rose-400 hover:bg-rose-500/35'
                  : 'bg-black/50 text-slate-300 hover:text-white hover:bg-black/70'
              }`}
              title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-rose-400' : ''}`} />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleWatchlist(item.id);
              }}
              className={`p-1.5 rounded-md backdrop-blur-md transition-colors cursor-pointer ${
                item.inWatchlist
                  ? 'bg-indigo-600/40 text-indigo-300 hover:bg-indigo-600/50'
                  : 'bg-black/50 text-slate-300 hover:text-white hover:bg-black/70'
              }`}
              title={item.inWatchlist ? 'In Watch List' : 'Add to Watch List'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${item.inWatchlist ? 'fill-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Progress bar at bottom of poster in indigo violet */}
        {progressPercent > 0 && item.status === 'watching' && (
          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/60">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Card Content & Zero-Pill Unboxed Metadata */}
      <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between">
        <div>
          {/* Title */}
          <button
            onClick={handleCardClick}
            className="text-left w-full text-sm font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1 cursor-pointer focus:outline-none"
            title={item.title}
          >
            {item.title}
          </button>

          {/* Unboxed inline metadata with subtle dot separators */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-normal mt-0.5">
            <span className="font-mono tabular-nums">{item.releaseYear}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{item.language}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{getCategoryLabel()}</span>
          </div>
        </div>

        {/* Footer: Rating, Status and/or Season */}
        <div className="pt-1.5 border-t border-white/[0.04] flex flex-col gap-1 text-xs">
          <div className="flex items-center justify-between gap-1">
            {item.rating > 0 ? (
              <RatingStars rating={item.rating} size="xs" showNumeric />
            ) : (
              <span className="text-[11px] text-slate-500">
                {getStatusLabel()}
              </span>
            )}

            {seasonText && (
              <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                {seasonText}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
