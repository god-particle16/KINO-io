import type { MediaItem, DiaryEntry } from '../types/media.ts';
import { getTMDBProxyUrl, mapTMDBToMediaItem } from './tmdb.ts';

export interface ImportEntry {
  title: string;
  year?: number | null;
  status: 'watched' | 'watch_later';
  rating?: number;
  watchedDate?: string;
  loggedDate?: string;
  rewatch?: boolean;
  favorite?: boolean;
  sources?: string[];
}

export interface ImportReport {
  items: MediaItem[];
  alreadyInLibrary: number;
  duplicatesMerged: number;
  uncertain: { title: string; matchedAs: string }[];
  unmatched: { title: string; year?: number | null }[];
  failed: number;
}

const norm = (s: string) =>
  (s || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9஀-௿぀-ヿ一-鿿]+/g, '');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function tmdbGet(path: string, signal?: AbortSignal): Promise<any> {
  const proxy = getTMDBProxyUrl();
  if (!proxy) throw new Error('TMDB proxy URL is not set (Settings > TMDB service).');
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${proxy}/api${path}`, { headers: { accept: 'application/json' }, signal });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      await sleep(600 * (attempt + 1));
      continue;
    }
    throw new Error(`TMDB ${res.status}`);
  }
  throw new Error('TMDB busy, try again');
}

const yearOf = (r: any): number | null => {
  const d = r.release_date || r.first_air_date || '';
  const y = parseInt(String(d).slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
};
const titlesOf = (r: any) =>
  [r.title, r.name, r.original_title, r.original_name].filter(Boolean).map((t: string) => norm(t));

interface Match { raw: any; type: 'movie' | 'tv'; confident: boolean }

async function findMatch(e: ImportEntry, signal?: AbortSignal): Promise<Match | null> {
  const want = norm(e.title);
  const q = encodeURIComponent(e.title.trim());
  let pool: { raw: any; type: 'movie' | 'tv' }[] = [];

  if (e.year) {
    // Letterboxd entries are films with a known year
    const data = await tmdbGet(`/search/movie?query=${q}&include_adult=false&year=${e.year}`, signal);
    pool = (data.results || []).map((raw: any) => ({ raw, type: 'movie' as const }));
    if (!pool.length) {
      const wide = await tmdbGet(`/search/movie?query=${q}&include_adult=false`, signal);
      pool = (wide.results || []).map((raw: any) => ({ raw, type: 'movie' as const }));
    }
    const scored = pool
      .map((c) => {
        const y = yearOf(c.raw);
        const exact = titlesOf(c.raw).includes(want);
        const yd = y == null ? 9 : Math.abs(y - e.year!);
        return { c, exact, yd, score: (exact ? 10 : 0) + (yd === 0 ? 6 : yd === 1 ? 3 : 0) + Math.log10((c.raw.vote_count || 0) + 1) };
      })
      .filter((s) => s.yd <= 1 && (s.exact || s.yd === 0))
      .sort((a, b) => b.score - a.score);
    if (scored.length) return { ...scored[0].c, confident: scored[0].exact };
    return null;
  }

  // Google entries: title only, could be a movie or a series
  const data = await tmdbGet(`/search/multi?query=${q}&include_adult=false`, signal);
  pool = (data.results || [])
    .filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv')
    .map((raw: any) => ({ raw, type: raw.media_type as 'movie' | 'tv' }));
  const exact = pool.filter((c) => titlesOf(c.raw).includes(want));
  if (!exact.length) return null;
  exact.sort((a, b) => (b.raw.popularity || 0) - (a.raw.popularity || 0));
  const top = exact[0].raw.popularity || 0;
  const second = exact[1]?.raw.popularity || 0;
  const confident = exact.length === 1 || top >= second * 3;
  return { ...exact[0], confident };
}

export async function runImport(
  entries: ImportEntry[],
  existing: MediaItem[],
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal
): Promise<ImportReport> {
  const today = new Date().toISOString().split('T')[0];
  const existingIds = new Set(existing.filter((i) => !i.deletedAt).map((i) => i.id));
  const report: ImportReport = { items: [], alreadyInLibrary: 0, duplicatesMerged: 0, uncertain: [], unmatched: [], failed: 0 };
  const byId = new Map<string, MediaItem>();
  let done = 0;
  const queue = [...entries];

  const worker = async () => {
    while (queue.length) {
      if (signal?.aborted) return;
      const e = queue.shift()!;
      try {
        const m = await findMatch(e, signal);
        if (!m) {
          report.unmatched.push({ title: e.title, year: e.year });
        } else {
          const base = mapTMDBToMediaItem(m.raw, m.type);
          if (existingIds.has(base.id)) {
            report.alreadyInLibrary++;
          } else {
            const watched = e.status === 'watched';
            const rating = watched && e.rating ? e.rating : 0;
            const logs: DiaryEntry[] =
              watched && e.watchedDate
                ? [{ id: `log-imp-${base.id}`, watchedDate: e.watchedDate, rating, isRewatch: e.rewatch || undefined }]
                : [];
            const item: MediaItem = {
              ...base,
              status: watched ? 'watched' : 'watch_later',
              inWatchlist: !watched,
              isFavorite: !!e.favorite,
              rating,
              dateLogged: e.loggedDate || today,
              dateWatched: watched ? e.watchedDate : undefined,
              diaryLogs: logs,
              customLists: [],
            };
            const prev = byId.get(item.id);
            if (prev) {
              report.duplicatesMerged++;
              // a watched record always wins over a watch-list-only record
              if (prev.status !== 'watched' && item.status === 'watched') byId.set(item.id, { ...item, isFavorite: item.isFavorite || prev.isFavorite });
              else byId.set(item.id, { ...prev, isFavorite: prev.isFavorite || item.isFavorite });
            } else {
              byId.set(item.id, item);
              if (!m.confident) report.uncertain.push({ title: e.title, matchedAs: `${item.title} (${item.releaseYear})` });
            }
          }
        }
      } catch (err) {
        if ((err as any)?.name === 'AbortError') return;
        report.failed++;
        report.unmatched.push({ title: e.title, year: e.year });
      }
      done++;
      onProgress(done, entries.length);
    }
  };

  await Promise.all([worker(), worker(), worker(), worker()]);
  report.items = [...byId.values()];
  return report;
}
