/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MediaItem, MediaCategory, WatchStatus, ActiveTab, WatchlistSubTab, DiaryEntry } from '../types/media.ts';
import { INITIAL_MEDIA_ITEMS } from '../data/initialData.ts';

const STORAGE_KEY_ITEMS = 'cinepulse_tracker_items_v2';
const STORAGE_KEY_CUSTOM_LISTS = 'cinepulse_custom_lists_v1';

// Migration helper to normalize statuses and season-based tracking
function normalizeItem(item: any): MediaItem {
  let status: WatchStatus = item.status;
  if ((item.status as string) === 'completed') {
    status = 'watched';
  } else if ((item.status as string) === 'plan_to_watch') {
    status = 'watch_later';
  }

  // Ensure season-based fields exist
  const currentSeason = item.currentSeason ?? (item.category === 'tv' ? 1 : undefined);
  const totalSeasons = item.totalSeasons ?? (item.category === 'tv' ? 1 : undefined);
  const animeCurrentSeason = item.animeCurrentSeason ?? (item.category === 'anime' ? 1 : undefined);
  const animeTotalSeasons = item.animeTotalSeasons ?? (item.category === 'anime' ? 1 : undefined);

  // Normalize diary entries
  const diaryLogs: DiaryEntry[] = (item.diaryLogs || []).map((log: any) => ({
    id: log.id || `log-${Date.now()}-${Math.random()}`,
    watchedDate: log.watchedDate || item.dateWatched || item.dateLogged,
    rating: log.rating || item.rating || 0,
    notes: log.notes,
    isRewatch: log.isRewatch,
    seasonLogged: log.seasonLogged || log.seasonEpisodeLogged?.replace(/E\d+/i, '').trim() || (item.category !== 'movie' ? 'Season 1' : undefined),
  }));

  const customLists: string[] = Array.isArray(item.customLists) ? item.customLists : [];

  return {
    ...item,
    status,
    currentSeason,
    totalSeasons,
    animeCurrentSeason,
    animeTotalSeasons,
    diaryLogs,
    customLists,
  };
}

interface MediaContextType {
  items: MediaItem[];
  customLists: string[];
  addCustomList: (name: string) => void;
  removeCustomList: (name: string) => void;
  toggleItemInCustomList: (itemId: string, listName: string) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  watchlistSubTab: WatchlistSubTab;
  setWatchlistSubTab: (sub: WatchlistSubTab) => void;
  librarySelectedList: string;
  setLibrarySelectedList: (list: string) => void;

  // Search & Modals
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  editingItem: MediaItem | null;
  setEditingItem: (item: MediaItem | null) => void;
  viewingItem: MediaItem | null;
  setViewingItem: (item: MediaItem | null) => void;
  isTMDBModalOpen: boolean;
  setIsTMDBModalOpen: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isRandomPickerOpen: boolean;
  setIsRandomPickerOpen: (open: boolean) => void;

  // Global Quick Filters
  categoryFilter: 'all' | MediaCategory;
  setCategoryFilter: (cat: 'all' | MediaCategory) => void;
  languageFilter: string;
  setLanguageFilter: (lang: string) => void;
  statusFilter: 'all' | WatchStatus;
  setStatusFilter: (status: 'all' | WatchStatus) => void;

  // Actions
  addItem: (item: Omit<MediaItem, 'id' | 'dateLogged'> & { id?: string; dateLogged?: string }) => void;
  updateItem: (item: MediaItem) => void;
  deleteItem: (id: string) => void;
  toggleFavorite: (id: string) => void;
  toggleWatchlist: (id: string) => void;
  incrementSeason: (id: string) => void;
  markSeasonWatched: (id: string, seasonNumber: number) => void;
  logDiaryEntry: (mediaId: string, entry: Omit<DiaryEntry, 'id'>) => void;
  openAddModalWithPreset: (preset?: Partial<MediaItem>) => void;
  resetToDemoData: () => void;
  resetAllData: () => void;
  exportData: () => void;
  importData: (jsonStr: string) => boolean;
  mergeImportData: (
    incomingItems: MediaItem[],
    incomingLists: string[],
    overwriteConflicts: boolean
  ) => { addedCount: number; updatedCount: number; listsAddedCount: number };

  // Quick stats
  allLanguages: string[];
}

const MediaContext = createContext<MediaContextType | null>(null);

