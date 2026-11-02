/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MediaCategory = 'movie' | 'tv' | 'anime';

export type WatchStatus = 'watch_later' | 'watching' | 'watched';

export interface DiaryEntry {
  id: string;
  watchedDate: string; // YYYY-MM-DD
  rating: number; // 0.5 to 5.0
  notes?: string;
  isRewatch?: boolean;
  seasonLogged?: string; // e.g. "Season 2" or "S02"
}

export interface MediaItem {
  id: string;
  title: string;
  originalTitle?: string;
  category: MediaCategory;
  releaseYear: number;
  language: string; // e.g., 'Tamil', 'English', 'Japanese', 'Korean', 'Spanish'
  genres?: string[];
  status: WatchStatus;
  rating: number; // 0 to 5.0 (0 means unrated, steps of 0.5)
  dateLogged: string; // YYYY-MM-DD
  dateWatched?: string; // YYYY-MM-DD (latest watch date for diary)
  notes?: string; // latest/main personal notes or review
  isFavorite: boolean; // Liked / Favorites list
  inWatchlist: boolean; // Watch Later list
  posterUrl?: string;
  backdropUrl?: string;
  overview?: string;

  // TV Series season-level tracking
  currentSeason?: number;
  totalSeasons?: number;

  // Anime season-level tracking
  animeCurrentSeason?: number;
  animeTotalSeasons?: number;

  // Multiple diary / watch logs
  diaryLogs?: DiaryEntry[];

  // Custom user lists
  customLists?: string[];

  // TMDB reference if imported
  tmdbId?: number;

  // Rich Detail View Properties matching Movie Page design
  runtime?: string;
  contentRating?: string;
  imdbScore?: string;
  directors?: string[];
  availableOn?: string[];
  cast?: { name: string; role: string; avatarUrl?: string }[];
  trailerUrl?: string;
}

export interface TMDBMediaResult {
  id: number;
  title: string;
  originalTitle?: string;
  category: MediaCategory;
  releaseYear: number;
  language: string;
  overview: string;
  posterUrl: string;
  backdropUrl?: string;
  genres: string[];
  totalSeasons?: number;
}

export type ActiveTab = 'dashboard' | 'diary' | 'watchlists' | 'library';

export type WatchlistSubTab = 'watch_later' | 'favorites';

export type SortOption = 'date_logged_desc' | 'date_logged_asc' | 'rating_desc' | 'rating_asc' | 'year_desc' | 'title_asc';
