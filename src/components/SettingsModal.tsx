/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Settings,
  Download,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  AlertTriangle,
  Server,
  Layers,
  Film,
  ListFilter,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useMedia } from '../context/MediaContext.tsx';
import { getTMDBProxyUrl, setTMDBProxyUrl } from '../services/tmdb.ts';
import { MediaItem } from '../types/media.ts';

interface PendingImport {
  fileName: string;
  incomingItems: MediaItem[];
  incomingLists: string[];
  conflicts: { existing: MediaItem; incoming: MediaItem }[];
  newItems: MediaItem[];
}

export const SettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    items,
    customLists,
    exportData,
    mergeImportData,
    resetAllData,
  } = useMedia();

  // Proxy state
  const [proxyUrl, setProxyUrl] = useState('');
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [proxyStatus, setProxyStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Import state
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset / Danger zone state
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Sync proxy on open
  useEffect(() => {
    if (isSettingsModalOpen) {
      setProxyUrl(getTMDBProxyUrl());
      setProxyStatus(null);
      setPendingImport(null);
      setImportStatus(null);
      setIsResetOpen(false);
      setDeleteConfirmationInput('');
      setResetSuccessMessage(null);
    }
  }, [isSettingsModalOpen]);

  if (!isSettingsModalOpen) return null;

  // TMDB Proxy Handlers
  const handleSaveProxy = () => {
    const clean = proxyUrl.trim().replace(/\/+$/, '');
    setTMDBProxyUrl(clean);
    setProxyStatus({
      type: 'success',
      message: clean
        ? 'Cloudflare proxy URL saved to browser storage.'
        : 'Proxy URL cleared. The app will check VITE_TMDB_PROXY_URL.',
    });
  };

  const handleTestProxy = async () => {
    const activeUrl = (proxyUrl.trim() || getTMDBProxyUrl()).replace(/\/+$/, '');
    if (!activeUrl) {
      setProxyStatus({
        type: 'error',
        message: 'Please provide a Cloudflare proxy URL to test.',
      });
      return;
    }

    setIsTestingProxy(true);
    setProxyStatus(null);

    try {
      const res = await fetch(`${activeUrl}/api/trending/movie/week`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      });

      if (res.ok) {
        setTMDBProxyUrl(activeUrl);
        setProxyStatus({
          type: 'success',
          message: 'Connection verified! Cloudflare proxy is active and reachable.',
        });
      } else {
        setProxyStatus({
          type: 'error',
          message: `Proxy returned error status (${res.status}: ${res.statusText}).`,
        });
      }
    } catch (err: any) {
      setProxyStatus({
        type: 'error',
        message: 'Network error: Cloudflare proxy is unreachable.',
      });
    } finally {
      setIsTestingProxy(false);
    }
  };

  // Import Backup Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let incomingItems: any[] = [];
        let incomingLists: string[] = [];

        if (Array.isArray(parsed)) {
          // Legacy array of items
          incomingItems = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.items)) incomingItems = parsed.items;
          if (Array.isArray(parsed.customLists)) incomingLists = parsed.customLists;
        }

        if (!incomingItems.length && !incomingLists.length) {
          setImportStatus({
            type: 'error',
            message: 'No valid titles or custom lists found in selected JSON file.',
          });
          return;
        }

        // Detect conflicts with current library
        const conflicts: { existing: MediaItem; incoming: MediaItem }[] = [];
        const newItems: MediaItem[] = [];

        incomingItems.forEach((raw) => {
          const matched = items.find(
            (cur) =>
              cur.id === raw.id ||
              (cur.title &&
                raw.title &&
                cur.title.trim().toLowerCase() === raw.title.trim().toLowerCase() &&
                cur.releaseYear === raw.releaseYear &&
                cur.category === raw.category)
          );

          if (matched) {
            conflicts.push({ existing: matched, incoming: raw });
          } else {
            newItems.push(raw);
          }
        });

        setPendingImport({
          fileName: file.name,
          incomingItems,
          incomingLists,
          conflicts,
          newItems,
        });
      } catch (err) {
        console.error('Failed to parse backup JSON:', err);
        setImportStatus({
          type: 'error',
          message: 'Invalid JSON file. Please select a valid KINO backup file.',
        });
      }
    };
    reader.readAsText(file);

    // Reset input so re-selecting same file triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExecuteImport = (overwriteConflicts: boolean) => {
    if (!pendingImport) return;

    const result = mergeImportData(
      pendingImport.incomingItems,
      pendingImport.incomingLists,
      overwriteConflicts
    );

    setImportStatus({
      type: 'success',
      message: `Import complete! Added ${result.addedCount} new title(s)${
        result.updatedCount > 0 ? `, updated ${result.updatedCount} existing title(s)` : ''
      }${result.listsAddedCount > 0 ? `, and added ${result.listsAddedCount} custom list(s)` : ''}.`,
    });
    setPendingImport(null);
  };

  // Reset Handlers
  const handleConfirmReset = () => {
    if (deleteConfirmationInput.trim() !== 'DELETE') return;

    resetAllData();
    setIsResetOpen(false);
    setDeleteConfirmationInput('');
    setResetSuccessMessage('All library titles, diary logs, and custom lists have been erased.');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => setIsSettingsModalOpen(false)}
    >
      <div
        className="relative w-full max-w-2xl bg-[#090b10] border border-white/[0.09] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0c0e17]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Settings & Backup
              </h2>
              <p className="text-xs text-slate-400">
                Manage data exports, library merges, TMDB proxy, and storage
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {resetSuccessMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{resetSuccessMessage}</span>
            </div>
          )}

          {/* Section 1: Backup & Restore */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Data Backup & Restore
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Export or merge your media collection and custom lists as JSON
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.07]">
                  {items.length} titles
                </span>
                <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.07]">
                  {customLists.length} lists
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Export Card */}
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Export Backup</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Downloads a single JSON backup including all library items, watch history, and custom lists.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportData}
                  className="w-full py-2 px-3 bg-white/[0.05] hover:bg-indigo-600/20 text-slate-200 hover:text-white border border-white/[0.08] hover:border-indigo-500/40 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Download Backup JSON</span>
                </button>
              </div>

              {/* Import Card */}
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl flex flex-col justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Import Backup</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Merges imported titles and lists without replacing your library. Conflicting titles will ask before overwriting.
                  </p>
                </div>
                <label className="w-full py-2 px-3 bg-white/[0.05] hover:bg-emerald-600/20 text-slate-200 hover:text-white border border-white/[0.08] hover:border-emerald-500/40 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Choose JSON Backup...</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Pending Import Conflict Resolution Box */}
            {pendingImport && (
              <div className="p-4 bg-[#111320] border border-indigo-500/30 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>Review Backup Merge: {pendingImport.fileName}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                      <span>• Total in file: {pendingImport.incomingItems.length} titles</span>
                      <span>• Custom lists: {pendingImport.incomingLists.length}</span>
                      <span>• New titles: {pendingImport.newItems.length}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPendingImport(null)}
                    className="text-xs text-slate-400 hover:text-white p-1 rounded hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </div>

                {pendingImport.conflicts.length > 0 ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-lg space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{pendingImport.conflicts.length} title(s) already exist in your library</span>
                    </div>
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      Titles: {pendingImport.conflicts.slice(0, 3).map((c) => c.incoming.title).join(', ')}
                      {pendingImport.conflicts.length > 3 ? ` and ${pendingImport.conflicts.length - 3} more` : ''}.
                      <br />
                      Would you like to overwrite existing titles with backup versions or keep your current versions?
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleExecuteImport(true)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Overwrite Existing ({pendingImport.conflicts.length}) & Add New
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExecuteImport(false)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-100 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Keep Existing & Add Only New ({pendingImport.newItems.length})
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      No conflicts found. All {pendingImport.newItems.length} titles are new!
                    </span>
                    <button
                      type="button"
                      onClick={() => handleExecuteImport(false)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Merge into Library
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Import Status Feedback */}
            {importStatus && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                  importStatus.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                }`}
              >
                {importStatus.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                )}
                <span>{importStatus.message}</span>
              </div>
            )}
          </section>

          {/* Section 2: TMDB Proxy Configuration */}
          <section className="space-y-3 pt-4 border-t border-white/[0.06]">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                TMDB Service & Proxy
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure your Cloudflare worker proxy URL to fetch movie and TV metadata
              </p>
            </div>

            <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Cloudflare Proxy Base URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={proxyUrl}
                    onChange={(e) => setProxyUrl(e.target.value)}
                    placeholder="https://your-tmdb-proxy.workers.dev"
                    className="flex-1 px-3 py-2 bg-black/40 border border-white/[0.1] rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleTestProxy}
                    disabled={isTestingProxy}
                    className="px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-200 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {isTestingProxy ? 'Testing...' : 'Test'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProxy}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer shrink-0 shadow-md shadow-indigo-600/30"
                  >
                    Save
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Requests route through <code className="text-indigo-300 font-mono">${'{PROXY}'}/api/*</code> for endpoints and <code className="text-indigo-300 font-mono">${'{PROXY}'}/img/w500/*</code> for posters without exposing API tokens in client headers.
              </p>

              {proxyStatus && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    proxyStatus.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}
                >
                  {proxyStatus.type === 'success' ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{proxyStatus.message}</span>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: Danger Zone (Reset All Data) */}
          <section className="space-y-3 pt-4 border-t border-rose-500/20">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400">
                Danger Zone
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Permanently erase all your library data, watch history, and custom lists
              </p>
            </div>

            {!isResetOpen ? (
              <div className="p-4 bg-rose-500/[0.04] border border-rose-500/20 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">
                    Reset All Data
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Deletes all tracked media, diary logs, watchlist, and custom lists from this browser.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsResetOpen(true)}
                  className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Reset All Data...
                </button>
              </div>
            ) : (
              <div className="p-4 bg-rose-950/20 border border-rose-500/40 rounded-xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-rose-200">
                      Confirm Complete Data Wipe
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      This action is permanent and cannot be undone. All your saved titles, watch history, reviews, and custom lists will be erased.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-medium text-slate-300">
                    To confirm, please type <span className="font-mono font-bold text-rose-400">DELETE</span> below:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmationInput}
                    onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full px-3 py-2 bg-black/60 border border-rose-500/40 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-rose-400 font-mono tracking-wider"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetOpen(false);
                      setDeleteConfirmationInput('');
                    }}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteConfirmationInput.trim() !== 'DELETE'}
                    onClick={handleConfirmReset}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900/40 disabled:text-rose-400/50 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed shadow-md shadow-rose-950/50"
                  >
                    Permanently Erase Everything
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
