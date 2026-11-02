/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  MoreVertical,
  Film,
  Tv,
  Sparkles,
  Star,
  Play,
  Check,
  Plus,
  Heart,
  Bookmark,
  ThumbsUp,
  Calendar,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  RotateCcw,
  Clapperboard,
  CheckCircle2,
  FolderPlus,
  ListPlus,
} from 'lucide-react';
import { useMedia } from '../context/MediaContext.tsx';
import { RatingStars } from './RatingStars.tsx';
import { WatchStatus, MediaItem } from '../types/media.ts';
import { tmdbService } from '../services/tmdb.ts';

// Preset generator for titles without explicit cast/director/streaming info
const getEnrichedMediaData = (item: MediaItem) => {
  const titleLower = item.title.toLowerCase();
  const isZootopia = titleLower.includes('zootopia');
  const isAvengers = titleLower.includes('avenger') || titleLower.includes('endgame');
  const isAnime = item.category === 'anime';

  // 1. Cast
  let cast = item.cast;
  if (!cast || cast.length === 0) {
    if (isZootopia) {
      cast = [
        {
          name: 'Ginnifer Goodwin',
          role: 'Judy Hopps (voice)',
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
        },
        {
          name: 'Jason Bateman',
          role: 'Nick Wilde (voice)',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        },
        {
          name: 'Ke Huy Quan',
          role: 'Gary Snake (voice)',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
        },
        {
          name: 'Idris Elba',
          role: 'Chief Bogo (voice)',
          avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
        },
      ];
    } else if (isAvengers) {
      cast = [
        {
          name: 'Robert Downey Jr.',
          role: 'Tony Stark / Iron Man',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
        },
        {
          name: 'Chris Evans',
          role: 'Steve Rogers / Captain America',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        },
        {
          name: 'Scarlett Johansson',
          role: 'Natasha Romanoff / Black Widow',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        },
      ];
    } else if (isAnime) {
      cast = [
        {
          name: 'Natsuki Hanae',
          role: 'Tanjiro Kamado (Japanese Voice)',
          avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
        },
        {
          name: 'Akari Kito',
          role: 'Nezuko Kamado (Japanese Voice)',
          avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
        },
        {
          name: 'Hiro Shimono',
          role: 'Zenitsu Agatsuma (Japanese Voice)',
          avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
        },
      ];
    } else {
      cast = [
        {
          name: 'Lead Actor',
          role: 'Protagonist',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
        },
        {
          name: 'Co-Star',
          role: 'Supporting Role',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        },
        {
          name: 'Feature Voice',
          role: 'Key Guest',
          avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
        },
      ];
    }
  }

  // 2. Directors
  const directors =
    item.directors ||
    (isZootopia
      ? ['Jared Bush', 'Byron Howard']
      : item.category === 'movie'
      ? ['Christopher Nolan', 'Denis Villeneuve']
      : ['Makoto Shinkai', 'Hayao Miyazaki']);

  // 3. Available On Streaming Services
  const availableOn = item.availableOn || ['NETFLIX', 'prime video', 'Apple TV'];

  // 4. IMDb Rating / Runtime / Content Rating
  const imdbScore = item.imdbScore || (item.rating > 0 ? (item.rating * 1.8 + 0.8).toFixed(1) : '8.6');
  const runtime = item.runtime || (item.category === 'movie' ? '1h 48m' : '24m per ep');
  const contentRating = item.contentRating || '14+';

  // 5. Reliable Fallback Image URL
  const fallbackImage = isZootopia
    ? 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80'
    : item.category === 'movie'
    ? 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=1200&q=80'
    : item.category === 'tv'
    ? 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80'
    : 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80';

  return { cast, directors, availableOn, imdbScore, runtime, contentRating, fallbackImage };
};

