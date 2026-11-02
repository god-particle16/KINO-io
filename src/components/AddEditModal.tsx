/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Film, Tv, Sparkles, Heart, Bookmark, Calendar } from 'lucide-react';
import { useMedia } from '../context/MediaContext.tsx';
import { MediaCategory, WatchStatus } from '../types/media.ts';
import { RatingStars } from './RatingStars.tsx';

const POPULAR_LANGUAGES = ['Tamil', 'English', 'Japanese', 'Korean', 'Hindi', 'Malayalam', 'Telugu', 'French', 'Spanish'];

export const AddEditModal: React.FC = () => {
  const {
    isAddModalOpen,
    setIsAddModalOpen,
    editingItem,
    setEditingItem,
    addItem,
    updateItem,
    allLanguages,
  } = useMedia();

  const isEditMode = Boolean(editingItem && editingItem.id);

  // Form State
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [category, setCategory] = useState<MediaCategory>('movie');
  const [releaseYear, setReleaseYear] = useState<number>(new Date().getFullYear());
  const [language, setLanguage] = useState<string>('Tamil');
  const [customLanguage, setCustomLanguage] = useState('');
  const [status, setStatus] = useState<WatchStatus>('watching');
  const [rating, setRating] = useState<number>(4.0);
  const [watchedDate, setWatchedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [posterUrl, setPosterUrl] = useState('');
  const [overview, setOverview] = useState('');

  // TV specific: Season tracking
  const [currentSeason, setCurrentSeason] = useState(1);
  const [totalSeasons, setTotalSeasons] = useState(1);

  // Anime specific: Season tracking
  const [animeCurrentSeason, setAnimeCurrentSeason] = useState(1);
  const [animeTotalSeasons, setAnimeTotalSeasons] = useState(1);

  // Errors
  const [titleError, setTitleError] = useState('');

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title || '');
      setOriginalTitle(editingItem.originalTitle || '');
      setCategory(editingItem.category || 'movie');
      setReleaseYear(editingItem.releaseYear || new Date().getFullYear());
      setLanguage(editingItem.language || 'English');
      
      const normalizedStatus: WatchStatus =
        (editingItem.status as string) === 'completed'
          ? 'watched'
          : (editingItem.status as string) === 'plan_to_watch'
          ? 'watch_later'
          : editingItem.status || 'watching';

      setStatus(normalizedStatus);
      setRating(editingItem.rating || 0);
      setWatchedDate(editingItem.dateWatched || editingItem.dateLogged || new Date().toISOString().split('T')[0]);
      setNotes(editingItem.notes || '');
      setIsFavorite(editingItem.isFavorite || false);
      setInWatchlist(editingItem.inWatchlist || false);
      setPosterUrl(editingItem.posterUrl || '');
      setOverview(editingItem.overview || '');

      setCurrentSeason(editingItem.currentSeason ?? 1);
      setTotalSeasons(editingItem.totalSeasons ?? 1);

      setAnimeCurrentSeason(editingItem.animeCurrentSeason ?? 1);
      setAnimeTotalSeasons(editingItem.animeTotalSeasons ?? 1);
    } else {
      setTitle('');
      setOriginalTitle('');
      setCategory('movie');
      setReleaseYear(new Date().getFullYear());
      setLanguage('Tamil');
      setCustomLanguage('');
      setStatus('watching');
      setRating(0);
      setWatchedDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setIsFavorite(false);
      setInWatchlist(false);
      setPosterUrl('');
      setOverview('');
      setCurrentSeason(1);
      setTotalSeasons(1);
      setAnimeCurrentSeason(1);
      setAnimeTotalSeasons(1);
    }
    setTitleError('');
  }, [editingItem, isAddModalOpen]);

  if (!isAddModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }

    const effectiveLanguage = customLanguage.trim() || language;

    const payload = {
      title: title.trim(),
      originalTitle: originalTitle.trim() || undefined,
      category,
      releaseYear: Number(releaseYear) || new Date().getFullYear(),
      language: effectiveLanguage,
      status,
      rating: Number(rating) || 0,
      dateWatched: watchedDate,
      notes: notes.trim() || undefined,
      isFavorite,
      inWatchlist,
      posterUrl: posterUrl.trim() || undefined,
      overview: overview.trim() || undefined,

      currentSeason: category === 'tv' ? Number(currentSeason) || 1 : undefined,
      totalSeasons: category === 'tv' ? Number(totalSeasons) || 1 : undefined,

      animeCurrentSeason: category === 'anime' ? Number(animeCurrentSeason) || 1 : undefined,
      animeTotalSeasons: category === 'anime' ? Number(animeTotalSeasons) || 1 : undefined,
    };

    if (isEditMode && editingItem) {
      updateItem({
        ...editingItem,
        ...payload,
      });
    } else {
      addItem(payload);
    }

    setIsAddModalOpen(false);
    setEditingItem(null);
  };

  const combinedLanguages = Array.from(new Set([...POPULAR_LANGUAGES, ...allLanguages]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl bg-[#0b0d14] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0e111a]">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              {isEditMode ? 'Edit Title Details' : 'Add Custom Title'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Record a movie, series, or anime season into your personal log
            </p>
          </div>
          <button
            onClick={() => {
              setIsAddModalOpen(false);
              setEditingItem(null);
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* Category Selector Tabs */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Media Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCategory('movie')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  category === 'movie'
                    ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-sm shadow-indigo-950/40'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Film className="w-3.5 h-3.5 text-indigo-400" />
                <span>Movie</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('tv')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  category === 'tv'
                    ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-sm shadow-indigo-950/40'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tv className="w-3.5 h-3.5 text-violet-400" />
                <span>TV Series</span>
              </button>

              <button
                type="button"
                onClick={() => setCategory('anime')}
                className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  category === 'anime'
                    ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-sm shadow-indigo-950/40'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Anime</span>
              </button>
            </div>
          </div>

          {/* Title & Original Title */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError) setTitleError('');
                }}
                placeholder="e.g. Vikram Vedha, Severance, Attack on Titan"
                className={`w-full px-3 py-2 bg-white/[0.03] border rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors ${
                  titleError ? 'border-rose-500' : 'border-white/[0.08] focus:border-indigo-500'
                }`}
              />
              {titleError && (
                <span className="text-xs text-rose-400 mt-1 block">{titleError}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Original Title (Optional, e.g. native script: விக்ரம் வேதா / 進撃の巨人)
              </label>
              <input
                type="text"
                value={originalTitle}
                onChange={(e) => setOriginalTitle(e.target.value)}
                placeholder="e.g. விக்ரம் வேதா"
                className="w-full px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Year & Language Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Release Year
              </label>
              <input
                type="number"
                min="1890"
                max="2035"
                value={releaseYear}
                onChange={(e) => setReleaseYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Language Tag</span>
                <span className="text-[11px] text-slate-500">e.g. Tamil, Japanese</span>
              </label>
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  if (e.target.value !== 'Other') setCustomLanguage('');
                }}
                className="w-full px-3 py-2 bg-[#0e111a] border border-white/[0.08] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {combinedLanguages.map((lang) => (
                  <option key={lang} value={lang} className="bg-[#0e111a] text-slate-100">
                    {lang}
                  </option>
                ))}
                <option value="Other" className="bg-[#0e111a] text-slate-100">Other (Custom)</option>
              </select>
              {language === 'Other' && (
                <input
                  type="text"
                  placeholder="Enter language name..."
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  className="mt-2 w-full px-3 py-1.5 bg-white/[0.03] border border-white/[0.08] rounded-lg text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              )}
            </div>
          </div>

          {/* TV Series Season Tracking: Seasons, NOT episodes */}
          {category === 'tv' && (
            <div className="p-3.5 bg-[#101220]/80 border border-indigo-500/20 rounded-xl space-y-3">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-indigo-400" />
                <span>TV Series Season Tracking (Marked as watched by seasons)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Current Season Watched</label>
                  <input
                    type="number"
                    min="0"
                    value={currentSeason}
                    onChange={(e) => setCurrentSeason(Math.max(0, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 bg-[#0e111a] border border-white/[0.08] focus:border-indigo-500 focus:outline-none rounded text-xs text-slate-100 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Total Seasons</label>
                  <input
                    type="number"
                    min="1"
                    value={totalSeasons}
                    onChange={(e) => setTotalSeasons(Math.max(1, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 bg-[#0e111a] border border-white/[0.08] focus:border-indigo-500 focus:outline-none rounded text-xs text-slate-100 font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Anime Season Tracking: Seasons, NOT episodes */}
          {category === 'anime' && (
            <div className="p-3.5 bg-[#101220]/80 border border-indigo-500/20 rounded-xl space-y-3">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Anime Season Tracking (Marked as watched by seasons)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Current Season Watched</label>
                  <input
                    type="number"
                    min="0"
                    value={animeCurrentSeason}
                    onChange={(e) => setAnimeCurrentSeason(Math.max(0, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 bg-[#0e111a] border border-white/[0.08] focus:border-indigo-500 focus:outline-none rounded text-xs text-slate-100 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Total Seasons</label>
                  <input
                    type="number"
                    min="1"
                    value={animeTotalSeasons}
                    onChange={(e) => setAnimeTotalSeasons(Math.max(1, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 bg-[#0e111a] border border-white/[0.08] focus:border-indigo-500 focus:outline-none rounded text-xs text-slate-100 font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Status & Rating Row: Watched, Watching, Watch Later */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Watch Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as WatchStatus)}
                className="w-full px-3 py-2 bg-[#0e111a] border border-white/[0.08] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="watching" className="bg-[#0e111a]">Watching</option>
                <option value="watched" className="bg-[#0e111a]">Watched</option>
                <option value="watch_later" className="bg-[#0e111a]">Watch List</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Personal Rating (0.5 to 5.0)</span>
                <span className="font-mono text-xs text-amber-400 font-semibold tabular-nums">
                  {rating > 0 ? `${rating.toFixed(1)} / 5.0` : 'Unrated'}
                </span>
              </label>
              <div className="py-1.5 flex items-center">
                <RatingStars
                  rating={rating}
                  interactive
                  size="md"
                  onChange={(val) => setRating(val)}
                />
              </div>
            </div>
          </div>

          {/* Date Watched (for Diary) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Date Watched / Logged</span>
              </label>
              <input
                type="date"
                value={watchedDate}
                onChange={(e) => setWatchedDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500 font-mono tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Poster Image URL (Optional)
              </label>
              <input
                type="url"
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Notes / Letterboxd Review */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Diary Notes & Thoughts
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What made this season or movie memorable? Screenplay, acting, direction, cinematography..."
              className="w-full px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
            />
          </div>

          {/* Toggles: Watchlist & Favorite in Indigo Violet */}
          <div className="flex items-center gap-4 pt-1 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isFavorite
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-400 text-rose-400' : ''}`} />
              <span>{isFavorite ? 'In Favorites' : 'Add to Favorites'}</span>
            </button>

            <button
              type="button"
              onClick={() => setInWatchlist(!inWatchlist)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                inWatchlist
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                  : 'bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-white/[0.06]'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-indigo-400 text-indigo-400' : ''}`} />
              <span>{inWatchlist ? 'In Watch List' : 'Add to Watch List'}</span>
            </button>
          </div>

          {/* Action buttons: Indigo Violet */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingItem(null);
              }}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:from-indigo-700 active:to-violet-700 rounded-lg shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {isEditMode ? 'Save Changes' : 'Save Title to Library'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
