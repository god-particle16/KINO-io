/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Database, Check, AlertCircle, Key, Download, Upload, RefreshCw } from 'lucide-react';
import { useMedia } from '../context/MediaContext.tsx';
import { tmdbService } from '../services/tmdb.ts';

export const TMDBKeyModal: React.FC = () => {
  const { isTMDBModalOpen, setIsTMDBModalOpen, exportData, importData, resetToDemoData } = useMedia();

  const [proxyInput, setProxyInput] = useState(tmdbService.getProxyUrl());
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isTMDBModalOpen) return null;

  const handleSave = () => {
    tmdbService.setProxyUrl(proxyInput);
    setStatusMessage({
      type: 'success',
      text: proxyInput.trim()
        ? 'Cloudflare Proxy URL saved to browser storage.'
        : 'Proxy URL cleared. Set VITE_TMDB_PROXY_URL in .env for persistent access.',
    });
  };

  const handleTestKey = async () => {
    const activeUrl = (proxyInput.trim() || tmdbService.getProxyUrl()).replace(/\/+$/, '');
    if (!activeUrl) {
      setStatusMessage({ type: 'error', text: 'Please enter a Cloudflare Proxy URL to test.' });
      return;
    }
    setIsTesting(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`${activeUrl}/api/trending/movie/week`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      });
      if (res.ok) {
        tmdbService.setProxyUrl(activeUrl);
        setStatusMessage({ type: 'success', text: 'Cloudflare proxy verified! TMDB API active.' });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Cloudflare proxy returned error status (${res.status}: ${res.statusText}).`,
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'Network error: Cloudflare proxy is unreachable.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const success = importData(content);
          if (success) {
            setStatusMessage({ type: 'success', text: 'Library successfully restored from backup JSON.' });
          } else {
            setStatusMessage({ type: 'error', text: 'Failed to parse JSON file.' });
          }
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-[#0b0d14] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0e111a]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/25 border border-indigo-500/35 flex items-center justify-center text-indigo-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                TMDB Proxy & Storage
              </h2>
              <p className="text-[11px] text-slate-400">
                Service configuration, Cloudflare proxy URL, and local storage backup
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsTMDBModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* TMDB Integration Architecture Card */}
          <div className="p-3.5 bg-[#101222]/80 border border-indigo-500/20 rounded-xl space-y-2">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cloudflare Proxy Architecture</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              KINO routes all TMDB requests through your Cloudflare worker proxy URL defined in <code className="text-indigo-300 font-mono text-[11px]">VITE_TMDB_PROXY_URL</code>.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              API calls use <code className="text-slate-300 font-mono text-[11px]">${'{PROXY}'}/api/&lt;path&gt;</code> and images use <code className="text-slate-300 font-mono text-[11px]">${'{PROXY}'}/img/w500/&lt;poster_path&gt;</code> without sending client headers or API tokens.
            </p>
          </div>

          {/* TMDB Proxy Input */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Cloudflare Proxy Base URL (VITE_TMDB_PROXY_URL)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={proxyInput}
                onChange={(e) => setProxyInput(e.target.value)}
                placeholder="https://your-tmdb-proxy.workers.dev"
                className="flex-1 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={handleTestKey}
                disabled={isTesting}
                className="px-3 py-2 bg-white/[0.06] hover:bg-indigo-950/30 text-xs font-medium text-slate-200 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isTesting ? 'Testing...' : 'Test'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer shrink-0 shadow-md shadow-indigo-600/30"
              >
                Save
              </button>
            </div>
            {statusMessage && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                }`}
              >
                {statusMessage.type === 'success' ? (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}
          </div>

          {/* Local Storage & Data Management */}
          <div className="space-y-3 pt-3 border-t border-white/[0.06]">
            <div className="text-xs font-semibold text-slate-200">
              Data Backup & Local Storage
            </div>
            <p className="text-xs text-slate-400">
              All your diary entries, ratings, seasons, and progression are preserved in browser <code className="text-slate-300 font-mono text-[11px]">localStorage</code>.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={exportData}
                className="p-2.5 bg-white/[0.03] hover:bg-indigo-950/30 border border-white/[0.06] hover:border-indigo-500/30 rounded-lg text-xs text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export JSON Backup</span>
              </button>

              <label className="p-2.5 bg-white/[0.03] hover:bg-emerald-950/30 border border-white/[0.06] hover:border-emerald-500/30 rounded-lg text-xs text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Restore JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <button
              onClick={() => {
                if (window.confirm('Reset all media entries back to curated initial demo collection?')) {
                  resetToDemoData();
                  setStatusMessage({ type: 'success', text: 'Demo library restored.' });
                }
              }}
              className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.02] border border-white/[0.04] rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset to Sample Collection</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
