/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, Settings } from 'lucide-react';
import { useMedia } from '../context/MediaContext.tsx';
import { ActiveTab } from '../types/media.ts';
import { KinoLogo } from './KinoLogo.tsx';

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setIsSearchModalOpen,
    setIsSettingsModalOpen,
    setIsTMDBModalOpen,
  } = useMedia();

  const navLinks: { id: ActiveTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'diary', label: 'Diary' },
    { id: 'watchlists', label: 'Watchlist' },
    { id: 'library', label: 'My Library' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#08090c]/95 backdrop-blur-md border-b border-white/[0.06] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark KINO */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-1.5 text-left group cursor-pointer focus:outline-none"
            title="KINO - Return to Dashboard"
          >
            <KinoLogo size="md" />

            <span
              style={{
                fontFamily: "'Kalam', cursive, sans-serif",
                fontWeight: 700,
                fontStyle: 'normal',
              }}
              className="text-2xl sm:text-3xl text-white group-hover:text-indigo-400 transition-colors select-none drop-shadow-md tracking-normal leading-none"
            >
              KINO
            </span>
          </button>
        </div>

        {/* Zone 2: 4 Primary Nav Links */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'text-white bg-indigo-600/25 border border-indigo-500/30 shadow-sm shadow-indigo-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Search & Settings Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search Bar trigger */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] rounded-lg text-slate-400 hover:text-slate-200 text-xs transition-all cursor-pointer focus:outline-none focus:border-indigo-500/50"
            title="Search movie, TV series, or anime (Press /)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline whitespace-nowrap">Search titles...</span>
            <kbd className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 bg-white/[0.06] rounded border border-white/[0.08] text-slate-400">
              /
            </kbd>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] rounded-lg text-slate-400 hover:text-slate-200 text-xs transition-all cursor-pointer focus:outline-none focus:border-indigo-500/50"
            title="Settings & Backup"
            aria-label="Settings & Backup"
          >
            <Settings className="w-4 h-4 text-slate-300 hover:text-white transition-colors" />
          </button>
        </div>
      </div>

      {/* Mobile Secondary Navigation Row */}
      <div className="md:hidden flex items-center justify-around px-2 py-1.5 border-t border-white/[0.04] bg-[#090b10]">
        {navLinks.map((link) => {
          const isActive = activeTab === link.id;
          return (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={`px-3 py-2.5 min-h-[40px] text-xs font-medium rounded transition-colors whitespace-nowrap ${
                isActive
                  ? 'text-indigo-400 font-semibold bg-indigo-600/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
