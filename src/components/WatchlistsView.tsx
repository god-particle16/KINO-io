/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bookmark, ArrowUpDown, Sparkles } from 'lucide-react';
import { useMedia } from '../context/MediaContext.tsx';
import { MediaCard } from './MediaCard.tsx';
import { MediaCategory } from '../types/media.ts';
import { PickMovieButton } from './PickMovieButton.tsx';

export const WatchlistsView: React.FC = () => {
  const {
    items,
    openAddModalWithPreset,
    setIsSearchModalOpen,
  } = useMedia();

  const [categoryFilter, setCategoryFilter] = useState<'all' | MediaCategory>('all');
  const [sortOrder, setSortOrder] = useState<'oldest_to_newest' | 'newest_to_oldest'>('oldest_to_newest');

  // Watch List items strictly
  const watchListItems = items.filter((item) => item.inWatchlist || item.status === 'watch_later');

  const filteredItems = watchListItems.filter((item) => {
    return categoryFilter === 'all' || item.category === categoryFilter;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const timeA = a.dateLogged ? new Date(a.dateLogged).getTime() : 0;
    const timeB = b.dateLogged ? new Date(b.dateLogged).getTime() : 0;
    if (sortOrder === 'oldest_to_newest') {
      if (timeA !== timeB) return timeA - timeB;
      return a.releaseYear - b.releaseYear;
    } else {
      if (timeA !== timeB) return timeB - timeA;
      return b.releaseYear - a.releaseYear;
    }
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Category buttons in Indigo Violet */}
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'movie', label: 'Movies' },
              { id: 'tv', label: 'TV Series' },
              { id: 'anime', label: 'Anime' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === cat.id
                  ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/35 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filter Button: Oldest to Newest */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setSortOrder((prev) =>
                prev === 'oldest_to_newest' ? 'newest_to_oldest' : 'oldest_to_newest'
              )
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              sortOrder === 'oldest_to_newest'
                ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/35 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-white/[0.08] hover:bg-white/[0.04]'
            }`}
            title="Sort: Oldest to Newest added"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortOrder === 'oldest_to_newest' ? 'Oldest to Newest' : 'Newest to Oldest'}</span>
          </button>
        </div>
      </div>

      {/* Below Filter Section: Glowing Pick a Movie for Me action card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#0d1020]/80 via-[#10132b]/60 to-transparent border border-white/[0.08] shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Can't decide what to watch?</div>
            <div className="text-[11px] text-slate-400">Let Kino pick a random movie, series, or anime from your Watch List with 3D animation.</div>
          </div>
        </div>

        <PickMovieButton size="sm" />
      </div>

      {/* Items Grid */}
      {sortedItems.length === 0 ? (
        <div className="p-12 text-center bg-[#0c0e15] border border-white/[0.04] rounded-xl space-y-3">
          <Bookmark className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">
            Your Watch List is empty
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Save movies, series, or anime to your watch list by clicking the bookmark icon on any title.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              Search TMDB Catalog
            </button>
            <button
              onClick={() =>
                openAddModalWithPreset({
                  inWatchlist: true,
                  status: 'watch_later',
                })
              }
              className="px-3.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 rounded-lg text-xs font-medium cursor-pointer"
            >
              Add Custom Title
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {sortedItems.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
