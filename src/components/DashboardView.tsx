/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Film,
  Tv,
  Sparkles,
  Calendar,
  Plus,
  ArrowRight,
  Heart,
  Bookmark,
  Flame,
  TrendingUp,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useMedia } from '../context/MediaContext.tsx';
import { MediaItem } from '../types/media.ts';
import { tmdbService } from '../services/tmdb.ts';
import { MediaCard } from './MediaCard.tsx';

// Curated list of popular movies, series, and anime posters for the animated background
const POPULAR_TILED_SLIDES = [
  {
    title: 'Vikram Vedha',
    poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=400&q=80',
    type: 'Movie',
  },
  {
    title: 'Severance',
    poster: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=400&q=80',
    type: 'TV Series',
  },
  {
    title: 'Attack on Titan',
    poster: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=400&q=80',
    type: 'Anime',
  },
  {
    title: 'Oppenheimer',
    poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=400&q=80',
    type: 'Movie',
  },
  {
    title: 'Frieren',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80',
    type: 'Anime',
  },
  {
    title: 'Breaking Bad',
    poster: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
    type: 'TV Series',
  },
  {
    title: 'Nayagan',
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80',
    type: 'Movie',
  },
  {
    title: 'Suzhal: The Vortex',
    poster: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=400&q=80',
    type: 'TV Series',
  },
  {
    title: 'Spirited Away',
    poster: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=400&q=80',
    type: 'Anime',
  },
  {
    title: 'Dune: Part Two',
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80',
    type: 'Movie',
  },
  {
    title: 'The Bear',
    poster: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
    type: 'TV Series',
  },
  {
    title: 'Your Name',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80',
    type: 'Anime',
  },
];

