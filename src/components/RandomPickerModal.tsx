/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Sparkles,
  Dices,
  Film,
  Tv,
  Star,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ExternalLink,
  RotateCw,
} from 'lucide-react';
import { useMedia } from '../context/MediaContext.tsx';
import { MediaItem } from '../types/media.ts';

interface PickResult {
  movie: MediaItem | null;
  tv: MediaItem | null;
  anime: MediaItem | null;
}

export const RandomPickerModal: React.FC = () => {
  const {
    isRandomPickerOpen,
    setIsRandomPickerOpen,
    items,
    setViewingItem,
    updateItem,
    logDiaryEntry,
  } = useMedia();

  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0); // 0: Movie, 1: TV Series, 2: Anime
  const [isSpinning, setIsSpinning] = useState(false);
  const [picks, setPicks] = useState<PickResult>({ movie: null, tv: null, anime: null });
  const [justMarkedWatchedId, setJustMarkedWatchedId] = useState<string | null>(null);

  // Touch swipe handling for mobile devices
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    if (distance > 35) {
      setActiveCategoryIndex((prev) => (prev + 1) % 3);
    } else if (distance < -35) {
      setActiveCategoryIndex((prev) => (prev > 0 ? prev - 1 : 2));
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  // Watch list pools
  const watchlistItems = useMemo(
    () => items.filter((item) => item.inWatchlist || item.status === 'watch_later'),
    [items]
  );

  // Pick random item for a category (from watchlist first, fallback to all items)
  const getRandomForCategory = useCallback(
    (category: 'movie' | 'tv' | 'anime', currentId?: string): MediaItem | null => {
      let pool = watchlistItems.filter((i) => i.category === category);
      if (pool.length === 0) {
        pool = items.filter((i) => i.category === category);
      }
      if (pool.length === 0) return null;

      // Filter out current if more than 1 available
      if (pool.length > 1 && currentId) {
        pool = pool.filter((i) => i.id !== currentId);
      }

      const randomIndex = Math.floor(Math.random() * pool.length);
      return pool[randomIndex] || null;
    },
    [watchlistItems, items]
  );

  // Perform the random roll with 3D rotation animation
  const rollPicks = useCallback(() => {
    setIsSpinning(true);
    setJustMarkedWatchedId(null);

    // After animation halfway point, swap the picks
    setTimeout(() => {
      setPicks((prev) => ({
        movie: getRandomForCategory('movie', prev.movie?.id),
        tv: getRandomForCategory('tv', prev.tv?.id),
        anime: getRandomForCategory('anime', prev.anime?.id),
      }));
    }, 350);

    // Settle 3D spin rotation
    setTimeout(() => {
      setIsSpinning(false);
    }, 700);
  }, [getRandomForCategory]);

  // Roll when modal opens
  useEffect(() => {
    if (isRandomPickerOpen) {
      rollPicks();
      setActiveCategoryIndex(0);
    }
  }, [isRandomPickerOpen]);

  if (!isRandomPickerOpen) return null;

  const categories = [
    { id: 'movie', label: 'Movie', icon: Film, item: picks.movie },
    { id: 'tv', label: 'TV Series', icon: Tv, item: picks.tv },
    { id: 'anime', label: 'Anime', icon: Sparkles, item: picks.anime },
  ] as const;

  const currentCategory = categories[activeCategoryIndex];
  const currentItem = currentCategory?.item;

  const handleToggleWatched = (item: MediaItem) => {
    const isCurrentlyWatched = item.status === 'watched' || justMarkedWatchedId === item.id;
    if (isCurrentlyWatched) {
      updateItem({
        ...item,
        status: 'watch_later',
        inWatchlist: true,
        dateWatched: undefined,
      });
      setJustMarkedWatchedId(null);
      setPicks((prev) => ({
        movie: prev.movie?.id === item.id ? { ...prev.movie, status: 'watch_later', inWatchlist: true } : prev.movie,
        tv: prev.tv?.id === item.id ? { ...prev.tv, status: 'watch_later', inWatchlist: true } : prev.tv,
        anime: prev.anime?.id === item.id ? { ...prev.anime, status: 'watch_later', inWatchlist: true } : prev.anime,
      }));
    } else {
      const today = new Date().toISOString().split('T')[0];
      updateItem({
        ...item,
        status: 'watched',
        inWatchlist: false,
        dateWatched: today,
      });
      logDiaryEntry(item.id, {
        watchedDate: today,
        rating: item.rating || 4,
        notes: 'Picked and watched via "Pick a Movie for Me" random selector.',
      });
      setJustMarkedWatchedId(item.id);
      setPicks((prev) => ({
        movie: prev.movie?.id === item.id ? { ...prev.movie, status: 'watched', inWatchlist: false } : prev.movie,
        tv: prev.tv?.id === item.id ? { ...prev.tv, status: 'watched', inWatchlist: false } : prev.tv,
        anime: prev.anime?.id === item.id ? { ...prev.anime, status: 'watched', inWatchlist: false } : prev.anime,
      }));
    }
  };

  const handleOpenDetails = (item: MediaItem) => {
    setIsRandomPickerOpen(false);
    setViewingItem(item);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="random-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-2xl overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl bg-[#0a0d16] border border-white/10 rounded-3xl shadow-[0_25px_80px_rgba(0,0,0,0.85)] p-5 sm:p-8 flex flex-col items-center overflow-hidden">
        {/* Ambient Top Glow Orbs - reduced by 30% */}
        <div className="absolute top-0 left-1/4 w-72 h-44 bg-indigo-600/12 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-72 h-44 bg-fuchsia-600/12 rounded-full blur-[80px] pointer-events-none" />

        {/* Top Control Bar: safely positioned well above the Anime and category buttons */}
        <div className="w-full flex items-center justify-end -mt-1 sm:-mt-2 mb-1 sm:mb-2 relative z-30">
          <button
            type="button"
            onClick={() => setIsRandomPickerOpen(false)}
            aria-label="Close random picker"
            className="p-1.5 sm:p-2 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-slate-400 hover:text-white transition-all cursor-pointer border border-white/10 hover:border-white/20 active:scale-95"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Category Pills Switcher */}
        <div className="flex items-center gap-2 bg-[#060810] p-1.5 rounded-2xl border border-white/[0.08] relative z-10 shadow-inner">
          {categories.map((cat, idx) => {
            const Icon = cat.icon;
            const isActive = activeCategoryIndex === idx;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryIndex(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/40 border border-white/20 scale-105'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3D ROTATING & SLIDING COVERFLOW CARDS VIEWPORT WITH TOUCH SWIPE */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-full max-w-2xl h-[420px] sm:h-[460px] flex items-center justify-center my-4 overflow-hidden [perspective:1400px] touch-pan-y select-none"
        >
          {/* Coverflow 3-card sliding track */}
          <div className="relative w-full h-full flex items-center justify-center">
            {categories.map((cat, index) => {
              const item = cat.item;
              const diff = index - activeCategoryIndex;
              const isCenter = diff === 0;
              const isLeft = diff === -1 || diff === 2;
              const isRight = diff === 1 || diff === -2;

              let transformClass = '';
              let zIndex = 'z-10';
              let opacityClass = 'opacity-0 pointer-events-none';

              if (isCenter) {
                transformClass = 'translate-x-0 scale-100 rotate-y-0';
                zIndex = 'z-30';
                opacityClass =
                  'opacity-100 shadow-[0_15px_40px_-10px_rgba(99,102,241,0.32)] ring-1.5 ring-indigo-500/50 cursor-default';
              } else if (isLeft) {
                transformClass =
                  '-translate-x-[68%] sm:-translate-x-[80%] scale-[0.82] rotate-y-[22deg]';
                zIndex = 'z-20';
                opacityClass =
                  'opacity-50 hover:opacity-85 brightness-75 hover:brightness-100 cursor-pointer shadow-xl';
              } else if (isRight) {
                transformClass =
                  'translate-x-[68%] sm:translate-x-[80%] scale-[0.82] -rotate-y-[22deg]';
                zIndex = 'z-20';
                opacityClass =
                  'opacity-50 hover:opacity-85 brightness-75 hover:brightness-100 cursor-pointer shadow-xl';
              }

              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    if (!isCenter) setActiveCategoryIndex(index);
                  }}
                  style={{
                    transformStyle: 'preserve-3d',
                    transition:
                      'transform 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 500ms ease, box-shadow 500ms ease',
                  }}
                  className={`absolute top-1/2 -translate-y-1/2 w-64 sm:w-72 md:w-80 aspect-[2/3] rounded-[28px] overflow-hidden transform-gpu select-none bg-[#101426] border border-white/[0.12] ${transformClass} ${zIndex} ${opacityClass}`}
                >
                  {/* Inner container with 3D rotation flip when spinning */}
                  <div
                    style={{
                      transformStyle: 'preserve-3d',
                      transition: 'transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transform: isSpinning ? 'rotateY(720deg) scale(0.92)' : 'rotateY(0deg) scale(1)',
                    }}
                    className="w-full h-full relative"
                  >
                    {item ? (
                      <>
                        {/* Poster Image */}
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          className="w-full h-full object-cover select-none pointer-events-none filter brightness-95"
                        />

                        {/* Top Gradient Header */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#090b14] via-[#090b14]/40 to-black/60 pointer-events-none" />

                        {/* Category & Rating Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                          <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-indigo-300 border border-indigo-500/40 shadow-sm flex items-center gap-1.5">
                            {cat.id === 'movie' && <Film className="w-3 h-3" />}
                            {cat.id === 'tv' && <Tv className="w-3 h-3" />}
                            {cat.id === 'anime' && <Sparkles className="w-3 h-3" />}
                            <span>{cat.label} Pick</span>
                          </span>

                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 backdrop-blur-md text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{item.rating || 'N/A'}</span>
                          </span>
                        </div>

                        {/* Card Content Overlay */}
                        <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 z-20 flex flex-col justify-end text-left space-y-2">
                          <div>
                            <div className="text-[11px] text-indigo-300 font-semibold tracking-wide">
                              {item.releaseYear} • {item.genres?.slice(0, 2).join(' / ')}
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-white line-clamp-2 leading-tight drop-shadow-md">
                              {item.title}
                            </h3>
                          </div>

                          {item.overview && (
                            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed opacity-90 hidden sm:block">
                              {item.overview}
                            </p>
                          )}

                          {/* Quick Actions (only visible on active center card) */}
                          {isCenter && (
                            <div className="pt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleWatched(item);
                                }}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  justMarkedWatchedId === item.id || item.status === 'watched'
                                    ? 'bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 shadow-sm active:scale-95'
                                    : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-sm shadow-indigo-600/30'
                                }`}
                                title={
                                  justMarkedWatchedId === item.id || item.status === 'watched'
                                    ? 'Click to change back to Unwatched'
                                    : 'Click to mark as Watched'
                                }
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>
                                  {justMarkedWatchedId === item.id || item.status === 'watched'
                                    ? 'Watched ✓'
                                    : 'Mark Watched'}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDetails(item);
                                }}
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors cursor-pointer"
                                title="View details"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
                        <cat.icon className="w-10 h-10 text-slate-600" />
                        <p className="text-xs font-medium">No {cat.label} titles found in your library yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Left Chevron */}
            <button
              type="button"
              onClick={() =>
                setActiveCategoryIndex((prev) => (prev > 0 ? prev - 1 : categories.length - 1))
              }
              aria-label="Previous suggestion"
              className="absolute left-2 sm:left-4 z-40 p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 text-white/50 hover:text-white backdrop-blur-md shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Right Chevron */}
            <button
              type="button"
              onClick={() => setActiveCategoryIndex((prev) => (prev + 1) % categories.length)}
              aria-label="Next suggestion"
              className="absolute right-2 sm:right-4 z-40 p-2.5 sm:p-3 rounded-full bg-black/40 hover:bg-black/70 border border-white/15 text-white/50 hover:text-white backdrop-blur-md shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Dots Indicator */}
        <div className="flex items-center gap-2 mb-4">
          {categories.map((cat, i) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryIndex(i)}
              aria-label={`Slide to ${cat.label}`}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                activeCategoryIndex === i
                  ? 'w-8 bg-indigo-500 shadow-md shadow-indigo-500/50'
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* FOOTER ACTIONS: Glowing Spin / Pick Again Button */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/[0.08] relative z-10">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            <span>Currently viewing: </span>
            <span className="font-semibold text-white">{currentCategory?.label}</span>
            {currentItem && (
              <span className="text-indigo-300"> — "{currentItem.title}"</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Glowing Spin Again Button - reduced by 50% */}
            <div className="relative group inline-flex">
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-500/50 via-indigo-500/50 to-pink-500/50 opacity-25 blur-xs group-hover:opacity-40 transition duration-500 pointer-events-none" />
              <button
                type="button"
                onClick={rollPicks}
                disabled={isSpinning}
                className="relative flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 active:scale-95 text-white font-semibold text-xs sm:text-sm border border-white/20 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>Spin Again 🎲</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsRandomPickerOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08] text-xs font-medium transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
