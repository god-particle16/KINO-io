/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Film,
  Heart,
  Bookmark,
  CheckCircle2,
  Plus,
  X,
  FolderPlus,
  Trash2,
  Check,
} from 'lucide-react';
import { useMedia } from '../context/MediaContext.tsx';
import { MediaCard } from './MediaCard.tsx';
import { MediaCategory } from '../types/media.ts';

export const LibraryView: React.FC = () => {
  const {
    items,
    customLists,
    addCustomList,
    removeCustomList,
    toggleItemInCustomList,
    openAddModalWithPreset,
  } = useMedia();

  // Active Selected List: 'watched' | 'watchlist' | 'favorites' | string (custom list name)
  const [selectedList, setSelectedList] = useState<string>('watched');
  const [categoryFilter, setCategoryFilter] = useState<'all' | MediaCategory>('all');

  // Custom List creation inline state
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Manage titles in custom list modal state
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // Compute items strictly belonging to the currently selected list
  const currentListItems = useMemo(() => {
    switch (selectedList) {
      case 'watched':
        return items.filter((i) => i.status === 'watched');
      case 'watchlist':
        return items.filter((i) => i.inWatchlist || i.status === 'watch_later');
      case 'favorites':
        return items.filter((i) => i.isFavorite);
      default:
        // User-created Custom List
        return items.filter((i) => (i.customLists || []).includes(selectedList));
    }
  }, [items, selectedList]);

  // Counts for each category within the currently active list
  const allCount = currentListItems.length;
  const moviesCount = currentListItems.filter((i) => i.category === 'movie').length;
  const tvCount = currentListItems.filter((i) => i.category === 'tv').length;
  const animeCount = currentListItems.filter((i) => i.category === 'anime').length;

  // Final filtered items according to individual category pill
  const filteredItems = useMemo(() => {
    let result = currentListItems;
    if (categoryFilter !== 'all') {
      result = result.filter((i) => i.category === categoryFilter);
    }
    return [...result].sort(
      (a, b) => new Date(b.dateLogged).getTime() - new Date(a.dateLogged).getTime()
    );
  }, [currentListItems, categoryFilter]);

  // Overall counts for tabs
  const watchedTotal = items.filter((i) => i.status === 'watched').length;
  const watchlistTotal = items.filter((i) => i.inWatchlist || i.status === 'watch_later').length;
  const favoritesTotal = items.filter((i) => i.isFavorite).length;

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newListName.trim();
    if (!trimmed) return;
    addCustomList(trimmed);
    setSelectedList(trimmed);
    setNewListName('');
    setIsCreatingList(false);
    setCategoryFilter('all');
  };

  const isCustomList =
    selectedList !== 'watched' && selectedList !== 'watchlist' && selectedList !== 'favorites';

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Main List Tabs (Watched, Watch List, Favorites, and Custom Lists) - Separate individual elements, non-scrolling */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Watched Tab */}
        <button
          type="button"
          onClick={() => {
            setSelectedList('watched');
            setCategoryFilter('all');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedList === 'watched'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/25 border border-emerald-400/40'
              : 'bg-[#0c0e15] text-slate-300 hover:text-white border border-white/[0.08] hover:border-white/[0.16] hover:bg-[#121624]'
          }`}
        >
          <CheckCircle2 className={`w-3.5 h-3.5 ${selectedList === 'watched' ? 'text-white' : 'text-emerald-400'}`} />
          <span>Watched</span>
          <span
            className={`font-mono text-[11px] tabular-nums px-1.5 py-0.5 rounded ${
              selectedList === 'watched' ? 'bg-black/25 text-white' : 'bg-white/[0.06] text-slate-400'
            }`}
          >
            {watchedTotal}
          </span>
        </button>

        {/* Watch List Tab */}
        <button
          type="button"
          onClick={() => {
            setSelectedList('watchlist');
            setCategoryFilter('all');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedList === 'watchlist'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/25 border border-indigo-400/40'
              : 'bg-[#0c0e15] text-slate-300 hover:text-white border border-white/[0.08] hover:border-white/[0.16] hover:bg-[#121624]'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${selectedList === 'watchlist' ? 'text-white' : 'text-indigo-400'}`} />
          <span>Watch List</span>
          <span
            className={`font-mono text-[11px] tabular-nums px-1.5 py-0.5 rounded ${
              selectedList === 'watchlist' ? 'bg-black/25 text-white' : 'bg-white/[0.06] text-slate-400'
            }`}
          >
            {watchlistTotal}
          </span>
        </button>

        {/* Favorites Tab */}
        <button
          type="button"
          onClick={() => {
            setSelectedList('favorites');
            setCategoryFilter('all');
          }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedList === 'favorites'
              ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-600/25 border border-rose-400/40'
              : 'bg-[#0c0e15] text-slate-300 hover:text-white border border-white/[0.08] hover:border-white/[0.16] hover:bg-[#121624]'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${selectedList === 'favorites' ? 'fill-white text-white' : 'text-rose-400'}`} />
          <span>Favorites</span>
          <span
            className={`font-mono text-[11px] tabular-nums px-1.5 py-0.5 rounded ${
              selectedList === 'favorites' ? 'bg-black/25 text-white' : 'bg-white/[0.06] text-slate-400'
            }`}
          >
            {favoritesTotal}
          </span>
        </button>

        {/* User-created Custom Lists */}
        {customLists.map((listName) => {
          const count = items.filter((i) => (i.customLists || []).includes(listName)).length;
          const isActive = selectedList === listName;
          return (
            <div
              key={listName}
              className={`group flex items-center gap-2 pl-3.5 pr-2 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-600/25 border border-violet-400/40'
                  : 'bg-[#0c0e15] text-slate-300 hover:text-white border border-white/[0.08] hover:border-white/[0.16] hover:bg-[#121624]'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedList(listName);
                  setCategoryFilter('all');
                }}
                className="flex items-center gap-2 cursor-pointer focus:outline-none"
              >
                <FolderPlus className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-purple-400'}`} />
                <span>{listName}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-black/25 text-white' : 'bg-white/[0.06] text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCustomList(listName);
                  if (selectedList === listName) {
                    setSelectedList('watched');
                  }
                }}
                title={`Delete "${listName}" list`}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  isActive
                    ? 'text-white/60 hover:text-white hover:bg-black/20'
                    : 'text-slate-500 hover:text-rose-400 hover:bg-white/[0.06]'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {/* Add Custom List Trigger or Inline Form */}
        {isCreatingList ? (
          <form
            onSubmit={handleCreateList}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0c0e15] border border-indigo-500/50 rounded-xl shadow-lg shadow-indigo-500/10"
          >
            <input
              type="text"
              autoFocus
              placeholder="List name (e.g. Anime Classics)..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="px-1 text-xs bg-transparent text-white placeholder-slate-500 focus:outline-none w-44"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingList(false);
                setNewListName('');
              }}
              className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsCreatingList(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0c0e15] hover:bg-[#121624] border border-dashed border-white/[0.15] hover:border-indigo-500/50 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Create a new custom list"
          >
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>+ Custom List</span>
          </button>
        )}
      </div>

      {/* 2. Individual Category Filter Bar (All, Movies, TV Series, Anime for the active list) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Category Pills in Indigo Violet with individual counts */}
        <div className="flex items-center gap-1">
          {[
            { id: 'all' as const, label: 'All', count: allCount },
            { id: 'movie' as const, label: 'Movies', count: moviesCount },
            { id: 'tv' as const, label: 'TV Series', count: tvCount },
            { id: 'anime' as const, label: 'Anime', count: animeCount },
          ].map((cat) => {
            const isActive = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/35 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <span>{cat.label}</span>
                <span className="font-mono text-[10px] tabular-nums opacity-80">
                  ({cat.count})
                </span>
              </button>
            );
          })}
        </div>

        {/* When in a Custom List: Provide "+ Manage Titles" button */}
        {isCustomList && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsManageModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add / Manage Titles in "{selectedList}"</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Items Grid or Informative Empty State */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-[#0c0e15] border border-white/[0.04] rounded-xl space-y-3">
          {selectedList === 'watched' && <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto" />}
          {selectedList === 'watchlist' && <Bookmark className="w-8 h-8 text-indigo-400/60 mx-auto" />}
          {selectedList === 'favorites' && <Heart className="w-8 h-8 text-rose-400/60 mx-auto" />}
          {isCustomList && <FolderPlus className="w-8 h-8 text-purple-400/60 mx-auto" />}

          <p className="text-sm font-semibold text-slate-300">
            {selectedList === 'watched' && 'No watched titles in this category'}
            {selectedList === 'watchlist' && 'Your Watch List is empty in this category'}
            {selectedList === 'favorites' && 'No favorite titles in this category'}
            {isCustomList && `No titles in "${selectedList}" for this category`}
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isCustomList
              ? `Add titles from your library into "${selectedList}" using the Manage Titles button.`
              : 'Add new titles from TMDB search or mark existing titles to populate this list.'}
          </p>

          <div className="flex items-center justify-center gap-2 pt-1">
            {isCustomList ? (
              <button
                onClick={() => setIsManageModalOpen(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-violet-600/30 cursor-pointer"
              >
                Add Titles to "{selectedList}"
              </button>
            ) : (
              <button
                onClick={() => openAddModalWithPreset()}
                className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                Add Title
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredItems.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* 4. Manage Titles in Custom List Modal */}
      {isManageModalOpen && isCustomList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsManageModalOpen(false)}
        >
          <div
            className="relative w-full max-w-xl bg-[#0b0d15] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-[#0e111d]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-purple-400" />
                  <span>Manage Titles in "{selectedList}"</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click on any title to add or remove it from this custom list
                </p>
              </div>
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Titles Checklist */}
            <div className="overflow-y-auto flex-1 p-4 divide-y divide-white/[0.04]">
              {items.map((item) => {
                const inList = (item.customLists || []).includes(selectedList);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleItemInCustomList(item.id, selectedList)}
                    className="py-2.5 px-3 flex items-center justify-between hover:bg-white/[0.03] rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-10 bg-slate-800 rounded overflow-hidden shrink-0 border border-white/[0.06]">
                        {item.posterUrl ? (
                          <img
                            src={item.posterUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500 font-bold">
                            {item.category[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-purple-300 block truncate">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          {item.releaseYear} · {item.language} ·{' '}
                          <span className="capitalize">{item.category}</span>
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                        inList
                          ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                          : 'border-white/[0.2] bg-black/40 group-hover:border-purple-400/60'
                      }`}
                    >
                      {inList && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white/[0.08] bg-[#0e111d] flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {currentListItems.length} {currentListItems.length === 1 ? 'title' : 'titles'} in this list
              </span>
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors cursor-pointer shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
