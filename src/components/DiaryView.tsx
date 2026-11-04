/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, RotateCcw, Trash2 } from 'lucide-react';
import { useMedia } from '../context/MediaContext.tsx';
import { RatingStars } from './RatingStars.tsx';
import { MediaCategory } from '../types/media.ts';
import { PosterImage } from './PosterImage.tsx';

interface FlattenedDiaryRow {
  uniqueKey: string;
  mediaItem: ReturnType<typeof useMedia>['items'][0];
  logId?: string;
  date: string; // YYYY-MM-DD
  rating: number;
  notes?: string;
  isRewatch?: boolean;
  seasonLogged?: string;
}

export const DiaryView: React.FC = () => {
  const { items, setViewingItem, openAddModalWithPreset, unwatchItem, updateItem } = useMedia();

  const [categoryFilter, setCategoryFilter] = useState<'all' | MediaCategory>('all');

  const handleRemoveEntry = (e: React.MouseEvent, row: FlattenedDiaryRow) => {
    e.stopPropagation();
    const item = items.find((i) => i.id === row.mediaItem.id);
    if (!item) return;

    const logs = item.diaryLogs || [];
    if (logs.length <= 1) {
      unwatchItem(item.id);
    } else {
      const remainingLogs = row.logId
        ? logs.filter((l) => l.id !== row.logId)
        : logs.slice(1);

      if (remainingLogs.length === 0) {
        unwatchItem(item.id);
      } else {
        const latest = remainingLogs[0];
        const updated = {
          ...item,
          diaryLogs: remainingLogs,
          dateWatched: latest.watchedDate,
          rating: latest.rating,
          notes: latest.notes,
        };
        updateItem(updated);
      }
    }
  };

  const allDiaryRows: FlattenedDiaryRow[] = [];
  items.forEach((item) => {
    if (item.diaryLogs && item.diaryLogs.length > 0) {
      item.diaryLogs.forEach((log) => {
        allDiaryRows.push({
          uniqueKey: `log-${item.id}-${log.id}`,
          mediaItem: item,
          logId: log.id,
          date: log.watchedDate,
          rating: log.rating,
          notes: log.notes,
          isRewatch: log.isRewatch,
          seasonLogged: log.seasonLogged || (item.category !== 'movie' ? `Season ${item.currentSeason || item.animeCurrentSeason || 1}` : undefined),
        });
      });
    } else if (item.dateWatched) {
      allDiaryRows.push({
        uniqueKey: `single-${item.id}`,
        mediaItem: item,
        logId: undefined,
        date: item.dateWatched,
        rating: item.rating,
        notes: item.notes,
        seasonLogged: item.category !== 'movie' ? `Season ${item.currentSeason || item.animeCurrentSeason || 1}` : undefined,
      });
    }
  });

  allDiaryRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredRows = allDiaryRows.filter((row) => {
    return categoryFilter === 'all' || row.mediaItem.category === categoryFilter;
  });

  const groupedByMonth: { [monthKey: string]: FlattenedDiaryRow[] } = {};
  filteredRows.forEach((row) => {
    if (!row.date) return;
    const d = new Date(row.date);
    const monthKey = isNaN(d.getTime())
      ? 'Undated'
      : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groupedByMonth[monthKey]) {
      groupedByMonth[monthKey] = [];
    }
    groupedByMonth[monthKey].push(row);
  });

  const monthKeys = Object.keys(groupedByMonth);

  return (
    <div className="space-y-8 pb-16">
      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4 text-xs">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1">
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
      </div>

      {/* Diary Content Grouped by Month */}
      {filteredRows.length === 0 ? (
        <div className="p-12 text-center bg-[#0c0e15] border border-white/[0.04] rounded-xl space-y-3">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No diary entries found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Log movies, tv seasons, or anime seasons you've watched along with star ratings and reviews to populate your Letterboxd-style timeline.
          </p>
          <button
            onClick={() => openAddModalWithPreset({ status: 'watched' })}
            className="mt-2 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
          >
            Log First Diary Entry
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {monthKeys.map((month) => {
            const monthEntries = groupedByMonth[month];
            return (
              <div key={month} className="space-y-3">
                {/* Month Group Header */}
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <h2 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">
                    {month}
                  </h2>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {monthEntries.length} {monthEntries.length === 1 ? 'entry' : 'entries'}
                  </span>
                </div>

                {/* Table-like Timeline Rows */}
                <div className="space-y-2.5">
                  {monthEntries.map((row) => {
                    const parsedDate = new Date(row.date);
                    const dayString = isNaN(parsedDate.getTime())
                      ? '—'
                      : parsedDate.toLocaleDateString('en-US', { day: '2-digit', weekday: 'short' });

                    return (
                      <div
                        key={row.uniqueKey}
                        onClick={() => setViewingItem(row.mediaItem)}
                        className="p-3 bg-[#0c0e15] hover:bg-[#111420] border border-white/[0.05] hover:border-indigo-500/30 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        {/* Left: Date, Thumbnail & Details */}
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                          {/* Day Column */}
                          <div className="w-12 text-left sm:text-center shrink-0 pt-0.5 sm:pt-0">
                            <span className="font-mono text-xs font-semibold text-slate-300 block tabular-nums">
                              {dayString}
                            </span>
                          </div>

                          {/* Poster Thumbnail */}
                          <div className="w-11 h-16 bg-slate-800 rounded-md overflow-hidden shrink-0 border border-white/[0.06]">
                            <PosterImage
                              url={row.mediaItem.posterUrl}
                              title={row.mediaItem.title}
                              category={row.mediaItem.category}
                              releaseYear={row.mediaItem.releaseYear}
                              size="xs"
                              className="w-full h-full"
                              imgClassName="group-hover:scale-105 transition-transform"
                            />
                          </div>

                          {/* Title and Unboxed Metadata */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors">
                                {row.mediaItem.title}
                              </span>
                              <span className="text-xs font-mono tabular-nums text-slate-400">
                                {row.mediaItem.releaseYear}
                              </span>
                            </div>

                            {/* Unboxed Metadata row */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mt-1">
                              <span>{row.mediaItem.language}</span>
                              <span aria-hidden="true">·</span>
                              <span className="capitalize">{row.mediaItem.category === 'tv' ? 'TV' : row.mediaItem.category}</span>

                              {row.seasonLogged && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-slate-300 font-medium">
                                    {row.seasonLogged}
                                  </span>
                                </>
                              )}

                              {row.isRewatch && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-indigo-400 inline-flex items-center gap-0.5 text-[11px]">
                                    <RotateCcw className="w-2.5 h-2.5" /> Rewatch
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Diary Note / Review snippet */}
                            {row.notes && (
                              <p className="text-xs text-slate-300 mt-1 line-clamp-1 italic font-normal">
                                "{row.notes}"
                              </p>
                            )}

                            {/* MOBILE ONLY: Place star ratings DOWN below on mobile */}
                            <div className="sm:hidden mt-2 pt-1.5 border-t border-white/[0.04] flex items-center justify-between">
                              <span className="text-[11px] text-slate-500">Your Rating</span>
                              <div className="flex items-center gap-2.5">
                                <RatingStars rating={row.rating} size="sm" showNumeric />
                                <button
                                  type="button"
                                  onClick={(e) => handleRemoveEntry(e, row)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                  title="Remove diary entry"
                                  aria-label="Remove diary entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* DESKTOP ONLY: Star Ratings positioned on the right */}
                        <div className="hidden sm:flex shrink-0 items-center justify-end pl-3 gap-2.5">
                          <RatingStars rating={row.rating} size="sm" showNumeric />
                          <button
                            type="button"
                            onClick={(e) => handleRemoveEntry(e, row)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                            title="Remove diary entry"
                            aria-label="Remove diary entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