export const ItemDetailsModal: React.FC = () => {
  const {
    viewingItem,
    setViewingItem,
    setEditingItem,
    setIsAddModalOpen,
    deleteItem,
    updateItem,
    toggleWatchlist,
    toggleFavorite,
    markSeasonWatched,
    logDiaryEntry,
    customLists,
    addCustomList,
    toggleItemInCustomList,
  } = useMedia();

  const [activeTab, setActiveTab] = useState<'cast' | 'media' | 'reviews'>('cast');
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [showRatePicker, setShowRatePicker] = useState(false);
  const [showCustomListPicker, setShowCustomListPicker] = useState(false);
  const [showLogPicker, setShowLogPicker] = useState(false);
  const [newListNameInput, setNewListNameInput] = useState('');
  const [scrollTop, setScrollTop] = useState(0);

  // Hero image state with reliable image fallback
  const [heroImageSrc, setHeroImageSrc] = useState<string>('');

  // Rewatch diary entry form state
  const [isLoggingRewatch, setIsLoggingRewatch] = useState(false);
  const [rewatchDate, setRewatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [rewatchRating, setRewatchRating] = useState(viewingItem?.rating || 4.5);
  const [rewatchNote, setRewatchNote] = useState('');
  const [rewatchSeason, setRewatchSeason] = useState(1);

  const enriched = viewingItem ? getEnrichedMediaData(viewingItem) : null;

  useEffect(() => {
    let isCancelled = false;
    if (viewingItem && enriched) {
      const initialSrc = viewingItem.backdropUrl || viewingItem.posterUrl || enriched.fallbackImage;
      setHeroImageSrc(initialSrc);

      if ((viewingItem.tmdbId || viewingItem.id.startsWith('tmdb:')) && (!viewingItem.cast || viewingItem.cast.length === 0)) {
        const tmdbType = viewingItem.category === 'movie' ? 'movie' : 'tv';
        const rawId = viewingItem.tmdbId || viewingItem.id.replace(/^tmdb:(movie|tv):/, '');
        tmdbService
          .getDetails(tmdbType, rawId)
          .then((details) => {
            if (!isCancelled && details) {
              if (details.backdropUrl) setHeroImageSrc(details.backdropUrl);
              updateItem({
                ...viewingItem,
                cast: details.cast || viewingItem.cast,
                directors: details.directors || viewingItem.directors,
                trailerUrl: details.trailerUrl || viewingItem.trailerUrl,
                overview: details.overview || viewingItem.overview,
                genres: details.genres || viewingItem.genres,
              });
            }
          })
          .catch((err) => {
            console.warn('Failed to load TMDB details for viewing item:', err);
          });
      }
    }
    setShowCustomListPicker(false);
    setShowRatePicker(false);
    setShowLogPicker(false);
    setShowOptionsDropdown(false);
    setScrollTop(0);

    return () => {
      isCancelled = true;
    };
  }, [viewingItem?.id]);

  if (!viewingItem || !enriched) return null;

  const handleToggleWatched = () => {
    const isCurrentlyWatched = viewingItem.status === 'watched';
    if (isCurrentlyWatched) {
      updateItem({
        ...viewingItem,
        status: 'watch_later',
        inWatchlist: false,
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      updateItem({
        ...viewingItem,
        status: 'watched',
        inWatchlist: false,
        dateWatched: today,
      });
      logDiaryEntry(viewingItem.id, {
        watchedDate: today,
        rating: viewingItem.rating || 4,
        notes: 'Watched via Title Detail view.',
      });
    }
  };

  const handleRatingChange = (newRating: number) => {
    updateItem({
      ...viewingItem,
      rating: newRating,
    });
    setShowRatePicker(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: viewingItem.title,
          text: `Check out ${viewingItem.title} (${viewingItem.releaseYear}) on KINO!`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(`${viewingItem.title} (${viewingItem.releaseYear})`);
      alert(`Copied "${viewingItem.title}" to clipboard!`);
    }
  };

  const handleAddDiaryEntry = (e: React.FormEvent) => {
    e.preventDefault();
    logDiaryEntry(viewingItem.id, {
      watchedDate: rewatchDate,
      rating: rewatchRating,
      notes: rewatchNote.trim() || undefined,
      isRewatch: (viewingItem.diaryLogs?.length || 0) > 0,
      seasonLogged:
        viewingItem.category !== 'movie' ? `Season ${rewatchSeason}` : undefined,
    });
    setIsLoggingRewatch(false);
    setRewatchNote('');
  };

  // Season tracking calculations
  let totalSeasonsCount = 1;
  let currentSeasonCount = 1;
  if (viewingItem.category === 'tv' && viewingItem.totalSeasons) {
    totalSeasonsCount = viewingItem.totalSeasons;
    currentSeasonCount = viewingItem.currentSeason || 0;
  } else if (viewingItem.category === 'anime' && viewingItem.animeTotalSeasons) {
    totalSeasonsCount = viewingItem.animeTotalSeasons;
    currentSeasonCount = viewingItem.animeCurrentSeason || 0;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="movie-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-2xl overflow-y-auto animate-in fade-in duration-300"
    >
      <div
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        className="relative w-full max-w-lg sm:max-w-2xl md:max-w-3xl h-full sm:h-auto sm:max-h-[92vh] bg-[#07080d] text-white rounded-none sm:rounded-3xl shadow-2xl overflow-y-auto flex flex-col border border-white/[0.08] scroll-smooth"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ====================================================================== */}
        {/* TOP FLOATING CONTROLS BAR (<X /> Close | <Share2 /> | <MoreVertical />) */}
        {/* ====================================================================== */}
        <div className="sticky top-0 z-40 inset-x-0 p-4 flex items-center justify-between pointer-events-none">
          <button
            type="button"
            onClick={() => setViewingItem(null)}
            className="pointer-events-auto p-2.5 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white/90 hover:text-white border border-white/20 transition-all cursor-pointer active:scale-95 shadow-lg shrink-0 z-30"
            title="Close details"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="pointer-events-auto flex items-center gap-2 shrink-0 z-30">
            <button
              type="button"
              onClick={handleShare}
              className="p-2.5 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white/90 hover:text-white border border-white/20 transition-all cursor-pointer active:scale-95 shadow-lg"
              title="Share title"
            >
              <Share2 className="w-5 h-5" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                className="p-2.5 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white/90 hover:text-white border border-white/20 transition-all cursor-pointer active:scale-95 shadow-lg"
                title="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showOptionsDropdown && (
                <div className="absolute right-0 mt-2 w-44 bg-[#121624] border border-white/15 rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsDropdown(false);
                      setEditingItem(viewingItem);
                      setIsAddModalOpen(true);
                      setViewingItem(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] rounded-xl cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4 text-indigo-400" />
                    <span>Edit Title</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOptionsDropdown(false);
                      if (confirm(`Are you sure you want to delete "${viewingItem.title}"?`)) {
                        deleteItem(viewingItem.id);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20 rounded-xl cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Delete Title</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ====================================================================== */}
        {/* HERO BACKDROP BANNER LAYER (Crisp image 1 on load, blurs on scroll for image 2) */}
        {/* ====================================================================== */}
        <div className="absolute top-0 inset-x-0 h-[420px] sm:h-[460px] pointer-events-none overflow-hidden z-0 select-none">
          {/* Main Hero Backdrop Image with Dynamic Scroll Blur */}
          <img
            src={heroImageSrc || enriched.fallbackImage}
            alt={viewingItem.title}
            className="w-full h-full object-cover object-top brightness-95 transform-gpu transition-all duration-150"
            style={{
              filter: `blur(${Math.min(28, (scrollTop / 100) * 28)}px)`,
              opacity: Math.max(0.2, 1 - scrollTop / 280),
              transform: `scale(${1 + Math.min(0.2, scrollTop / 600)})`,
            }}
            onError={() => {
              if (heroImageSrc !== enriched.fallbackImage) {
                setHeroImageSrc(enriched.fallbackImage);
              }
            }}
          />

          {/* Smooth GradientScrim blending poster image into app dark background */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#07080d] via-[#07080d]/40 to-black/60 pointer-events-none" />
        </div>

        {/* ====================================================================== */}
        {/* MAIN SCROLLABLE CONTENT AREA (Title, Meta, Available On, Trailer, 2x2 Buttons) */}
        {/* ====================================================================== */}
        <div className="relative z-10 flex-1 px-4 sm:px-6 pb-6 space-y-4 pt-16 sm:pt-20 -mt-16">
          {/* HERO TITLE & META HEADER BLOCK (Image 1 placement, scrolls UP into top row for Image 4) */}
          <div className="space-y-2 pt-16 sm:pt-20">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-xl leading-tight">
              {viewingItem.title} ({viewingItem.releaseYear})
            </h1>

            {/* IMDb Rating & Meta Bar */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-300 font-medium drop-shadow-md">
              {/* IMDb Yellow Badge */}
              <div className="flex items-center gap-1.5 bg-[#f5c518] text-black px-2 py-0.5 rounded font-extrabold text-[11px] tracking-wide shadow-sm">
                <span>IMDb</span>
                <span className="font-bold">{enriched.imdbScore} / 10</span>
              </div>

              <span>•</span>
              <span className="flex items-center gap-1 font-mono tabular-nums">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {enriched.runtime}
              </span>

              <span>•</span>
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[11px] font-semibold border border-white/20">
                {enriched.contentRating}
              </span>

              <span>•</span>
              <span className="font-mono tabular-nums">{viewingItem.releaseYear}</span>
            </div>

            {/* Classification & Genres Line */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-300">
              <span className="px-2 py-0.5 rounded-md border border-white/30 text-[11px] font-bold text-slate-200 bg-black/30 backdrop-blur-sm">
                {enriched.contentRating}
              </span>

              <span className="text-slate-200 font-medium">
                {viewingItem.genres && viewingItem.genres.length > 0
                  ? viewingItem.genres.join(' • ')
                  : 'Animations • Comedy • Adventure • Mystery'}
              </span>
            </div>
          </div>

          {/* Available On Streaming Providers Badges */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs font-semibold text-slate-400">Available on:</span>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#e50914]/20 border border-[#e50914]/40 text-[#ff4f5a] font-extrabold text-xs tracking-wider uppercase shadow-sm">
                NETFLIX
              </span>
              <span className="px-3 py-1 rounded-full bg-[#00a8e1]/20 border border-[#00a8e1]/40 text-[#38cdff] font-extrabold text-xs tracking-wider lowercase italic shadow-sm">
                prime video
              </span>
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white font-bold text-xs tracking-tight shadow-sm">
                 tv
              </span>
              <span className="px-3 py-1 rounded-full bg-[#113ccf]/20 border border-[#113ccf]/40 text-[#678eff] font-bold text-xs tracking-wide shadow-sm">
                Disney+
              </span>
            </div>
          </div>

          {/* ====================================================================== */}
          {/* PROMINENT RED TRAILER BUTTON & SECONDARY ACTION BUTTONS */}
          {/* Order: 1. Watchlist | 2. Watched | 3. Custom List | 4. Rating */}
          {/* ====================================================================== */}
          <div className="space-y-3">
            {/* Prominent Red Trailer Button */}
            <button
              type="button"
              onClick={() => setShowTrailerModal(true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.99] text-white font-bold text-base shadow-lg shadow-red-900/40 border border-white/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>Trailer</span>
            </button>

            {/* Action Buttons Grid: 1. Watchlist | 2. Watched | 3. Log | 4. Custom List | 5. Favorite | 6. Rating */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {/* 1. Watchlist Button */}
              <button
                type="button"
                onClick={() => toggleWatchlist(viewingItem.id)}
                className={`py-3 px-2 sm:px-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  viewingItem.inWatchlist
                    ? 'bg-indigo-600/35 text-indigo-200 border-indigo-500/50 shadow-md'
                    : 'bg-[#101426] hover:bg-[#181e36] text-slate-200 border-white/10'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${viewingItem.inWatchlist ? 'fill-indigo-400 text-indigo-400' : 'text-slate-300'}`} />
                <span className="truncate">{viewingItem.inWatchlist ? 'In Watchlist' : 'Watchlist'}</span>
              </button>

              {/* 2. Watched Button */}
              <button
                type="button"
                onClick={handleToggleWatched}
                className={`py-3 px-2 sm:px-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  viewingItem.status === 'watched'
                    ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50 shadow-md'
                    : 'bg-[#101426] hover:bg-[#181e36] text-slate-200 border-white/10'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="truncate">{viewingItem.status === 'watched' ? 'Watched' : 'Watched'}</span>
              </button>

              {/* 3. Log Button */}
              <button
                type="button"
                onClick={() => {
                  setShowLogPicker(!showLogPicker);
                  setShowCustomListPicker(false);
                  setShowRatePicker(false);
                }}
                className={`py-3 px-2 sm:px-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  showLogPicker
                    ? 'bg-violet-600/35 text-violet-200 border-violet-500/60 shadow-md'
                    : 'bg-[#101426] hover:bg-[#181e36] text-slate-200 border-white/10'
                }`}
              >
                <Plus className="w-4 h-4 text-violet-400 stroke-[2.5]" />
                <span className="truncate">Log</span>
              </button>

              {/* 4. Custom List Button */}
              <button
                type="button"
                onClick={() => {
                  setShowCustomListPicker(!showCustomListPicker);
                  setShowRatePicker(false);
                  setShowLogPicker(false);
                }}
                className={`py-3 px-2 sm:px-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  viewingItem.customLists && viewingItem.customLists.length > 0
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-md'
                    : 'bg-[#101426] hover:bg-[#181e36] text-slate-200 border-white/10'
                }`}
              >
                <FolderPlus className="w-4 h-4 text-purple-400 stroke-[2.2]" />
                <span className="truncate">
                  {viewingItem.customLists && viewingItem.customLists.length > 0
                    ? `Custom (${viewingItem.customLists.length})`
                    : 'Custom List'}
                </span>
              </button>

              {/* 5. Favorite Heart Button */}
              <button
                type="button"
                onClick={() => toggleFavorite(viewingItem.id)}
                className={`py-3 px-2 sm:px-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  viewingItem.isFavorite
                    ? 'bg-rose-500/30 text-rose-300 border-rose-500/50 shadow-md'
                    : 'bg-[#101426] hover:bg-[#181e36] text-slate-200 border-white/10'
                }`}
              >
                <Heart className={`w-4 h-4 ${viewingItem.isFavorite ? 'fill-rose-400 text-rose-400' : 'text-slate-300'}`} />
                <span className="truncate">{viewingItem.isFavorite ? 'Favorited' : 'Favorite'}</span>
              </button>

              {/* 6. Rating Button */}
              <button
                type="button"
                onClick={() => {
                  setShowRatePicker(!showRatePicker);
                  setShowCustomListPicker(false);
                  setShowLogPicker(false);
                }}
                className={`py-3 px-2 sm:px-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  viewingItem.rating > 0
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md'
                    : 'bg-[#101426] hover:bg-[#181e36] text-slate-200 border-white/10'
                }`}
              >
                <ThumbsUp className="w-4 h-4 text-amber-400" />
                <span className="truncate font-bold">{viewingItem.rating > 0 ? `${viewingItem.rating.toFixed(1)} ★` : 'Rate'}</span>
              </button>
            </div>

            {/* Interactive Log & Review Popup */}
            {showLogPicker && (
              <form
                onSubmit={(e) => {
                  handleAddDiaryEntry(e);
                  setShowLogPicker(false);
                }}
                className="p-4 bg-[#0d101e] border border-violet-500/40 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-violet-400 stroke-[2.5]" />
                    <span className="text-xs font-bold text-white">Log Watch & Review</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLogPicker(false)}
                    className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Date Watched</label>
                    <input
                      type="date"
                      value={rewatchDate}
                      onChange={(e) => setRewatchDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-black/60 border border-white/20 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-violet-500/60"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Your Rating</label>
                    <RatingStars
                      rating={rewatchRating}
                      interactive
                      size="sm"
                      onChange={(r) => setRewatchRating(r)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-300 mb-1">Review & Notes</label>
                  <textarea
                    rows={2}
                    value={rewatchNote}
                    onChange={(e) => setRewatchNote(e.target.value)}
                    placeholder="Write your review or thoughts..."
                    className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-xl text-xs text-white placeholder-slate-500 resize-none focus:outline-none focus:border-violet-500/60"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowLogPicker(false)}
                    className="px-3 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    Save Log
                  </button>
                </div>
              </form>
            )}

            {/* Interactive Custom List Manager Popup */}
            {showCustomListPicker && (
              <div className="p-4 bg-[#0d101e] border border-rose-500/40 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <FolderPlus className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-white">Manage Custom Lists</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomListPicker(false)}
                    className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/5 cursor-pointer"
                  >
                    Done
                  </button>
                </div>

                {/* Quick Favorite / My List Toggle */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(viewingItem.id)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                      viewingItem.isFavorite
                        ? 'bg-rose-500/25 border-rose-500/50 text-rose-300'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Heart className={`w-4 h-4 ${viewingItem.isFavorite ? 'fill-rose-400 text-rose-400' : 'text-slate-400'}`} />
                      <span>Favorites</span>
                    </span>
                    {viewingItem.isFavorite && <Check className="w-4 h-4 text-rose-400" />}
                  </button>

                  {/* Previously Created Custom Lists */}
                  {customLists && customLists.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-semibold text-slate-400">Your Custom Lists:</div>
                      {customLists.map((listName) => {
                        const inList = viewingItem.customLists?.includes(listName);
                        return (
                          <button
                            key={listName}
                            type="button"
                            onClick={() => toggleItemInCustomList(viewingItem.id, listName)}
                            className={`w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer border ${
                              inList
                                ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200'
                                : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.08]'
                            }`}
                          >
                            <span>{listName}</span>
                            {inList ? (
                              <Check className="w-4 h-4 text-indigo-400 stroke-[2.5]" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-slate-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Inline Form to Create New Custom List */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const name = newListNameInput.trim();
                      if (name) {
                        addCustomList(name);
                        toggleItemInCustomList(viewingItem.id, name);
                        setNewListNameInput('');
                      }
                    }}
                    className="pt-2 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={newListNameInput}
                      onChange={(e) => setNewListNameInput(e.target.value)}
                      placeholder="Create new list (e.g. Weekend Marathon)..."
                      className="flex-1 px-3 py-2 bg-black/60 border border-white/20 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/60"
                    />
                    <button
                      type="submit"
                      disabled={!newListNameInput.trim()}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Interactive Rating Picker Popup */}
            {showRatePicker && (
              <div className="p-4 bg-[#0d101d] border border-amber-500/40 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in duration-150">
                <div>
                  <div className="text-xs font-semibold text-amber-300">Rate this title</div>
                  <div className="mt-1">
                    <RatingStars
                      rating={viewingItem.rating}
                      interactive
                      size="md"
                      onChange={handleRatingChange}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRatePicker(false)}
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          {/* ====================================================================== */}
          {/* SYNOPSIS OVERVIEW WITH "READ MORE" */}
          {/* ====================================================================== */}
          <div className="space-y-2">
            <p
              className={`text-xs sm:text-sm text-slate-300 leading-relaxed font-normal transition-all ${
                isOverviewExpanded ? '' : 'line-clamp-3'
              }`}
            >
              {viewingItem.overview ||
                `After successfully solving the biggest case in Zootopia's history, two rookie police officers Judy Hopps and Nick Wilde realize that their partnership is tested by a new mysterious case in the animal metropolis...`}
            </p>

            <button
              type="button"
              onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
              className="text-xs font-bold text-white hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
            >
              <span>{isOverviewExpanded ? 'Show Less' : 'Read More'}</span>
              {isOverviewExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Directors Line */}
            <div className="pt-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Director: </span>
              <span>{enriched.directors.join(', ')}</span>
            </div>
          </div>

          {/* Season progress tracking bar for TV / Anime */}
          {(viewingItem.category === 'tv' || viewingItem.category === 'anime') && (
            <div className="p-4 bg-[#0c0f1b] border border-white/[0.1] rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Season Progress</span>
                <span className="font-mono text-indigo-300 font-semibold">
                  Season {currentSeasonCount} of {totalSeasonsCount}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Array.from({ length: totalSeasonsCount }, (_, idx) => {
                  const sNum = idx + 1;
                  const isWatched = currentSeasonCount >= sNum;
                  return (
                    <button
                      key={sNum}
                      type="button"
                      onClick={() => markSeasonWatched(viewingItem.id, sNum)}
                      className={`py-2 px-3 rounded-2xl text-xs font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isWatched
                          ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/50'
                          : 'bg-white/5 border border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      {isWatched && <Check className="w-3.5 h-3.5 text-indigo-300 stroke-[3]" />}
                      <span>Season {sNum}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ====================================================================== */}
          {/* TABS NAVIGATION: Top Cast & Crew | Media | User Reviews */}
          {/* ====================================================================== */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center border-b border-white/[0.1] gap-6 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('cast')}
                className={`pb-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'cast'
                    ? 'border-red-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Top Cast & Crew
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('media')}
                className={`pb-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'media'
                    ? 'border-red-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Media
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`pb-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'reviews'
                    ? 'border-red-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                User Reviews ({viewingItem.diaryLogs?.length || (viewingItem.notes ? 1 : 0)})
              </button>
            </div>

            {/* TAB CONTENT 1: TOP CAST & CREW */}
            {activeTab === 'cast' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {enriched.cast.map((actor, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center text-center p-3.5 rounded-2xl bg-[#0c0f1a] border border-white/[0.06] hover:border-white/20 transition-all"
                  >
                    <img
                      src={actor.avatarUrl}
                      alt={actor.name}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white/10 shadow-md mb-2.5"
                    />
                    <div className="text-xs sm:text-sm font-bold text-white line-clamp-1">
                      {actor.name}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {actor.role}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB CONTENT 2: MEDIA GALLERY */}
            {activeTab === 'media' && (
              <div className="space-y-3">
                <div
                  className="aspect-video w-full bg-black rounded-2xl overflow-hidden border border-white/10 relative group cursor-pointer"
                  onClick={() => setShowTrailerModal(true)}
                >
                  <img
                    src={heroImageSrc || enriched.fallbackImage}
                    alt="Media Backstage Still"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="p-4 rounded-full bg-red-600 text-white shadow-xl group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 fill-white" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: USER REVIEWS & DIARY LOGGING */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <span className="text-xs font-bold text-white">Diary & Rewatch Logs</span>
                </div>

                {/* Review Logs */}
                {viewingItem.diaryLogs && viewingItem.diaryLogs.length > 0 ? (
                  <div className="space-y-2.5">
                    {viewingItem.diaryLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3.5 bg-[#0c0f1b] border border-white/[0.08] rounded-2xl space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono text-white font-bold">{log.watchedDate}</span>
                          <RatingStars rating={log.rating} size="xs" showNumeric />
                        </div>
                        {log.notes && <p className="text-xs text-slate-300 leading-relaxed">"{log.notes}"</p>}
                      </div>
                    ))}
                  </div>
                ) : viewingItem.notes ? (
                  <div className="p-3.5 bg-[#0c0f1b] border border-white/[0.08] rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-bold">Personal Notes</span>
                      <RatingStars rating={viewingItem.rating} size="xs" showNumeric />
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">"{viewingItem.notes}"</p>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-3 text-center">
                    No review logs yet. Click "Log Review" to write your thoughts.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ====================================================================== */}
        {/* TRAILER POPUP VIDEO PLAYER MODAL */}
        {/* ====================================================================== */}
        {showTrailerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl bg-black border border-white/20 rounded-3xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#0a0d16]">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-red-500 fill-red-500" />
                  <span className="font-bold text-sm text-white">
                    {viewingItem.title} — Official Trailer
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTrailerModal(false)}
                  className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* YouTube Embed Player */}
              <div className="aspect-video w-full bg-black flex items-center justify-center relative">
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(
                    viewingItem.title + ' official trailer'
                  )}&autoplay=1`}
                  title={`${viewingItem.title} Trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
