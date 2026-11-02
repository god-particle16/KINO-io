/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, Film, Tv, Sparkles, Check } from 'lucide-react';
import { useMedia } from '../context/MediaContext.tsx';
import { tmdbService } from '../services/tmdbService.ts';
import { MediaCategory, MediaItem, TMDBMediaResult, WatchStatus } from '../types/media.ts';

export const SearchModal: React.FC = () => {
  const {
    isSearchModalOpen,
    setIsSearchModalOpen,
    items,
    setViewingItem,
    openAddModalWithPreset,
    setIsTMDBModalOpen,
    addItem,
  } = useMedia();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | MediaCategory>('all');
  const [tmdbResults, setTmdbResults] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setTmdbResults([]);
      setError(null);
    }
  }, [isSearchModalOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !isSearchModalOpen) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsSearchModalOpen(true);
        }
      } else if (e.key === 'Escape' && isSearchModalOpen) {
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen, setIsSearchModalOpen]);

  useEffect(() => {
    let isCancelled = false;
    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!query.trim()) {
          const typeParam = selectedCategory === 'all' ? 'all' : selectedCategory === 'movie' ? 'movie' : 'tv';
          let popular = await tmdbService.trending(typeParam, 'week');
          if (selectedCategory === 'anime') {
            popular = popular.filter((i) => i.category === 'anime');
          }
          if (!isCancelled) {
            setTmdbResults(popular.slice(0, 15));
          }
        } else {
          const results = await tmdbService.searchMulti(query);
          const filtered =
            selectedCategory === 'all'
              ? results
              : results.filter((r) => r.category === selectedCategory);
          if (!isCancelled) {
            setTmdbResults(filtered);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message || 'Failed to connect to TMDB service.');
          setTmdbResults([]);
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 200);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [query, selectedCategory, retryTrigger]);

  if (!isSearchModalOpen) return null;

  const libraryMatches = items.filter((item) => {
    const matchQuery =
      !query.trim() ||
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      (item.originalTitle && item.originalTitle.toLowerCase().includes(query.toLowerCase())) ||
      item.language.toLowerCase().includes(query.toLowerCase());
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    return matchQuery && matchCat;
  });

  const isAlreadyInLibrary = (tmdbItem: MediaItem) => {
    return items.some(
      (i) =>
        i.id === tmdbItem.id ||
        (i.title.toLowerCase() === tmdbItem.title.toLowerCase() &&
          i.releaseYear === tmdbItem.releaseYear)
    );
  };

  const handleQuickAdd = (tmdbItem: MediaItem, targetStatus: WatchStatus) => {
    addItem({
      ...tmdbItem,
      status: targetStatus,
      rating: targetStatus === 'watched' ? 4.5 : 0,
      inWatchlist: targetStatus === 'watch_later',
    });
  };

  const formatStatus = (s: WatchStatus) => {
    switch (s) {
      case 'watched':
        return 'Watched';
      case 'watching':
        return 'Watching';
      case 'watch_later':
        return 'Watch List';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:p-10 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-[#0b0d14] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top search bar input */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] gap-3 bg-[#0e111a]">
          <Search className="w-4 h-4 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, TV series, anime (e.g. Vikram Vedha, Severance, Frieren)..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsSearchModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Close search modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar & Quick Category Selectors */}
        <div className="px-4 py-2 border-b border-white/[0.04] bg-[#090b10] flex items-center justify-between gap-3 text-xs">
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
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/35 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Results Scrollable Area */}
        <div className="overflow-y-auto flex-1 p-4 space-y-6">
          {/* Section 1: In Library Matches */}
          {libraryMatches.length > 0 && (
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                Already In Your Library ({libraryMatches.length})
              </div>
              <div className="space-y-1.5">
                {libraryMatches.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setIsSearchModalOpen(false);
                      setViewingItem(item);
                    }}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-12 bg-slate-800 rounded overflow-hidden shrink-0">
                        {item.posterUrl ? (
                          <img
                            src={item.posterUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                            {item.category[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors truncate">
                          {item.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <span className="font-mono tabular-nums">{item.releaseYear}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.language}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatStatus(item.status)}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 font-mono tabular-nums px-2">
                      {item.rating > 0 ? `★ ${item.rating.toFixed(1)}` : 'Unrated'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: TMDB Global & Regional Catalog */}
          <div>
            {error ? (
              <div className="py-6 px-4 text-center bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-3">
                <p className="text-xs text-rose-300 font-medium leading-relaxed">{error}</p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setRetryTrigger((prev) => prev + 1)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow-md cursor-pointer transition-colors"
                  >
                    Retry Search
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchModalOpen(false);
                      setIsTMDBModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                  >
                    TMDB Settings
                  </button>
                </div>
              </div>
            ) : isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">Searching global records...</div>
            ) : tmdbResults.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-slate-400">
                  {query.trim() ? 'No matching titles found.' : 'Type a title to search TMDB.'}
                </p>
                {query.trim() && (
                  <button
                    onClick={() => {
                      setIsSearchModalOpen(false);
                      openAddModalWithPreset({ title: query });
                    }}
                    className="mt-3 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add "{query}" Manually</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {tmdbResults.map((result) => {
                  const alreadySaved = isAlreadyInLibrary(result);
                  return (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] transition-colors cursor-pointer group"
                      onClick={() => {
                        setIsSearchModalOpen(false);
                        setViewingItem(result);
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <div className="w-10 h-14 bg-slate-800 rounded overflow-hidden shrink-0">
                          {result.posterUrl ? (
                            <img
                              src={result.posterUrl}
                              alt={result.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                              {result.category === 'movie' ? (
                                <Film className="w-4 h-4" />
                              ) : result.category === 'tv' ? (
                                <Tv className="w-4 h-4" />
                              ) : (
                                <Sparkles className="w-4 h-4" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors truncate">
                              {result.title}
                            </span>
                            {result.originalTitle && result.originalTitle !== result.title && (
                              <span className="text-xs text-slate-400 truncate">
                                ({result.originalTitle})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                            <span className="font-mono tabular-nums">{result.releaseYear}</span>
                            <span aria-hidden="true">·</span>
                            <span>{result.language}</span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">{result.category === 'tv' ? 'TV' : result.category}</span>
                            {result.totalSeasons && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{result.totalSeasons} {result.totalSeasons === 1 ? 'Season' : 'Seasons'}</span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1 mt-1">
                            {result.overview}
                          </p>
                        </div>
                      </div>

                      {/* Add button or In-Library status */}
                      <div
                        className="shrink-0 flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {alreadySaved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400/90 font-medium px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded">
                            <Check className="w-3 h-3" />
                            <span>Logged</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                handleQuickAdd(result, 'watch_later');
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-white/[0.06] hover:bg-indigo-950/30 border border-white/[0.06] hover:border-indigo-500/30 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                              title="Add to Watch List"
                            >
                              Watch List
                            </button>
                            <button
                              onClick={() => {
                                setIsSearchModalOpen(false);
                                openAddModalWithPreset({
                                  title: result.title,
                                  originalTitle: result.originalTitle,
                                  category: result.category,
                                  releaseYear: result.releaseYear,
                                  language: result.language,
                                  genres: result.genres,
                                  overview: result.overview,
                                  posterUrl: result.posterUrl,
                                  status: 'watching',
                                  rating: 4.0,
                                  currentSeason: 1,
                                  totalSeasons: result.totalSeasons || 1,
                                  animeCurrentSeason: 1,
                                  animeTotalSeasons: result.totalSeasons || 1,
                                });
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-md transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap shadow-sm shadow-indigo-600/30"
                              title="Customize & Log"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Log</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Shortcut to Manual Add Form */}
        <div className="px-4 py-3 border-t border-white/[0.08] bg-[#090a0f] flex items-center justify-end text-xs">
          <button
            onClick={() => {
              setIsSearchModalOpen(false);
              openAddModalWithPreset({ title: query });
            }}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Title Manually</span>
          </button>
        </div>
      </div>
    </div>
  );
};