export const DashboardView: React.FC = () => {
  const {
    items,
    setActiveTab,
    setWatchlistSubTab,
    openAddModalWithPreset,
    setViewingItem,
  } = useMedia();

  // Metrics: Movies, TV Series, Anime, Favorites
  const moviesCount = items.filter((i) => i.category === 'movie').length;
  const tvCount = items.filter((i) => i.category === 'tv').length;
  const animeCount = items.filter((i) => i.category === 'anime').length;
  const favoritesCount = items.filter((i) => i.isFavorite).length;

  // 1. Gather Recently Watched Media Items (Deduplicated for the 3D coverflow)
  const recentWatchedItems: MediaItem[] = useMemo(() => {
    const seen = new Set<string>();
    const list: MediaItem[] = [];

    // From diary logs first
    items.forEach((item) => {
      if (item.diaryLogs && item.diaryLogs.length > 0) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          list.push(item);
        }
      } else if (item.status === 'watched' || item.dateWatched) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          list.push(item);
        }
      }
    });

    // Supplement with remaining watched titles
    if (list.length < 5) {
      items
        .filter((i) => !seen.has(i.id) && i.status === 'watched')
        .forEach((item) => {
          seen.add(item.id);
          list.push(item);
        });
    }

    return list.slice(0, 10);
  }, [items]);

  // 2. Gather Watch Next queued titles
  const watchNextItems: MediaItem[] = useMemo(() => {
    const queued = items.filter((i) => i.inWatchlist || i.status === 'watch_later');
    const sorted = [...queued].sort((a, b) => a.releaseYear - b.releaseYear);

    // If fewer than 6, supplement with unwatched titles
    if (sorted.length < 6) {
      const existingIds = new Set(sorted.map((i) => i.id));
      const extra = items
        .filter((i) => !existingIds.has(i.id) && i.status !== 'watched')
        .sort((a, b) => a.releaseYear - b.releaseYear);
      return [...sorted, ...extra].slice(0, 10);
    }
    return sorted.slice(0, 10);
  }, [items]);

  // TMDB Live Rows State
  const [trendingItems, setTrendingItems] = useState<MediaItem[]>([]);
  const [popularItems, setPopularItems] = useState<MediaItem[]>([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [tmdbRetry, setTmdbRetry] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    const fetchTMDBData = async () => {
      setTmdbLoading(true);
      setTmdbError(null);
      try {
        const [trendData, popData] = await Promise.all([
          tmdbService.trending('all', 'week'),
          tmdbService.popular('movie'),
        ]);
        if (!isCancelled) {
          setTrendingItems(trendData.slice(0, 10));
          setPopularItems(popData.slice(0, 10));
        }
      } catch (err: any) {
        if (!isCancelled) {
          setTmdbError(err.message || 'Failed to load TMDB recommendations.');
        }
      } finally {
        if (!isCancelled) setTmdbLoading(false);
      }
    };

    fetchTMDBData();
    return () => {
      isCancelled = true;
    };
  }, [tmdbRetry]);

  // Coverflow 1: Recently Watched State
  const [activeRecentIndex, setActiveRecentIndex] = useState(0);
  const [isRecentHovered, setIsRecentHovered] = useState(false);

  // Coverflow 2: Watch Next State
  const [activeWatchNextIndex, setActiveWatchNextIndex] = useState(0);
  const [isWatchNextHovered, setIsWatchNextHovered] = useState(false);

  // Auto-advance Recently Watched Coverflow
  useEffect(() => {
    if (isRecentHovered || recentWatchedItems.length <= 1) return;
    const timer = setInterval(() => {
      setActiveRecentIndex((prev) => (prev + 1) % recentWatchedItems.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isRecentHovered, recentWatchedItems.length]);

  // Auto-advance Watch Next Coverflow
  useEffect(() => {
    if (isWatchNextHovered || watchNextItems.length <= 1) return;
    const timer = setInterval(() => {
      setActiveWatchNextIndex((prev) => (prev + 1) % watchNextItems.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [isWatchNextHovered, watchNextItems.length]);

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

  const handleRecentTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    if (distance > 35 && recentWatchedItems.length > 1) {
      // Swipe left -> Next item
      setActiveRecentIndex((prev) => (prev + 1) % recentWatchedItems.length);
    } else if (distance < -35 && recentWatchedItems.length > 1) {
      // Swipe right -> Previous item
      setActiveRecentIndex((prev) => (prev > 0 ? prev - 1 : recentWatchedItems.length - 1));
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const handleWatchNextTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    if (distance > 35 && watchNextItems.length > 1) {
      // Swipe left -> Next item
      setActiveWatchNextIndex((prev) => (prev + 1) % watchNextItems.length);
    } else if (distance < -35 && watchNextItems.length > 1) {
      // Swipe right -> Previous item
      setActiveWatchNextIndex((prev) => (prev > 0 ? prev - 1 : watchNextItems.length - 1));
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  // Helper renderer for 3D Coverflow Cards (larger size, clean aesthetic, no external descriptions)
  const renderCoverflowCards = (
    itemList: MediaItem[],
    activeIndex: number,
    setActiveIndex: React.Dispatch<React.SetStateAction<number>>
  ) => {
    const total = itemList.length;
    if (total === 0) return null;

    return itemList.map((item, index) => {
      let diff = (index - activeIndex) % total;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;

      if (Math.abs(diff) > 2) return null;

      const isCenter = diff === 0;
      const isLeft = diff === -1;
      const isRight = diff === 1;
      const isFarLeft = diff === -2;
      const isFarRight = diff === 2;

      let transformStyle = '';
      let zIndexClass = 'z-10';
      let opacityClass = 'opacity-0 pointer-events-none';

      if (isCenter) {
        transformStyle = 'translate-x-0 scale-100';
        zIndexClass = 'z-30';
        opacityClass =
          'opacity-100 cursor-pointer shadow-[0_30px_70px_-10px_rgba(0,0,0,0.95)] ring-1 ring-white/25';
      } else if (isLeft) {
        transformStyle =
          '-translate-x-[62%] sm:-translate-x-[72%] md:-translate-x-[82%] scale-[0.84]';
        zIndexClass = 'z-20';
        opacityClass =
          'opacity-65 hover:opacity-90 brightness-75 hover:brightness-100 cursor-pointer shadow-2xl';
      } else if (isRight) {
        transformStyle =
          'translate-x-[62%] sm:translate-x-[72%] md:translate-x-[82%] scale-[0.84]';
        zIndexClass = 'z-20';
        opacityClass =
          'opacity-65 hover:opacity-90 brightness-75 hover:brightness-100 cursor-pointer shadow-2xl';
      } else if (isFarLeft) {
        transformStyle =
          '-translate-x-[115%] sm:-translate-x-[135%] md:-translate-x-[155%] scale-[0.68]';
        zIndexClass = 'z-10';
        opacityClass = 'opacity-25 brightness-50 hidden sm:block cursor-pointer';
      } else if (isFarRight) {
        transformStyle =
          'translate-x-[115%] sm:translate-x-[135%] md:translate-x-[155%] scale-[0.68]';
        zIndexClass = 'z-10';
        opacityClass = 'opacity-25 brightness-50 hidden sm:block cursor-pointer';
      }

      return (
        <div
          key={item.id}
          onClick={(e) => {
            e.stopPropagation();
            if (isCenter) {
              setViewingItem(item);
            } else {
              setActiveIndex(index);
            }
          }}
          className={`absolute top-1/2 -translate-y-1/2 w-64 sm:w-80 md:w-96 aspect-[2/3] rounded-[28px] sm:rounded-[36px] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu select-none bg-[#101322] ${transformStyle} ${zIndexClass} ${opacityClass}`}
        >
          {/* Poster image */}
          {item.posterUrl ? (
            <img
              src={item.posterUrl}
              alt={item.title}
              className="w-full h-full object-cover select-none pointer-events-none filter brightness-95 contrast-105"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 to-slate-900 p-6 text-center">
              <Film className="w-16 h-16 text-indigo-400/40 mb-3" />
              <span className="text-base font-bold text-white truncate max-w-full">
                {item.title}
              </span>
            </div>
          )}

          {/* Scrim Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent pointer-events-none" />

          {/* Clean Overlay for Center Active Card */}
          {isCenter && (
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 flex flex-col justify-end text-left pointer-events-auto">
              <h3 className="text-xl sm:text-2xl font-bold text-white drop-shadow-md truncate leading-snug">
                {item.title}
              </h3>
            </div>
          )}
        </div>
      );
    });
  };

  // Double duplicated list for background marquee
  const row1Posters = [...POPULAR_TILED_SLIDES, ...POPULAR_TILED_SLIDES];
  const shifted2 = [...POPULAR_TILED_SLIDES.slice(4), ...POPULAR_TILED_SLIDES.slice(0, 4)];
  const row2Posters = [...shifted2, ...shifted2];
  const shifted3 = [...POPULAR_TILED_SLIDES.slice(8), ...POPULAR_TILED_SLIDES.slice(0, 8)];
  const row3Posters = [...shifted3, ...shifted3];

  return (
    <div className="relative isolate -mt-8 pt-8 pb-16 min-h-screen overflow-hidden">
      {/* Animated Tiled Slides Background of Popular Movies, Series & Anime */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-25 select-none filter blur-[1px]">
        <div className="flex flex-col gap-6 -rotate-2 scale-110 transform-gpu origin-center -translate-y-8">
          {/* Row 1 */}
          <div className="flex gap-4 animate-slide-left whitespace-nowrap">
            {row1Posters.map((item, idx) => (
              <div
                key={`r1-${idx}`}
                className="w-32 sm:w-44 aspect-[2/3] rounded-xl overflow-hidden shrink-0 border border-white/[0.1] shadow-2xl bg-[#121526] relative group"
              >
                <img
                  src={item.poster}
                  alt={item.title}
                  className="w-full h-full object-cover filter brightness-95 contrast-105"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ))}
          </div>

          {/* Row 2 */}
          <div className="flex gap-4 animate-slide-right whitespace-nowrap">
            {row2Posters.map((item, idx) => (
              <div
                key={`r2-${idx}`}
                className="w-32 sm:w-44 aspect-[2/3] rounded-xl overflow-hidden shrink-0 border border-white/[0.1] shadow-2xl bg-[#121526] relative group"
              >
                <img
                  src={item.poster}
                  alt={item.title}
                  className="w-full h-full object-cover filter brightness-95 contrast-105"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ))}
          </div>

          {/* Row 3 */}
          <div className="flex gap-4 animate-slide-left-slow whitespace-nowrap">
            {row3Posters.map((item, idx) => (
              <div
                key={`r3-${idx}`}
                className="w-32 sm:w-44 aspect-[2/3] rounded-xl overflow-hidden shrink-0 border border-white/[0.1] shadow-2xl bg-[#121526] relative group"
              >
                <img
                  src={item.poster}
                  alt={item.title}
                  className="w-full h-full object-cover filter brightness-95 contrast-105"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Soft Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#07080b]/30 via-[#07080b]/50 to-[#07080b]/85 pointer-events-none" />
      </div>

      {/* Main Dashboard Content */}
      <div className="relative z-10 space-y-12">
        {/* Editorial Welcome */}
        <div className="pb-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance drop-shadow-md">
            Track Your Movies, Series & Anime in One Place
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed drop-shadow">
            Kino: An all-in-one sanctuary for movies, anime, and series. Effortlessly track your entertainment.
          </p>
        </div>

        {/* 4 METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className="p-4 bg-[#0b0e1a]/70 backdrop-blur-xl border border-white/[0.12] hover:border-indigo-500/50 rounded-xl flex flex-col justify-between transition-all shadow-xl shadow-black/40 text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-300 group-hover:text-indigo-300 font-medium transition-colors">Movies</span>
              <div className="p-1.5 bg-indigo-600/30 rounded-lg text-indigo-300 border border-indigo-500/40">
                <Film className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-white font-mono tabular-nums">
              {moviesCount}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className="p-4 bg-[#0b0e1a]/70 backdrop-blur-xl border border-white/[0.12] hover:border-violet-500/50 rounded-xl flex flex-col justify-between transition-all shadow-xl shadow-black/40 text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-300 group-hover:text-violet-300 font-medium transition-colors">TV Series</span>
              <div className="p-1.5 bg-violet-600/30 rounded-lg text-violet-300 border border-violet-500/40">
                <Tv className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-violet-300 font-mono tabular-nums">
              {tvCount}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className="p-4 bg-[#0b0e1a]/70 backdrop-blur-xl border border-white/[0.12] hover:border-fuchsia-500/50 rounded-xl flex flex-col justify-between transition-all shadow-xl shadow-black/40 text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-300 group-hover:text-fuchsia-300 font-medium transition-colors">Anime</span>
              <div className="p-1.5 bg-fuchsia-600/30 rounded-lg text-fuchsia-300 border border-fuchsia-500/40">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-fuchsia-300 font-mono tabular-nums">
              {animeCount}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setWatchlistSubTab('favorites');
              setActiveTab('watchlists');
            }}
            className="p-4 bg-[#0b0e1a]/70 backdrop-blur-xl border border-white/[0.12] hover:border-rose-500/50 rounded-xl flex flex-col justify-between transition-all shadow-xl shadow-black/40 text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-300 group-hover:text-rose-300 font-medium transition-colors">Favorites</span>
              <div className="p-1.5 bg-rose-600/30 rounded-lg text-rose-300 border border-rose-500/40">
                <Heart className="w-3.5 h-3.5 fill-rose-400/40" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-rose-400 font-mono tabular-nums">
              {favoritesCount}
            </div>
          </button>
        </div>

        {/* 1. RECENTLY WATCHED - 3D COVERFLOW (Cards Only, Larger Size) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <span>Recently Watched</span>
            </h2>

            <button
              onClick={() => setActiveTab('diary')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>View Full Diary</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentWatchedItems.length === 0 ? (
            <div className="p-8 text-center bg-[#0c0e15] border border-white/[0.08] rounded-2xl text-xs text-slate-400">
              No watched titles recorded yet.
            </div>
          ) : (
            <div
              className="relative w-full bg-transparent p-2 sm:p-4"
              onMouseEnter={() => setIsRecentHovered(true)}
              onMouseLeave={() => setIsRecentHovered(false)}
            >
              {/* Coverflow Viewport with Larger Cards & Touch Swipe Support */}
              <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleRecentTouchEnd}
                className="relative w-full max-w-5xl mx-auto h-[440px] sm:h-[540px] md:h-[620px] flex items-center justify-center overflow-hidden touch-pan-y select-none"
              >
                {renderCoverflowCards(
                  recentWatchedItems,
                  activeRecentIndex,
                  setActiveRecentIndex
                )}
              </div>

              {/* Dots Pagination Indicator (No description box) */}
              <div className="mt-4 flex items-center justify-center gap-1.5 pb-2 relative z-20">
                {recentWatchedItems.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveRecentIndex(i);
                    }}
                    aria-label={`Go to slide ${i + 1}`}
                    className="p-2 cursor-pointer group flex items-center justify-center focus:outline-none"
                  >
                    <span
                      className={`h-2 rounded-full transition-all duration-300 block ${
                        activeRecentIndex === i
                          ? 'w-8 bg-indigo-500 shadow-lg shadow-indigo-500/50'
                          : 'w-2 bg-white/30 group-hover:bg-white/60'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 2. WATCH NEXT 🎬 - 3D COVERFLOW (Cards Only, Larger Size) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Bookmark className="w-5 h-5 text-indigo-400" />
              <span>Watch Next 🎬</span>
            </h2>

            <button
              onClick={() => {
                setWatchlistSubTab('watch_later');
                setActiveTab('watchlists');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>View All ({watchNextItems.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {watchNextItems.length === 0 ? (
            <div className="p-8 text-center bg-[#0c0e15] border border-white/[0.08] rounded-2xl text-xs text-slate-400">
              Your Watch List is empty. Search titles or add favorites to populate this row.
            </div>
          ) : (
            <div
              className="relative w-full bg-transparent p-2 sm:p-4"
              onMouseEnter={() => setIsWatchNextHovered(true)}
              onMouseLeave={() => setIsWatchNextHovered(false)}
            >
              {/* Coverflow Viewport with Larger Cards & Touch Swipe Support */}
              <div
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleWatchNextTouchEnd}
                className="relative w-full max-w-5xl mx-auto h-[440px] sm:h-[540px] md:h-[620px] flex items-center justify-center overflow-hidden touch-pan-y select-none"
              >
                {renderCoverflowCards(
                  watchNextItems,
                  activeWatchNextIndex,
                  setActiveWatchNextIndex
                )}
              </div>

              {/* Dots Pagination Indicator (No description box) */}
              <div className="mt-4 flex items-center justify-center gap-1.5 pb-2 relative z-20">
                {watchNextItems.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveWatchNextIndex(i);
                    }}
                    aria-label={`Go to slide ${i + 1}`}
                    className="p-2 cursor-pointer group flex items-center justify-center focus:outline-none"
                  >
                    <span
                      className={`h-2 rounded-full transition-all duration-300 block ${
                        activeWatchNextIndex === i
                          ? 'w-8 bg-indigo-500 shadow-lg shadow-indigo-500/50'
                          : 'w-2 bg-white/30 group-hover:bg-white/60'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 3. TMDB TRENDING THIS WEEK 🔥 */}
        <section className="space-y-4 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Flame className="w-5 h-5 text-rose-500 fill-rose-500" />
              <span>Trending This Week 🔥</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Live TMDB</span>
          </div>

          {tmdbError ? (
            <div className="p-6 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-3">
              <div className="flex items-center justify-center gap-2 text-rose-300 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>{tmdbError}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Check your VITE_TMDB_PROXY_URL environment variable or proxy configuration in settings.
              </p>
              <button
                type="button"
                onClick={() => setTmdbRetry((prev) => prev + 1)}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          ) : tmdbLoading ? (
            <div className="p-8 text-center bg-[#0c0e15] border border-white/[0.06] rounded-2xl text-xs text-slate-400">
              Loading TMDB Trending recommendations...
            </div>
          ) : trendingItems.length === 0 ? (
            <div className="p-8 text-center bg-[#0c0e15] border border-white/[0.06] rounded-2xl text-xs text-slate-400">
              No trending records retrieved.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {trendingItems.map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* 4. TMDB POPULAR MOVIES 🌟 */}
        <section className="space-y-4 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <span>Popular Movies 🌟</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Live TMDB</span>
          </div>

          {!tmdbError && !tmdbLoading && popularItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
              {popularItems.map((item) => (
                <MediaCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