export const MediaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<MediaItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeItem);
        }
      }
    } catch (e) {
      console.error('Error loading stored media items:', e);
    }
    return [];
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [watchlistSubTab, setWatchlistSubTab] = useState<WatchlistSubTab>('watch_later');
  const [librarySelectedList, setLibrarySelectedList] = useState<string>('watched');

  // Custom Lists: Start empty on first launch
  const [customLists, setCustomLists] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CUSTOM_LISTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_LISTS, JSON.stringify(customLists));
    } catch (_) {}
  }, [customLists]);

  const addCustomList = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!customLists.includes(trimmed)) {
      setCustomLists((prev) => [...prev, trimmed]);
    }
  };

  const removeCustomList = (name: string) => {
    setCustomLists((prev) => prev.filter((l) => l !== name));
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        customLists: (item.customLists || []).filter((l) => l !== name),
      }))
    );
  };

  const toggleItemInCustomList = (itemId: string, listName: string) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === itemId);
      if (!exists && viewingItem && viewingItem.id === itemId) {
        const current = viewingItem.customLists || [];
        const inList = current.includes(listName);
        const nextLists = inList ? current.filter((l) => l !== listName) : [...current, listName];
        const newItem = normalizeItem({ ...viewingItem, customLists: nextLists });
        setViewingItem(newItem);
        return [newItem, ...prev];
      }
      return prev.map((item) => {
        if (item.id !== itemId) return item;
        const current = item.customLists || [];
        const inList = current.includes(listName);
        const nextLists = inList ? current.filter((l) => l !== listName) : [...current, listName];
        const newItem = { ...item, customLists: nextLists };
        if (viewingItem && viewingItem.id === itemId) setViewingItem(newItem);
        return newItem;
      });
    });
  };

  // Modals
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [viewingItem, setViewingItem] = useState<MediaItem | null>(null);
  const [isTMDBModalOpen, setIsTMDBModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isRandomPickerOpen, setIsRandomPickerOpen] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<'all' | MediaCategory>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | WatchStatus>('all');

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error('Error writing media items to localStorage:', e);
    }
  }, [items]);

  // Keep viewing item updated if items change
  useEffect(() => {
    if (viewingItem) {
      const updated = items.find((i) => i.id === viewingItem.id);
      if (updated) {
        setViewingItem(updated);
      }
    }
  }, [items]);

  // Compute distinct languages
  const allLanguages = Array.from(
    new Set(items.map((i) => i.language.trim()).filter(Boolean))
  ).sort();

  const addItem = (data: Omit<MediaItem, 'id' | 'dateLogged'> & { id?: string; dateLogged?: string }) => {
    const today = new Date().toISOString().split('T')[0];
    const rawStatus = (data.status as string) === 'completed' ? 'watched' : (data.status as string) === 'plan_to_watch' ? 'watch_later' : data.status;

    const newItem: MediaItem = normalizeItem({
      ...data,
      status: rawStatus,
      id: data.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dateLogged: data.dateLogged || today,
      isFavorite: data.isFavorite ?? false,
      inWatchlist: data.inWatchlist ?? false,
      rating: data.rating ?? 0,
      diaryLogs: data.diaryLogs || [],
    });

    // If rated or status is watched, create a diary entry automatically if none exists
    if (
      (newItem.status === 'watched' || newItem.rating > 0) &&
      (!newItem.diaryLogs || newItem.diaryLogs.length === 0)
    ) {
      newItem.diaryLogs = [
        {
          id: `log-${Date.now()}`,
          watchedDate: newItem.dateWatched || today,
          rating: newItem.rating,
          notes: newItem.notes,
          seasonLogged: newItem.category === 'tv'
            ? `Season ${newItem.currentSeason || 1}`
            : newItem.category === 'anime'
            ? `Season ${newItem.animeCurrentSeason || 1}`
            : undefined,
        },
      ];
      newItem.dateWatched = newItem.dateWatched || today;
    }

    setItems((prev) => {
      const existsIndex = prev.findIndex((i) => i.id === newItem.id);
      if (existsIndex >= 0) {
        const copy = [...prev];
        copy[existsIndex] = newItem;
        return copy;
      }
      return [newItem, ...prev];
    });

    if (viewingItem && viewingItem.id === newItem.id) {
      setViewingItem(newItem);
    }
  };

  const updateItem = (updated: MediaItem) => {
    const normalized = normalizeItem(updated);
    setItems((prev) => {
      const exists = prev.some((i) => i.id === updated.id);
      if (!exists) {
        return prev;
      }
      return prev.map((item) => (item.id === updated.id ? normalized : item));
    });
    if (viewingItem && viewingItem.id === updated.id) {
      setViewingItem(normalized);
    }
  };

  const deleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (viewingItem && viewingItem.id === id) {
      setViewingItem(null);
    }
    if (editingItem && editingItem.id === id) {
      setEditingItem(null);
    }
  };

  const toggleFavorite = (id: string) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === id);
      if (!exists && viewingItem && viewingItem.id === id) {
        const newItem = normalizeItem({ ...viewingItem, isFavorite: !viewingItem.isFavorite });
        setViewingItem(newItem);
        return [newItem, ...prev];
      }
      return prev.map((item) => {
        if (item.id !== id) return item;
        const newItem = { ...item, isFavorite: !item.isFavorite };
        if (viewingItem && viewingItem.id === id) setViewingItem(newItem);
        return newItem;
      });
    });
  };

  const toggleWatchlist = (id: string) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === id);
      if (!exists && viewingItem && viewingItem.id === id) {
        const newItem = normalizeItem({ ...viewingItem, inWatchlist: !viewingItem.inWatchlist });
        setViewingItem(newItem);
        return [newItem, ...prev];
      }
      return prev.map((item) => {
        if (item.id !== id) return item;
        const newItem = { ...item, inWatchlist: !item.inWatchlist };
        if (viewingItem && viewingItem.id === id) setViewingItem(newItem);
        return newItem;
      });
    });
  };

  // Increment season for TV or Anime: marked as watched according to seasons
  const incrementSeason = (id: string) => {
    setItems((prev) => {
      const exists = prev.some((i) => i.id === id);
      const targetItem = exists ? prev.find((i) => i.id === id)! : viewingItem;
      if (!targetItem) return prev;

      const today = new Date().toISOString().split('T')[0];
      let updatedItem: MediaItem = { ...targetItem };

      if (targetItem.category === 'tv') {
        const curSeason = targetItem.currentSeason || 0;
        const totalSeasons = targetItem.totalSeasons || 1;
        const nextSeason = Math.min(curSeason + 1, totalSeasons);
        const isAllSeasonsWatched = nextSeason >= totalSeasons;

        const newLog: DiaryEntry = {
          id: `log-${Date.now()}`,
          watchedDate: today,
          rating: targetItem.rating || 4.5,
          notes: `Watched Season ${nextSeason}`,
          seasonLogged: `Season ${nextSeason}`,
        };

        updatedItem = normalizeItem({
          ...targetItem,
          currentSeason: nextSeason,
          status: isAllSeasonsWatched ? 'watched' : 'watching',
          dateWatched: today,
          diaryLogs: [newLog, ...(targetItem.diaryLogs || [])],
        });
      } else if (targetItem.category === 'anime') {
        const curSeason = targetItem.animeCurrentSeason || 0;
        const totalSeasons = targetItem.animeTotalSeasons || 1;
        const nextSeason = Math.min(curSeason + 1, totalSeasons);
        const isAllSeasonsWatched = nextSeason >= totalSeasons;

        const newLog: DiaryEntry = {
          id: `log-${Date.now()}`,
          watchedDate: today,
          rating: targetItem.rating || 4.5,
          notes: `Watched Season ${nextSeason}`,
          seasonLogged: `Season ${nextSeason}`,
        };

        updatedItem = normalizeItem({
          ...targetItem,
          animeCurrentSeason: nextSeason,
          status: isAllSeasonsWatched ? 'watched' : 'watching',
          dateWatched: today,
          diaryLogs: [newLog, ...(targetItem.diaryLogs || [])],
        });
      } else {
        updatedItem = normalizeItem({
          ...targetItem,
          status: 'watched',
          dateWatched: today,
        });
      }

      if (viewingItem && viewingItem.id === id) setViewingItem(updatedItem);

      if (!exists) {
        return [updatedItem, ...prev];
      }
      return prev.map((item) => (item.id === id ? updatedItem : item));
    });
  };

  const markSeasonWatched = (id: string, seasonNumber: number) => {
    const today = new Date().toISOString().split('T')[0];
    setItems((prev) => {
      const exists = prev.some((i) => i.id === id);
      const targetItem = exists ? prev.find((i) => i.id === id)! : viewingItem;
      if (!targetItem) return prev;

      let updatedItem: MediaItem = { ...targetItem };
      if (targetItem.category === 'tv') {
        const total = targetItem.totalSeasons || 1;
        const isFinished = seasonNumber >= total;
        const newLog: DiaryEntry = {
          id: `log-${Date.now()}`,
          watchedDate: today,
          rating: targetItem.rating || 4.5,
          notes: `Marked Season ${seasonNumber} as watched`,
          seasonLogged: `Season ${seasonNumber}`,
        };
        updatedItem = normalizeItem({
          ...targetItem,
          currentSeason: seasonNumber,
          status: isFinished ? 'watched' : targetItem.status,
          dateWatched: today,
          diaryLogs: [newLog, ...(targetItem.diaryLogs || [])],
        });
      } else if (targetItem.category === 'anime') {
        const total = targetItem.animeTotalSeasons || 1;
        const isFinished = seasonNumber >= total;
        const newLog: DiaryEntry = {
          id: `log-${Date.now()}`,
          watchedDate: today,
          rating: targetItem.rating || 4.5,
          notes: `Marked Season ${seasonNumber} as watched`,
          seasonLogged: `Season ${seasonNumber}`,
        };
        updatedItem = normalizeItem({
          ...targetItem,
          animeCurrentSeason: seasonNumber,
          status: isFinished ? 'watched' : targetItem.status,
          dateWatched: today,
          diaryLogs: [newLog, ...(targetItem.diaryLogs || [])],
        });
      }

      if (viewingItem && viewingItem.id === id) setViewingItem(updatedItem);

      if (!exists) {
        return [updatedItem, ...prev];
      }
      return prev.map((item) => (item.id === id ? updatedItem : item));
    });
  };

  const logDiaryEntry = (mediaId: string, entry: Omit<DiaryEntry, 'id'>) => {
    const newLog: DiaryEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };

    setItems((prev) => {
      const exists = prev.some((i) => i.id === mediaId);
      if (!exists && viewingItem && viewingItem.id === mediaId) {
        const newItem = normalizeItem({
          ...viewingItem,
          status: 'watched',
          rating: entry.rating || viewingItem.rating,
          dateWatched: entry.watchedDate,
          notes: entry.notes || viewingItem.notes,
          diaryLogs: [newLog, ...(viewingItem.diaryLogs || [])],
        });
        setViewingItem(newItem);
        return [newItem, ...prev];
      }
      return prev.map((item) => {
        if (item.id !== mediaId) return item;
        const newItem = normalizeItem({
          ...item,
          status: 'watched',
          rating: entry.rating || item.rating,
          dateWatched: entry.watchedDate,
          notes: entry.notes || item.notes,
          diaryLogs: [newLog, ...(item.diaryLogs || [])],
        });
        if (viewingItem && viewingItem.id === mediaId) setViewingItem(newItem);
        return newItem;
      });
    });
  };

  const openAddModalWithPreset = (preset?: Partial<MediaItem>) => {
    if (preset) {
      const rawStatus = (preset.status as string) === 'completed' ? 'watched' : (preset.status as string) === 'plan_to_watch' ? 'watch_later' : preset.status;
      setEditingItem({
        id: '',
        title: preset.title || '',
        originalTitle: preset.originalTitle || '',
        category: preset.category || 'movie',
        releaseYear: preset.releaseYear || new Date().getFullYear(),
        language: preset.language || 'English',
        genres: preset.genres || [],
        status: rawStatus || 'watch_later',
        rating: preset.rating || 0,
        dateLogged: new Date().toISOString().split('T')[0],
        dateWatched: preset.dateWatched,
        notes: preset.notes || '',
        isFavorite: preset.isFavorite ?? false,
        inWatchlist: preset.inWatchlist ?? false,
        posterUrl: preset.posterUrl || '',
        overview: preset.overview || '',
        currentSeason: preset.currentSeason || 1,
        totalSeasons: preset.totalSeasons || 1,
        animeCurrentSeason: preset.animeCurrentSeason || 1,
        animeTotalSeasons: preset.animeTotalSeasons || 1,
      });
    } else {
      setEditingItem(null);
    }
    setIsAddModalOpen(true);
  };

  const resetToDemoData = () => {
    resetAllData();
  };

  const resetAllData = () => {
    setItems([]);
    setCustomLists([]);
    try {
      localStorage.removeItem(STORAGE_KEY_ITEMS);
      localStorage.removeItem(STORAGE_KEY_CUSTOM_LISTS);
    } catch (_) {}
    setViewingItem(null);
    setEditingItem(null);
  };

  const exportData = () => {
    const payload = {
      appName: 'KINO',
      version: 2,
      exportedAt: new Date().toISOString(),
      itemCount: items.length,
      customListCount: customLists.length,
      items,
      customLists,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `kino_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importData = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        mergeImportData(parsed, [], true);
        return true;
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) {
        mergeImportData(parsed.items, Array.isArray(parsed.customLists) ? parsed.customLists : [], true);
        return true;
      }
    } catch (e) {
      console.error('Invalid JSON import:', e);
    }
    return false;
  };

  const mergeImportData = (
    incomingItems: MediaItem[],
    incomingLists: string[],
    overwriteConflicts: boolean
  ): { addedCount: number; updatedCount: number; listsAddedCount: number } => {
    let listsAddedCount = 0;
    const existingListSet = new Set(customLists);
    const combinedLists = [...customLists];

    // Merge custom lists
    for (const list of incomingLists) {
      const trimmed = list.trim();
      if (trimmed && !existingListSet.has(trimmed)) {
        existingListSet.add(trimmed);
        combinedLists.push(trimmed);
        listsAddedCount++;
      }
    }
    if (listsAddedCount > 0) {
      setCustomLists(combinedLists);
    }

    let addedCount = 0;
    let updatedCount = 0;

    setItems((currentItems) => {
      const updatedList = [...currentItems];

      for (const rawItem of incomingItems) {
        const item = normalizeItem(rawItem);
        // Also capture any customLists tagged on the item itself
        if (item.customLists && item.customLists.length > 0) {
          for (const listName of item.customLists) {
            const trimmed = listName.trim();
            if (trimmed && !existingListSet.has(trimmed)) {
              existingListSet.add(trimmed);
              combinedLists.push(trimmed);
              listsAddedCount++;
            }
          }
        }

        const existingIndex = updatedList.findIndex(
          (curr) =>
            curr.id === item.id ||
            (curr.title.trim().toLowerCase() === item.title.trim().toLowerCase() &&
              curr.releaseYear === item.releaseYear &&
              curr.category === item.category)
        );

        if (existingIndex >= 0) {
          if (overwriteConflicts) {
            updatedList[existingIndex] = {
              ...item,
              id: updatedList[existingIndex].id, // keep stable ID
            };
            updatedCount++;
          }
        } else {
          updatedList.unshift(item);
          addedCount++;
        }
      }

      if (listsAddedCount > 0) {
        setCustomLists([...combinedLists]);
      }

      return updatedList;
    });

    return { addedCount, updatedCount, listsAddedCount };
  };

  return (
    <MediaContext.Provider
      value={{
        items,
        customLists,
        addCustomList,
        removeCustomList,
        toggleItemInCustomList,
        activeTab,
        setActiveTab,
        watchlistSubTab,
        setWatchlistSubTab,
        librarySelectedList,
        setLibrarySelectedList,
        isSearchModalOpen,
        setIsSearchModalOpen,
        isAddModalOpen,
        setIsAddModalOpen,
        editingItem,
        setEditingItem,
        viewingItem,
        setViewingItem,
        isTMDBModalOpen,
        setIsTMDBModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        isRandomPickerOpen,
        setIsRandomPickerOpen,
        categoryFilter,
        setCategoryFilter,
        languageFilter,
        setLanguageFilter,
        statusFilter,
        setStatusFilter,
        addItem,
        updateItem,
        deleteItem,
        toggleFavorite,
        toggleWatchlist,
        incrementSeason,
        markSeasonWatched,
        logDiaryEntry,
        openAddModalWithPreset,
        resetToDemoData,
        resetAllData,
        exportData,
        importData,
        mergeImportData,
        allLanguages,
      }}
    >
      {children}
    </MediaContext.Provider>
  );
};

export const useMedia = () => {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return context;
};
