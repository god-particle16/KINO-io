/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MediaProvider, useMedia } from './context/MediaContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { DiaryView } from './components/DiaryView.tsx';
import { WatchlistsView } from './components/WatchlistsView.tsx';
import { LibraryView } from './components/LibraryView.tsx';
import { SearchModal } from './components/SearchModal.tsx';
import { AddEditModal } from './components/AddEditModal.tsx';
import { ItemDetailsModal } from './components/ItemDetailsModal.tsx';
import { TMDBKeyModal } from './components/TMDBKeyModal.tsx';
import { RandomPickerModal } from './components/RandomPickerModal.tsx';
import { KinoLogo } from './components/KinoLogo.tsx';

const AppContent: React.FC = () => {
  const { activeTab } = useMedia();

  return (
    <div className="min-h-screen bg-[#07080b] text-slate-100 flex flex-col selection:bg-indigo-600/40 selection:text-indigo-200">
      {/* Top Bar Navigation */}
      <Navbar />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'diary' && <DiaryView />}
        {activeTab === 'watchlists' && <WatchlistsView />}
        {activeTab === 'library' && <LibraryView />}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-white/[0.05] bg-[#08090c] py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-2.5">
          <KinoLogo size="sm" variant="badge" />
          <span
            style={{
              fontFamily: "'Kalam', cursive, sans-serif",
              fontWeight: 700,
              fontStyle: 'normal',
            }}
            className="text-xl text-slate-300 tracking-normal select-none"
          >
            KINO
          </span>
        </div>
      </footer>

      {/* Global Modals */}
      <SearchModal />
      <AddEditModal />
      <ItemDetailsModal />
      <TMDBKeyModal />
      <RandomPickerModal />
    </div>
  );
};

export default function App() {
  return (
    <MediaProvider>
      <AppContent />
    </MediaProvider>
  );
}
