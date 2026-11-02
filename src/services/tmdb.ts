/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MediaItem, MediaCategory } from '../types/media.ts';

export const POSTER_PLACEHOLDER =
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';

const STORAGE_KEY_PROXY = 'kino_tmdb_proxy_url';

export const LANGUAGE_MAP: Record<string, string> = {
  en: 'English',
  ta: 'Tamil',
  ja: 'Japanese',
  ko: 'Korean',
  hi: 'Hindi',
  ml: 'Malayalam',
  te: 'Telugu',
  fr: 'French',
  es: 'Spanish',
  de: 'German',
  it: 'Italian',
  zh: 'Chinese',
};

export const GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action & Adventure',
  10762: 'Kids',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
};

export class TMDBError extends Error {
  code: 'MISSING_PROXY' | 'NETWORK_ERROR' | 'UNKNOWN';
  constructor(message: string, code: 'MISSING_PROXY' | 'NETWORK_ERROR' | 'UNKNOWN') {
    super(message);
    this.name = 'TMDBError';
    this.code = code;
  }
}

export const getTMDBProxyUrl = (): string => {
  const custom = localStorage.getItem(STORAGE_KEY_PROXY);
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }
  const envUrl = import.meta.env.VITE_TMDB_PROXY_URL;
  if (envUrl && envUrl.trim() && envUrl !== 'https://your-tmdb-proxy.workers.dev') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '';
};

export const setTMDBProxyUrl = (url: string): void => {
  if (url && url.trim()) {
    localStorage.setItem(STORAGE_KEY_PROXY, url.trim().replace(/\/+$/, ''));
  } else {
    localStorage.removeItem(STORAGE_KEY_PROXY);
  }
};

export const getPosterProxyUrl = (posterPath: string | null | undefined): string => {
  if (!posterPath) return POSTER_PLACEHOLDER;
  const proxy = getTMDBProxyUrl();
  const path = posterPath.startsWith('/') ? posterPath : `/${posterPath}`;
  return proxy ? `${proxy}/img/w500${path}` : POSTER_PLACEHOLDER;
};

export const getBackdropProxyUrl = (backdropPath: string | null | undefined): string | undefined => {
  if (!backdropPath) return undefined;
  const proxy = getTMDBProxyUrl();
  if (!proxy) return undefined;
  const path = backdropPath.startsWith('/') ? backdropPath : `/${backdropPath}`;
  return `${proxy}/img/w780${path}`;
};

export const getProfileProxyUrl = (profilePath: string | null | undefined): string | undefined => {
  if (!profilePath) return undefined;
  const proxy = getTMDBProxyUrl();
  if (!proxy) return undefined;
  const path = profilePath.startsWith('/') ? profilePath : `/${profilePath}`;
  return `${proxy}/img/w185${path}`;
};

const tmdbFetch = async (endpoint: string): Promise<any> => {
  const proxy = getTMDBProxyUrl();
  if (!proxy) {
    throw new TMDBError(
      'Cloudflare proxy URL is missing. Please set VITE_TMDB_PROXY_URL in .env or configure in TMDB settings.',
      'MISSING_PROXY'
    );
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${proxy}/api${cleanEndpoint}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new TMDBError(
        `Cloudflare proxy returned error status (${res.status}: ${res.statusText}).`,
        'NETWORK_ERROR'
      );
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof TMDBError) throw err;
    throw new TMDBError(
      'Cloudflare proxy is unreachable. Please check your internet connection or proxy URL.',
      'NETWORK_ERROR'
    );
  }
};

