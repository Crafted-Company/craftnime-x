import React, { useState, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  Play,
  Star,
  RefreshCw,
  Sparkles,
  User,
  Search,
  Download,
  Upload,
  ArrowUpDown,
} from 'lucide-react';
import { useAnimeStore } from '../../store/useAnimeStore';
import { useMALStore } from '../../store/useMALStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useWatchedStore } from '../../store/useWatchedStore';
import { Badge } from '../common/Badge';

type ListCategory = 'ALL' | 'WATCHING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED' | 'PLAN_TO_WATCH' | 'LOCAL';
type SortOption = 'RECENT_UPDATED' | 'DEFAULT' | 'SCORE_DESC' | 'TITLE_ASC' | 'EPISODES_DESC';

export const MALWatchlistHub: React.FC = () => {
  const { watchlist, setSelectedAnime } = useAnimeStore();
  const {
    user,
    toggleLoginModal,
    syncedAllList,
    syncedWatchingList,
    syncedCompletedList,
    syncedOnHoldList,
    syncedDroppedList,
    syncedPlanList,
    isSyncing,
    loginMAL,
  } = useMALStore();
  const { openPlayer } = usePlayerStore();
  const { exportBackupJSON, importBackupJSON } = useWatchedStore();

  const [activeCategory, setActiveCategory] = useState<ListCategory>(user.isLoggedIn ? 'WATCHING' : 'LOCAL');
  const [listSearch, setListSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('RECENT_UPDATED');
  const [backupMessage, setBackupMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawList = useMemo(() => {
    switch (activeCategory) {
      case 'ALL':
        return syncedAllList;
      case 'WATCHING':
        return syncedWatchingList;
      case 'COMPLETED':
        return syncedCompletedList;
      case 'ON_HOLD':
        return syncedOnHoldList;
      case 'DROPPED':
        return syncedDroppedList;
      case 'PLAN_TO_WATCH':
        return syncedPlanList;
      case 'LOCAL':
      default:
        return watchlist;
    }
  }, [
    activeCategory,
    syncedAllList,
    syncedWatchingList,
    syncedCompletedList,
    syncedOnHoldList,
    syncedDroppedList,
    syncedPlanList,
    watchlist,
  ]);

  const sortedAndFilteredList = useMemo(() => {
    let result = [...rawList];

    // Filter by title
    if (listSearch.trim()) {
      const q = listSearch.toLowerCase().trim();
      result = result.filter((item) => {
        const titleStr =
          typeof item.title === 'object'
            ? item.title?.english || item.title?.romaji || item.title?.userPreferred || ''
            : String(item.title || '');
        return titleStr.toLowerCase().includes(q);
      });
    }

    // Sort
    switch (sortBy) {
      case 'RECENT_UPDATED':
        result.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        break;
      case 'SCORE_DESC':
        result.sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
        break;
      case 'TITLE_ASC':
        result.sort((a, b) => {
          const tA = typeof a.title === 'object' ? a.title?.english || a.title?.romaji || '' : String(a.title || '');
          const tB = typeof b.title === 'object' ? b.title?.english || b.title?.romaji || '' : String(b.title || '');
          return tA.localeCompare(tB);
        });
        break;
      case 'EPISODES_DESC':
        result.sort((a, b) => (b.episodes || 0) - (a.episodes || 0));
        break;
      case 'DEFAULT':
      default:
        break;
    }

    return result;
  }, [rawList, listSearch, sortBy]);

  const categories: { id: ListCategory; label: string; count: number }[] = [
    { id: 'ALL', label: 'All Anime', count: syncedAllList.length },
    { id: 'WATCHING', label: 'Currently Watching', count: syncedWatchingList.length },
    { id: 'COMPLETED', label: 'Completed', count: syncedCompletedList.length },
    { id: 'ON_HOLD', label: 'On Hold', count: syncedOnHoldList.length },
    { id: 'DROPPED', label: 'Dropped', count: syncedDroppedList.length },
    { id: 'PLAN_TO_WATCH', label: 'Plan to Watch', count: syncedPlanList.length },
    { id: 'LOCAL', label: 'Local Saved', count: watchlist.length },
  ];

  const handleExportBackup = () => {
    const jsonStr = exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `craftnime_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMessage('Backup exported successfully!');
    setTimeout(() => setBackupMessage(''), 3500);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackupJSON(content);
      if (success) {
        setBackupMessage('Backup imported and synced successfully!');
        window.location.reload();
      } else {
        setBackupMessage('Invalid backup JSON format.');
      }
      setTimeout(() => setBackupMessage(''), 4000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 space-y-8">
      {/* Profile & Sync Header Card */}
      <div className="bg-crafted-surface border border-crafted-border rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between gap-6 flex-wrap relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={
                  user.avatarUrl ||
                  'https://cdn.myanimelist.net/images/userimages/default.jpg'
                }
                alt=""
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-crafted-brand-rust shadow-crafted-glow"
              />
              {user.isLoggedIn && (
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-crafted-surface shadow-sm" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold font-serif text-white">
                  {user.isLoggedIn ? user.username : 'Guest Library'}
                </h1>
                <Badge variant={user.isLoggedIn ? 'emerald' : 'surface'} size="xs">
                  {user.isLoggedIn ? 'MAL Cloud Synced' : 'Offline Storage'}
                </Badge>
              </div>
              <p className="text-xs text-crafted-text-dim">
                {user.isLoggedIn
                  ? 'Real-time two-way synchronization active with MyAnimeList Official Library'
                  : 'Sign in to automatically sync your watching history & scrobble episodes.'}
              </p>
            </div>
          </div>

          {user.isLoggedIn ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => loginMAL(user.username)}
                disabled={isSyncing}
                className="px-4 py-2 rounded-xl bg-crafted-surface hover:bg-crafted-surface-hover text-crafted-brand-rustLight border border-crafted-border text-xs font-mono font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing MAL...' : 'Refresh MAL'}</span>
              </button>

              <button
                onClick={() => toggleLoginModal(true)}
                className="px-4 py-2 rounded-xl bg-crafted-surface hover:bg-crafted-surface-hover text-crafted-text-dim hover:text-white border border-crafted-border text-xs font-mono transition-all cursor-pointer"
              >
                Settings
              </button>
            </div>
          ) : (
            <button
              onClick={() => toggleLoginModal(true)}
              className="px-5 py-2.5 rounded-xl bg-crafted-button text-white font-bold text-xs shadow-crafted-glow hover:brightness-110 flex items-center gap-2 cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>Connect MyAnimeList (MAL)</span>
            </button>
          )}
        </div>

        {/* Live Auto-Scrobble & Backup Tool Strip */}
        <div className="mt-6 pt-4 border-t border-crafted-border flex items-center justify-between text-xs text-crafted-text-dim flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
              <CheckCircle2 className="w-4 h-4" />
              <span>Auto-Scrobble at 80% Active</span>
            </div>
          </div>

          {/* Export / Import Local Data Backup */}
          <div className="flex items-center gap-2">
            {backupMessage && (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                {backupMessage}
              </span>
            )}
            <button
              onClick={handleExportBackup}
              className="px-3 py-1.5 rounded-xl bg-crafted-surface hover:bg-crafted-surface-hover border border-crafted-border text-white text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Export all watchlist and watched history as a JSON backup"
            >
              <Download className="w-3.5 h-3.5 text-crafted-brand-rustLight" />
              <span>Export Backup</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-crafted-surface hover:bg-crafted-surface-hover border border-crafted-border text-white text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Restore watchlist and watched history from a JSON backup file"
            >
              <Upload className="w-3.5 h-3.5 text-crafted-brand-lightViolet" />
              <span>Import Backup</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Tabs Strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-crafted-border pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeCategory === cat.id
                ? 'bg-crafted-brand-rust text-white shadow-crafted-glow'
                : 'bg-crafted-surface hover:bg-crafted-surface-hover text-crafted-text-dim hover:text-white border border-crafted-border'
            }`}
          >
            <span>{cat.label}</span>
            <span className="px-1.5 py-0.5 rounded-md bg-black/40 text-[10px]">
              {cat.count}
            </span>
          </button>
        ))}
      </div>

      {/* Controls & Search Filter Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-crafted-panel/60 p-4 rounded-2xl border border-crafted-border">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-crafted-brand-rust absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder={`Search ${sortedAndFilteredList.length} anime in this list...`}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-crafted-bg border border-crafted-border text-crafted-text placeholder:text-crafted-text-dim focus:outline-none focus:border-crafted-brand-rust"
          />
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-crafted-brand-rust" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-crafted-surface text-crafted-text text-xs font-mono px-3 py-2 rounded-xl border border-crafted-border focus:outline-none cursor-pointer"
          >
            <option value="RECENT_UPDATED">Sort: Recently Updated / Watched</option>
            <option value="SCORE_DESC">Sort: Highest Rating (Score)</option>
            <option value="TITLE_ASC">Sort: Alphabetical (A-Z)</option>
            <option value="EPISODES_DESC">Sort: Total Episodes</option>
          </select>
        </div>
      </div>

      {/* Anime Grid List */}
      {sortedAndFilteredList.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-crafted-surface/30 rounded-2xl border border-crafted-border">
          <Sparkles className="w-8 h-8 text-crafted-brand-rustLight mx-auto" />
          <h3 className="text-base font-bold font-serif text-white">No Anime Found</h3>
          <p className="text-xs text-crafted-text-dim max-w-sm mx-auto">
            {listSearch
              ? `No entries matched "${listSearch}" in this category.`
              : 'This collection is currently empty.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {sortedAndFilteredList.map((anime) => {
            const titleStr =
              typeof anime.title === 'object'
                ? anime.title?.english || anime.title?.romaji || anime.title?.userPreferred || 'Anime'
                : String(anime.title || 'Anime');

            const scoreDisplay = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;

            return (
              <div
                key={anime.id || anime.malId}
                onClick={() => setSelectedAnime(anime)}
                className="group relative bg-crafted-surface rounded-2xl border border-crafted-border overflow-hidden hover:border-crafted-brand-rust hover:shadow-crafted-glow transition-all duration-300 flex flex-col cursor-pointer"
              >
                {/* Poster Artwork */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-crafted-panel">
                  <img
                    src={anime.coverImage?.large || anime.coverImage?.extraLarge || anime.bannerImage}
                    alt={titleStr}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-crafted-surface via-transparent to-transparent opacity-80" />

                  {/* Rating Tag */}
                  {scoreDisplay && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-mono font-bold text-amber-300">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{scoreDisplay}</span>
                    </div>
                  )}

                  {/* Ep Count Tag */}
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-lg bg-black/80 text-[10px] font-mono text-crafted-brand-rustLight border border-white/10">
                    {anime.episodes ? `${anime.episodes} eps` : 'TV'}
                  </div>

                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openPlayer(anime);
                      }}
                      className="w-11 h-11 rounded-full bg-crafted-button text-white flex items-center justify-center shadow-crafted-glow hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </button>
                  </div>
                </div>

                {/* Details Footer */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                  <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-crafted-brand-rustLight transition-colors">
                    {titleStr}
                  </h4>
                  <p className="text-[11px] text-crafted-text-dim line-clamp-1 font-mono">
                    {anime.description || 'Anime'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
