/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  MediaItem,
  MediaCategory,
  WatchStatus,
  ActiveTab,
  WatchlistSubTab,
  DiaryEntry,
  SyncStatus,
} from '../types/media.ts';
import {
  auth,
  db,
  signInWithGoogle,
  signOutUser,
  sanitizeForFirestore,
  onAuthStateChanged,
  getDocs,
  getDoc,
  setDoc,
  doc,
  collection,
  onSnapshot,
  writeBatch,
  getRedirectResult,
  User,
} from '../services/firebase.ts';

const STORAGE_KEY_ITEMS = 'cinepulse_tracker_items_v2';
const STORAGE_KEY_CUSTOM_LISTS = 'cinepulse_custom_lists_v1';
const STORAGE_KEY_LAST_SYNCED = 'kino_last_synced_at';

// Helper to batch write items in chunks of at most 400 writes
async function batchWriteItems(uid: string, itemsList: MediaItem[]) {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < itemsList.length; i += CHUNK_SIZE) {
    const chunk = itemsList.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      const itemRef = doc(db, 'users', uid, 'items', item.id);
      batch.set(itemRef, sanitizeForFirestore(item), { merge: true });
    }
    await batch.commit();
  }
}

// Migration & normalization helper
function normalizeItem(item: any): MediaItem {
  let status: WatchStatus = item.status || 'none';
  if ((item.status as string) === 'completed') {
    status = 'watched';
  } else if ((item.status as string) === 'plan_to_watch') {
    status = 'watch_later';
  }

  // Ensure season-based fields exist
  const currentSeason =
    item.currentSeason ?? (item.category === 'tv' && status !== 'none' ? 1 : 0);
  const totalSeasons =
    item.totalSeasons ?? (item.category === 'tv' ? 1 : undefined);
  const animeCurrentSeason =
    item.animeCurrentSeason ??
    (item.category === 'anime' && status !== 'none' ? 1 : 0);
  const animeTotalSeasons =
    item.animeTotalSeasons ?? (item.category === 'anime' ? 1 : undefined);

  // Normalize diary entries
  const diaryLogs: DiaryEntry[] = (item.diaryLogs || []).map((log: any) => ({
    id: log.id || `log-${Date.now()}-${Math.random()}`,
    watchedDate: log.watchedDate || item.dateWatched || item.dateLogged,
    rating: log.rating || item.rating || 0,
    notes: log.notes,
    isRewatch: log.isRewatch,
    seasonLogged:
      log.seasonLogged ||
      log.seasonEpisodeLogged?.replace(/E\d+/i, '').trim() ||
      (item.category !== 'movie' ? 'Season 1' : undefined),
  }));

  const customLists: string[] = Array.isArray(item.customLists)
    ? item.customLists
    : [];

  return {
    ...item,
    status,
    currentSeason,
    totalSeasons,
    animeCurrentSeason,
    animeTotalSeasons,
    diaryLogs,
    customLists,
    updatedAt: item.updatedAt || new Date().toISOString(),
    deletedAt: item.deletedAt || undefined,
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
  addItem: (
    item: Omit<MediaItem, 'id' | 'dateLogged'> & {
      id?: string;
      dateLogged?: string;
    }
  ) => void;
  updateItem: (item: MediaItem) => void;
  deleteItem: (id: string) => void;
  unwatchItem: (id: string) => void;
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

  // Cloud Sync & Auth
  user: User | null;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  manualSync: () => Promise<void>;
}

const MediaContext = createContext<MediaContextType | null>(null);

export const MediaProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // All internal items including tombstones for multi-device sync
  const [allItems, setAllItems] = useState<MediaItem[]>(() => {
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

  // Active items exposed to views (tombstoned items hidden)
  const items = useMemo(() => allItems.filter((i) => !i.deletedAt), [allItems]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [watchlistSubTab, setWatchlistSubTab] =
    useState<WatchlistSubTab>('watch_later');
  const [librarySelectedList, setLibrarySelectedList] =
    useState<string>('watched');

  // Custom Lists: Start empty or load from localStorage
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

  // Auth & Cloud Sync State
  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_LAST_SYNCED);
    } catch (_) {
      return null;
    }
  });

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

  // Refs for tracking debounced changes & avoiding echo loops
  const isRemoteUpdateRef = useRef(false);
  const dirtyItemIdsRef = useRef<Set<string>>(new Set());
  const dirtyListsRef = useRef(false);
  const allItemsRef = useRef(allItems);
  const customListsRef = useRef(customLists);
  const userRef = useRef(user);

  useEffect(() => {
    allItemsRef.current = allItems;
  }, [allItems]);

  useEffect(() => {
    customListsRef.current = customLists;
  }, [customLists]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Persist items to localStorage (cinepulse_tracker_items_v2)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(allItems));
    } catch (e) {
      console.error('Error writing media items to localStorage:', e);
    }
  }, [allItems]);

  // Persist customLists to localStorage (cinepulse_custom_lists_v1)
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_CUSTOM_LISTS,
        JSON.stringify(customLists)
      );
    } catch (_) {}
  }, [customLists]);

  // Keep viewingItem updated if item changes or close it if deleted
  useEffect(() => {
    if (viewingItem) {
      const updated = allItems.find((i) => i.id === viewingItem.id);
      if (updated) {
        if (updated.deletedAt) {
          setViewingItem(null);
        } else {
          setViewingItem(updated);
        }
      }
    }
  }, [allItems]);

  // Network online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      if (userRef.current) {
        setSyncStatus('synced');
      } else {
        setSyncStatus('offline');
      }
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      setSyncStatus('offline');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle Firebase redirect result (for fallback redirects)
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) {
          setUser(result.user);
        }
      })
      .catch((err) => {
        console.warn('Redirect sign-in check:', err);
      });
  }, []);

  // Debounced push to Firestore (800ms)
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleDebouncedPush = useCallback(() => {
    const currentUser = userRef.current;
    if (!currentUser || !navigator.onLine) {
      if (!navigator.onLine) setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');

    if (pushTimerRef.current) {
      clearTimeout(pushTimerRef.current);
    }

    pushTimerRef.current = setTimeout(async () => {
      try {
        if (isRemoteUpdateRef.current) {
          isRemoteUpdateRef.current = false;
          setSyncStatus('synced');
          return;
        }

        const dirtyIds = Array.from(dirtyItemIdsRef.current);
        if (dirtyIds.length > 0) {
          const currentItems = allItemsRef.current;
          const itemsToPush = currentItems.filter((i) =>
            dirtyIds.includes(i.id)
          );
          if (itemsToPush.length > 0) {
            await batchWriteItems(currentUser.uid, itemsToPush);
          }
          dirtyItemIdsRef.current.clear();
        }

        if (dirtyListsRef.current) {
          await setDoc(
            doc(db, 'users', currentUser.uid, 'meta', 'lists'),
            {
              customLists: customListsRef.current,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
          dirtyListsRef.current = false;
        }

        const now = new Date().toISOString();
        setLastSyncedAt(now);
        try {
          localStorage.setItem(STORAGE_KEY_LAST_SYNCED, now);
        } catch (_) {}
        setSyncStatus('synced');
      } catch (err) {
        console.error('Debounced sync push error:', err);
        setSyncStatus('error');
      }
    }, 800);
  }, []);

  // Sync execution upon sign-in
  const syncOnSignIn = useCallback(
    async (currentUser: User) => {
      if (!navigator.onLine) {
        setSyncStatus('offline');
        return;
      }
      setSyncStatus('syncing');

      try {
        // 1. Fetch remote items and custom lists
        const itemsSnap = await getDocs(
          collection(db, 'users', currentUser.uid, 'items')
        );
        const remoteItems: MediaItem[] = [];
        itemsSnap.forEach((docSnap) => {
          remoteItems.push(docSnap.data() as MediaItem);
        });

        const metaSnap = await getDoc(
          doc(db, 'users', currentUser.uid, 'meta', 'lists')
        );
        const remoteLists: string[] = metaSnap.exists()
          ? metaSnap.data().customLists || []
          : [];

        // 2. Rule 5: Never overwrite a non-empty remote library with an empty local one.
        // If local is empty and cloud has data, just download.
        const currentLocal = allItemsRef.current;
        const currentLists = customListsRef.current;
        const localActive = currentLocal.filter((i) => !i.deletedAt);
        const remoteActive = remoteItems.filter((i) => !i.deletedAt);

        let mergedItems: MediaItem[] = [];
        let mergedLists: string[] = [];
        const itemsToUpload: MediaItem[] = [];

        if (localActive.length === 0 && remoteActive.length > 0) {
          // Just download cloud data
          mergedItems = remoteItems.map(normalizeItem);
          mergedLists = remoteLists;
        } else {
          // Merge by ID using newest updatedAt
          const localMap = new Map<string, MediaItem>();
          currentLocal.forEach((i) => localMap.set(i.id, i));

          const remoteMap = new Map<string, MediaItem>();
          remoteItems.forEach((i) => remoteMap.set(i.id, i));

          const allKeys = new Set([
            ...localMap.keys(),
            ...remoteMap.keys(),
          ]);

          for (const id of allKeys) {
            const loc = localMap.get(id);
            const rem = remoteMap.get(id);

            if (loc && !rem) {
              mergedItems.push(loc);
              itemsToUpload.push(loc);
            } else if (!loc && rem) {
              mergedItems.push(normalizeItem(rem));
            } else if (loc && rem) {
              const locTime = new Date(loc.updatedAt || 0).getTime();
              const remTime = new Date(rem.updatedAt || 0).getTime();
              if (locTime >= remTime) {
                mergedItems.push(loc);
                if (locTime > remTime) {
                  itemsToUpload.push(loc);
                }
              } else {
                mergedItems.push(normalizeItem(rem));
              }
            }
          }

          // Merge custom lists
          mergedLists = Array.from(
            new Set([...currentLists, ...remoteLists])
          );
        }

        // Upload any local-only or newer local items in batches of at most 400
        if (itemsToUpload.length > 0) {
          await batchWriteItems(currentUser.uid, itemsToUpload);
        }

        // Upload merged custom lists if changed
        if (mergedLists.length > 0 || metaSnap.exists()) {
          await setDoc(
            doc(db, 'users', currentUser.uid, 'meta', 'lists'),
            {
              customLists: mergedLists,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }

        // Update local state & localStorage
        isRemoteUpdateRef.current = true;
        setAllItems(mergedItems);
        setCustomLists(mergedLists);

        try {
          localStorage.setItem(
            STORAGE_KEY_ITEMS,
            JSON.stringify(mergedItems)
          );
          localStorage.setItem(
            STORAGE_KEY_CUSTOM_LISTS,
            JSON.stringify(mergedLists)
          );
        } catch (_) {}

        const now = new Date().toISOString();
        setLastSyncedAt(now);
        try {
          localStorage.setItem(STORAGE_KEY_LAST_SYNCED, now);
        } catch (_) {}

        setSyncStatus('synced');
      } catch (err) {
        console.error('Initial cloud sync error:', err);
        setSyncStatus('error');
      }
    },
    []
  );

  // Monitor Auth State and trigger sync on login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await syncOnSignIn(firebaseUser);
      } else {
        setSyncStatus('offline');
      }
    });

    return () => unsub();
  }, [syncOnSignIn]);

  // Live remote listener with onSnapshot
  useEffect(() => {
    if (!user) return;

    const unsubItems = onSnapshot(
      collection(db, 'users', user.uid, 'items'),
      (snapshot) => {
        const changes = snapshot.docChanges();
        if (changes.length === 0) return;

        setAllItems((prev) => {
          let hasChanges = false;
          const copy = [...prev];

          for (const change of changes) {
            const remoteData = change.doc.data() as MediaItem;
            const remoteItem = normalizeItem(remoteData);
            const index = copy.findIndex((i) => i.id === remoteItem.id);

            if (index >= 0) {
              const local = copy[index];
              const localTime = new Date(local.updatedAt || 0).getTime();
              const remoteTime = new Date(
                remoteItem.updatedAt || 0
              ).getTime();

              if (remoteTime > localTime) {
                copy[index] = remoteItem;
                hasChanges = true;
              }
            } else {
              copy.unshift(remoteItem);
              hasChanges = true;
            }
          }

          if (hasChanges) {
            isRemoteUpdateRef.current = true;
            try {
              localStorage.setItem(
                STORAGE_KEY_ITEMS,
                JSON.stringify(copy)
              );
            } catch (_) {}
            const now = new Date().toISOString();
            setLastSyncedAt(now);
            try {
              localStorage.setItem(STORAGE_KEY_LAST_SYNCED, now);
            } catch (_) {}
            return copy;
          }
          return prev;
        });
      },
      (err) => {
        console.warn('Items onSnapshot error:', err);
        if (navigator.onLine) setSyncStatus('error');
      }
    );

    const unsubLists = onSnapshot(
      doc(db, 'users', user.uid, 'meta', 'lists'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.customLists)) {
            setCustomLists((prev) => {
              const isDifferent =
                data.customLists.length !== prev.length ||
                data.customLists.some(
                  (l: string, i: number) => l !== prev[i]
                );
              if (isDifferent) {
                isRemoteUpdateRef.current = true;
                try {
                  localStorage.setItem(
                    STORAGE_KEY_CUSTOM_LISTS,
                    JSON.stringify(data.customLists)
                  );
                } catch (_) {}
                return data.customLists;
              }
              return prev;
            });
          }
        }
      },
      (err) => {
        console.warn('Lists onSnapshot error:', err);
      }
    );

    return () => {
      unsubItems();
      unsubLists();
    };
  }, [user]);

  // Auth Action Helpers
  const signIn = async () => {
    try {
      setSyncStatus('syncing');
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setSyncStatus('error');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await signOutUser();
      setUser(null);
      setSyncStatus('offline');
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  const manualSync = async () => {
    if (!user) return;
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }
    await syncOnSignIn(user);
  };

  // Custom List Actions
  const addCustomList = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!customLists.includes(trimmed)) {
      setCustomLists((prev) => [...prev, trimmed]);
      dirtyListsRef.current = true;
      scheduleDebouncedPush();
    }
  };

  const removeCustomList = (name: string) => {
    const now = new Date().toISOString();
    setCustomLists((prev) => prev.filter((l) => l !== name));
    dirtyListsRef.current = true;
    setAllItems((prev) =>
      prev.map((item) => {
        if ((item.customLists || []).includes(name)) {
          dirtyItemIdsRef.current.add(item.id);
          return {
            ...item,
            customLists: (item.customLists || []).filter((l) => l !== name),
            updatedAt: now,
          };
        }
        return item;
      })
    );
    scheduleDebouncedPush();
  };

  const toggleItemInCustomList = (itemId: string, listName: string) => {
    const now = new Date().toISOString();
    dirtyItemIdsRef.current.add(itemId);
    dirtyListsRef.current = true;

    setAllItems((prev) => {
      const exists = prev.some((i) => i.id === itemId);
      if (!exists && viewingItem && viewingItem.id === itemId) {
        const current = viewingItem.customLists || [];
        const inList = current.includes(listName);
        const nextLists = inList
          ? current.filter((l) => l !== listName)
          : [...current, listName];
        const newItem = normalizeItem({
          ...viewingItem,
          status: viewingItem.status || 'none',
          customLists: nextLists,
          updatedAt: now,
        });
        setViewingItem(newItem);
        return [newItem, ...prev];
      }
      return prev.map((item) => {
        if (item.id !== itemId) return item;
        const current = item.customLists || [];
        const inList = current.includes(listName);
        const nextLists = inList
          ? current.filter((l) => l !== listName)
          : [...current, listName];
        const newItem = { ...item, customLists: nextLists, updatedAt: now };
        if (viewingItem && viewingItem.id === itemId) setViewingItem(newItem);
        return newItem;
      });
    });

    scheduleDebouncedPush();
  };

  // Compute distinct languages
  const allLanguages = Array.from(
    new Set(items.map((i) => i.language.trim()).filter(Boolean))
  ).sort();

  // Item Actions
  const addItem = (
    data: Omit<MediaItem, 'id' | 'dateLogged'> & {
      id?: string;
      dateLogged?: string;
    }
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    const rawStatus =
      (data.status as string) === 'completed'
        ? 'watched'
        : (data.status as string) === 'plan_to_watch'
        ? 'watch_later'
        : data.status;

    const newItem: MediaItem = normalizeItem({
      ...data,
      status: rawStatus,
      id:
        data.id ||
        `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dateLogged: data.dateLogged || today,
      isFavorite: data.isFavorite ?? false,
      inWatchlist: data.inWatchlist ?? false,
      rating: data.rating ?? 0,
      diaryLogs: data.diaryLogs || [],
      updatedAt: now,
      deletedAt: undefined,
    });

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
          seasonLogged:
            newItem.category === 'tv'
              ? `Season ${newItem.currentSeason || 1}`
              : newItem.category === 'anime'
              ? `Season ${newItem.animeCurrentSeason || 1}`
              : undefined,
        },
      ];
      newItem.dateWatched = newItem.dateWatched || today;
    }

    dirtyItemIdsRef.current.add(newItem.id);

    setAllItems((prev) => {
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

    scheduleDebouncedPush();
  };

  const updateItem = (updated: MediaItem) => {
    const now = new Date().toISOString();
    const normalized = normalizeItem({
      ...updated,
      updatedAt: now,
    });

    dirtyItemIdsRef.current.add(normalized.id);

    setAllItems((prev) => {
      const exists = prev.some((i) => i.id === updated.id);
      if (!exists) return prev;
      return prev.map((item) =>
        item.id === updated.id ? normalized : item
      );
    });

    if (viewingItem && viewingItem.id === updated.id) {
      setViewingItem(normalized);
    }

    scheduleDebouncedPush();
  };

  const deleteItem = (id: string) => {
    const now = new Date().toISOString();
    dirtyItemIdsRef.current.add(id);

    setAllItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, deletedAt: now, updatedAt: now }
          : item
      )
    );

    if (viewingItem && viewingItem.id === id) {
      setViewingItem(null);
    }
    if (editingItem && editingItem.id === id) {
      setEditingItem(null);
    }

    scheduleDebouncedPush();
  };

  const unwatchItem = (id: string) => {
    const now = new Date().toISOString();
    dirtyItemIdsRef.current.add(id);

    setAllItems((prev) => {
      const targetItem =
        prev.find((i) => i.id === id) ||
        (viewingItem && viewingItem.id === id ? viewingItem : null);
      if (!targetItem) return prev;

      const isInWatchlist = Boolean(targetItem.inWatchlist);
      const isFavorite = Boolean(targetItem.isFavorite);
      const hasCustomLists =
        Array.isArray(targetItem.customLists) &&
        targetItem.customLists.length > 0;
      const shouldKeep = isInWatchlist || isFavorite || hasCustomLists;

      const { dateWatched: _dw, notes: _n, ...cleanProps } = targetItem;
      const unwatchedItem: MediaItem = normalizeItem({
        ...cleanProps,
        status: isInWatchlist ? 'watch_later' : 'none',
        rating: 0,
        diaryLogs: [],
        currentSeason: 0,
        animeCurrentSeason: 0,
        dateWatched: undefined,
        notes: undefined,
        updatedAt: now,
      });

      if (shouldKeep) {
        if (viewingItem && viewingItem.id === id) {
          setViewingItem(unwatchedItem);
        }
        return prev.map((item) =>
          item.id === id ? unwatchedItem : item
        );
      } else {
        // Delete completely from library using tombstone
        const tombstoned: MediaItem = {
          ...unwatchedItem,
          isFavorite: false,
          inWatchlist: false,
          customLists: [],
          deletedAt: now,
          updatedAt: now,
        };
        if (viewingItem && viewingItem.id === id) {
          setViewingItem(tombstoned);
        }
        if (editingItem && editingItem.id === id) {
          setEditingItem(null);
        }
        return prev.map((item) =>
          item.id === id ? tombstoned : item
        );
      }
    });

    scheduleDebouncedPush();
  };

  const toggleFavorite = (id: string) => {
    const now = new Date().toISOString();
    dirtyItemIdsRef.current.add(id);

    setAllItems((prev) => {
      const exists = prev.some((i) => i.id === id);
      if (!exists && viewingItem && viewingItem.id === id) {
        const newItem = normalizeItem({
          ...viewingItem,
          status: viewingItem.status || 'none',
          isFavorite: !viewingItem.isFavorite,
          updatedAt: now,
        });
        setViewingItem(newItem);
        return [newItem, ...prev];
      }
      return prev.map((item) => {
        if (item.id !== id) return item;
        const newItem = {
          ...item,
          isFavorite: !item.isFavorite,
          updatedAt: now,
        };
        if (viewingItem && viewingItem.id === id) setViewingItem(newItem);
        return newItem;
      });
    });

    scheduleDebouncedPush();
  };

  const toggleWatchlist = (id: string) => {
    const now = new Date().toISOString();
    dirtyItemIdsRef.current.add(id);

    setAllItems((prev) => {
      const exists = prev.some((i) => i.id === id);
      if (!exists && viewingItem && viewingItem.id === id) {
        const nextInWatchlist = !viewingItem.inWatchlist;
        const nextStatus: WatchStatus = nextInWatchlist
          ? 'watch_later'
          : viewingItem.status === 'watch_later'
          ? 'none'
          : viewingItem.status || 'none';
        const newItem = normalizeItem({
          ...viewingItem,
          inWatchlist: nextInWatchlist,
          status: nextStatus,
          updatedAt: now,
        });
        setViewingItem(newItem);
        return [newItem, ...prev];
      }
      return prev.map((item) => {
        if (item.id !== id) return item;
        const nextInWatchlist = !item.inWatchlist;
        const nextStatus: WatchStatus = nextInWatchlist
          ? 'watch_later'
          : item.status === 'watch_later'
          ? 'none'
          : item.status;
        const newItem = {
          ...item,
          inWatchlist: nextInWatchlist,
          status: nextStatus,
          updatedAt: now,
        };
        if (viewingItem && viewingItem.id === id) setViewingItem(newItem);
        return newItem;
      });
    });

    scheduleDebouncedPush();
  };

  const incrementSeason = (id: string) => {
    const now = new Date().toISOString();
    dirtyItemIdsRef.current.add(id);

    setAllItems((prev) => {
      const exists = prev.some((i) => i.id === id);
      const targetItem = exists
        ? prev.find((i) => i.id === id)!
        : viewingItem;
      if (!targetItem) return prev;

      const today = now.split('T')[0];
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
          updatedAt: now,
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
          updatedAt: now,
        });
      } else {
        updatedItem = normalizeItem({
          ...targetItem,
          status: 'watched',
          dateWatched: today,
          updatedAt: now,
        });
      }

      if (viewingItem && viewingItem.id === id) setViewingItem(updatedItem);

      if (!exists) {
        return [updatedItem, ...prev];
      }
      return prev.map((item) => (item.id === id ? updatedItem : item));
    });

    scheduleDebouncedPush();
  };

  const markSeasonWatched = (id: string, seasonNumber: number) => {
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    dirtyItemIdsRef.current.add(id);

    setAllItems((prev) => {
      const exists = prev.some((i) => i.id === id);
      const targetItem = exists
        ? prev.find((i) => i.id === id)!
        : viewingItem;
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
          updatedAt: now,
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
          updatedAt: now,
        });
      }

      if (viewingItem && viewingItem.id === id) setViewingItem(updatedItem);

      if (!exists) {
        return [updatedItem, ...prev];
      }
      return prev.map((item) => (item.id === id ? updatedItem : item));
    });

    scheduleDebouncedPush();
  };

  const logDiaryEntry = (
    mediaId: string,
    entry: Omit<DiaryEntry, 'id'>
  ) => {
    const now = new Date().toISOString();
    dirtyItemIdsRef.current.add(mediaId);

    const newLog: DiaryEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };

    setAllItems((prev) => {
      const exists = prev.some((i) => i.id === mediaId);
      if (!exists && viewingItem && viewingItem.id === mediaId) {
        const newItem = normalizeItem({
          ...viewingItem,
          status: 'watched',
          rating: entry.rating || viewingItem.rating,
          dateWatched: entry.watchedDate,
          notes: entry.notes || viewingItem.notes,
          diaryLogs: [newLog, ...(viewingItem.diaryLogs || [])],
          updatedAt: now,
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
          updatedAt: now,
        });
        if (viewingItem && viewingItem.id === mediaId) setViewingItem(newItem);
        return newItem;
      });
    });

    scheduleDebouncedPush();
  };

  const openAddModalWithPreset = (preset?: Partial<MediaItem>) => {
    if (preset) {
      const rawStatus =
        (preset.status as string) === 'completed'
          ? 'watched'
          : (preset.status as string) === 'plan_to_watch'
          ? 'watch_later'
          : preset.status;
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
    const now = new Date().toISOString();
    if (userRef.current) {
      // Tombstone all items so deletions propagate to the cloud
      allItemsRef.current.forEach((i) => dirtyItemIdsRef.current.add(i.id));
      dirtyListsRef.current = true;
      setAllItems((prev) =>
        prev.map((i) => ({ ...i, deletedAt: now, updatedAt: now }))
      );
      scheduleDebouncedPush();
    } else {
      setAllItems([]);
    }

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
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `kino_backup_${new Date().toISOString().split('T')[0]}.json`
    );
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
      } else if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray(parsed.items)
      ) {
        mergeImportData(
          parsed.items,
          Array.isArray(parsed.customLists) ? parsed.customLists : [],
          true
        );
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
    const now = new Date().toISOString();
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
      dirtyListsRef.current = true;
    }

    let addedCount = 0;
    let updatedCount = 0;

    setAllItems((currentItems) => {
      const updatedList = [...currentItems];

      for (const rawItem of incomingItems) {
        const item = normalizeItem({
          ...rawItem,
          updatedAt: rawItem.updatedAt || now,
        });

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
            (curr.title.trim().toLowerCase() ===
              item.title.trim().toLowerCase() &&
              curr.releaseYear === item.releaseYear &&
              curr.category === item.category)
        );

        if (existingIndex >= 0) {
          const existing = updatedList[existingIndex];
          const incomingIsNewer =
            new Date(item.updatedAt || 0).getTime() >
            new Date(existing.updatedAt || 0).getTime();

          if (overwriteConflicts || incomingIsNewer) {
            const mergedItem: MediaItem = {
              ...item,
              id: existing.id, // keep stable ID
              updatedAt: now,
            };
            updatedList[existingIndex] = mergedItem;
            dirtyItemIdsRef.current.add(existing.id);
            updatedCount++;
          }
        } else {
          dirtyItemIdsRef.current.add(item.id);
          updatedList.unshift(item);
          addedCount++;
        }
      }

      if (listsAddedCount > 0) {
        setCustomLists([...combinedLists]);
        dirtyListsRef.current = true;
      }

      return updatedList;
    });

    scheduleDebouncedPush();
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
        unwatchItem,
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
        user,
        syncStatus,
        lastSyncedAt,
        signIn,
        signOut,
        manualSync,
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