export const mapTMDBToMediaItem = (item: any, forceType?: 'movie' | 'tv'): MediaItem => {
  const mediaType: 'movie' | 'tv' = forceType || item.media_type || (item.title ? 'movie' : 'tv');
  const rawId = item.id;
  const tmdbFormattedId = `tmdb:${mediaType}:${rawId}`;

  const isAnime =
    mediaType === 'tv' &&
    item.original_language === 'ja' &&
    ((item.genre_ids && item.genre_ids.includes(16)) ||
      (item.genres && item.genres.some((g: any) => g.id === 16)));

  let category: MediaCategory = 'movie';
  if (isAnime) {
    category = 'anime';
  } else if (mediaType === 'tv') {
    category = 'tv';
  }

  const title = item.title || item.name || item.original_title || item.original_name || 'Untitled';
  const originalTitle = item.original_title || item.original_name;

  const releaseDate = item.release_date || item.first_air_date || '';
  const releaseYear = releaseDate
    ? parseInt(releaseDate.substring(0, 4), 10) || new Date().getFullYear()
    : new Date().getFullYear();

  const langCode = item.original_language || 'en';
  const language = LANGUAGE_MAP[langCode] || langCode.toUpperCase();

  const posterUrl = item.poster_path ? getPosterProxyUrl(item.poster_path) : (item.posterUrl || POSTER_PLACEHOLDER);
  const backdropUrl = item.backdrop_path ? getBackdropProxyUrl(item.backdrop_path) : item.backdropUrl;

  let genres: string[] = [];
  if (Array.isArray(item.genres) && item.genres.length > 0) {
    genres = item.genres.map((g: any) => g.name || GENRE_MAP[g.id] || g);
  } else if (Array.isArray(item.genre_ids)) {
    genres = item.genre_ids.map((id: number) => GENRE_MAP[id]).filter(Boolean);
  }

  const runtimeNum = item.runtime || (item.episode_run_time && item.episode_run_time[0]);
  const runtime = runtimeNum
    ? mediaType === 'movie'
      ? `${Math.floor(runtimeNum / 60)}h ${runtimeNum % 60}m`
      : `${runtimeNum}m per ep`
    : mediaType === 'movie'
    ? '2h 00m'
    : '24m per ep';

  const voteAvg = item.vote_average ? item.vote_average.toFixed(1) : undefined;

  // Extract Cast & Crew if available
  let cast: { name: string; role: string; avatarUrl?: string }[] | undefined = undefined;
  let directors: string[] | undefined = undefined;

  if (item.credits) {
    if (Array.isArray(item.credits.cast)) {
      cast = item.credits.cast.slice(0, 8).map((c: any) => ({
        name: c.name,
        role: c.character || 'Actor',
        avatarUrl: c.profile_path ? getProfileProxyUrl(c.profile_path) : undefined,
      }));
    }
    if (Array.isArray(item.credits.crew)) {
      directors = item.credits.crew
        .filter((c: any) => c.job === 'Director')
        .map((c: any) => c.name);
    }
  }

  // Extract Trailer URL if available
  let trailerUrl: string | undefined = undefined;
  if (item.videos && Array.isArray(item.videos.results)) {
    const trailerObj =
      item.videos.results.find(
        (v: any) => v.site === 'YouTube' && v.type === 'Trailer'
      ) ||
      item.videos.results.find(
        (v: any) => v.site === 'YouTube' && v.type === 'Teaser'
      );

    if (trailerObj?.key) {
      trailerUrl = `https://www.youtube-nocookie.com/embed/${trailerObj.key}`;
    }
  }

  return {
    id: tmdbFormattedId,
    tmdbId: rawId,
    title,
    originalTitle,
    category,
    releaseYear,
    language,
    genres,
    status: 'watch_later',
    rating: voteAvg ? parseFloat((parseFloat(voteAvg) / 2).toFixed(1)) : 0,
    dateLogged: new Date().toISOString().split('T')[0],
    isFavorite: false,
    inWatchlist: false,
    posterUrl,
    backdropUrl,
    overview: item.overview || 'No overview available for this title.',
    totalSeasons: item.number_of_seasons || (category === 'tv' ? 1 : undefined),
    animeTotalSeasons: item.number_of_seasons || (category === 'anime' ? 1 : undefined),
    currentSeason: category === 'tv' ? 1 : undefined,
    animeCurrentSeason: category === 'anime' ? 1 : undefined,
    runtime,
    imdbScore: voteAvg || '7.5',
    cast,
    directors: directors && directors.length > 0 ? directors : undefined,
    trailerUrl,
  };
};

export const tmdbService = {
  getProxyUrl: getTMDBProxyUrl,
  setProxyUrl: setTMDBProxyUrl,
  hasProxyUrl: () => Boolean(getTMDBProxyUrl()),

  // Legacy alias support for token methods to prevent breaking any callers
  getToken: getTMDBProxyUrl,
  setToken: setTMDBProxyUrl,
  hasToken: () => Boolean(getTMDBProxyUrl()),

  async searchMulti(query: string): Promise<MediaItem[]> {
    if (!query || !query.trim()) return [];
    const data = await tmdbFetch(
      `/search/multi?query=${encodeURIComponent(query.trim())}&include_adult=false`
    );
    const results = data.results || [];
    return results
      .filter((i: any) => i.media_type === 'movie' || i.media_type === 'tv')
      .map((i: any) => mapTMDBToMediaItem(i));
  },

  async getDetails(type: 'movie' | 'tv', id: number | string): Promise<MediaItem> {
    const rawId = String(id).replace(/^tmdb:(movie|tv):/, '');
    const data = await tmdbFetch(`/${type}/${rawId}?append_to_response=credits,videos`);
    return mapTMDBToMediaItem(data, type);
  },

  async trending(
    type: 'movie' | 'tv' | 'all' = 'all',
    timeWindow: 'day' | 'week' = 'week'
  ): Promise<MediaItem[]> {
    if (type === 'all') {
      const data = await tmdbFetch(`/trending/all/${timeWindow}`);
      return (data.results || [])
        .filter((i: any) => i.media_type === 'movie' || i.media_type === 'tv')
        .map((i: any) => mapTMDBToMediaItem(i));
    }
    const data = await tmdbFetch(`/trending/${type}/${timeWindow}`);
    return (data.results || []).map((i: any) => mapTMDBToMediaItem(i, type));
  },

  async popular(type: 'movie' | 'tv' = 'movie'): Promise<MediaItem[]> {
    const data = await tmdbFetch(`/${type}/popular`);
    return (data.results || []).map((i: any) => mapTMDBToMediaItem(i, type));
  },

  async topRated(type: 'movie' | 'tv' = 'movie'): Promise<MediaItem[]> {
    const data = await tmdbFetch(`/${type}/top_rated`);
    return (data.results || []).map((i: any) => mapTMDBToMediaItem(i, type));
  },

  async upcoming(): Promise<MediaItem[]> {
    const data = await tmdbFetch('/movie/upcoming');
    return (data.results || []).map((i: any) => mapTMDBToMediaItem(i, 'movie'));
  },
};
