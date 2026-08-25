import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Play,
  Star,
  RefreshCw,
  Sparkles,
  User,
  Search,
} from 'lucide-react';
import { useAnimeStore } from '../../store/useAnimeStore';
import { useMALStore } from '../../store/useMALStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Badge } from '../common/Badge';

type ListCategory = 'ALL' | 'WATCHING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED' | 'PLAN_TO_WATCH' | 'LOCAL';

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

  const [activeCategory, setActiveCategory] = useState<ListCategory>(user.isLoggedIn ? 'WATCHING' : 'LOCAL');
  const [listSearch, setListSearch] = useState('');

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

  const filteredList = useMemo(() => {
    if (!listSearch.trim()) return rawList;
    const q = listSearch.toLowerCase().trim();
    return rawList.filter((item) => {
      const titleStr =
        typeof item.title === 'object'
          ? item.title?.english || item.title?.romaji || item.title?.userPreferred || ''
          : String(item.title || '');
      return titleStr.toLowerCase().includes(q);
    });
  }, [rawList, listSearch]);

  const categories: { id: ListCategory; label: string; count: number }[] = [
    { id: 'ALL', label: 'All Anime', count: syncedAllList.length },
    { id: 'WATCHING', label: 'Currently Watching', count: syncedWatchingList.length },
    { id: 'COMPLETED', label: 'Completed', count: syncedCompletedList.length },
    { id: 'ON_HOLD', label: 'On Hold', count: syncedOnHoldList.length },
    { id: 'DROPPED', label: 'Dropped', count: syncedDroppedList.length },
    { id: 'PLAN_TO_WATCH', label: 'Plan to Watch', count: syncedPlanList.length },
    { id: 'LOCAL', label: 'Local Saved', count: watchlist.length },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 space-y-8">
      {/* Profile & Sync Header Card */}
      <div className="bg-crafted-surface border border-crafted-border rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-crafted-brand-rust/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between gap-6 flex-wrap relative z-10">
          <div className="flex items-center gap-4">
            {user.isLoggedIn ? (
              <img
                src={user.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border-2 border-crafted-brand-rust shadow-crafted-glow"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-crafted-panel border-2 border-crafted-border flex items-center justify-center text-crafted-brand-rust">
                <User className="w-8 h-8" />
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold font-serif text-white">
                  {user.isLoggedIn ? user.username : 'Guest User'}
                </h2>
                {user.isLoggedIn ? (
                  <Badge variant="emerald" size="xs">
                    MAL Live Synced
                  </Badge>
                ) : (
                  <Badge variant="outline" size="xs">
                    Local Storage
                  </Badge>
                )}
              </div>
              <p className="text-xs text-crafted-text-dim font-mono">
                {user.isLoggedIn
                  ? 'Official MyAnimeList Cloud Sync Active'
                  : 'Connect your MyAnimeList account to sync your real watchlist, completed series & scores'}
              </p>
            </div>
          </div>

          {/* Quick Stats or Connect Button */}
          {user.isLoggedIn ? (
            <div className="flex items-center gap-6 text-xs font-mono bg-crafted-bg/80 px-5 py-3 rounded-xl border border-crafted-border">
              <div className="text-center">
                <span className="text-crafted-brand-rustLight text-base font-bold block">
                  {user.episodesWatched}
                </span>
                <span className="text-crafted-text-dim text-[10px]">EPISODES</span>
              </div>
              <div className="w-[1px] h-8 bg-crafted-border" />
              <div className="text-center">
                <span className="text-crafted-brand-lightViolet text-base font-bold block">
                  {syncedAllList.length || user.totalAnime}
                </span>
                <span className="text-crafted-text-dim text-[10px]">ANIME</span>
              </div>
              <div className="w-[1px] h-8 bg-crafted-border" />
              <div className="text-center">
                <span className="text-amber-300 text-base font-bold block">
                  ★ {user.meanScore}
                </span>
                <span className="text-crafted-text-dim text-[10px]">MEAN SCORE</span>
              </div>
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

        {/* Live Auto-Scrobble Status Strip */}
        <div className="mt-6 pt-4 border-t border-crafted-border flex items-center justify-between text-xs text-crafted-text-dim flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
              <CheckCircle2 className="w-4 h-4" />
              <span>Auto-Scrobble at 80% Active</span>
            </div>
            <div className="flex items-center gap-1.5 text-crafted-brand-lightViolet font-mono">
              <Sparkles className="w-4 h-4" />
              <span>Auto-Complete on Final Ep Active</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (user.isLoggedIn) {
                loginMAL(user.username);
              } else {
                toggleLoginModal(true);
              }
            }}
            disabled={isSyncing}
            className="text-crafted-brand-rustLight hover:text-white font-mono text-xs flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Refreshing...' : 'Refresh MAL Data'}</span>
          </button>
        </div>
      </div>

      {/* MAL Official 6-Category Navigation Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-crafted-border pb-3 flex-wrap gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => {
              if (!user.isLoggedIn && cat.id !== 'LOCAL') return null;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-crafted-brand-rust text-white shadow-crafted-glow'
                      : 'bg-crafted-surface hover:bg-crafted-surface-hover text-crafted-text-muted hover:text-white border border-crafted-border'
                  }`}
                >
                  {cat.label} ({cat.count})
                </button>
              );
            })}
          </div>

          {/* Search within list */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-crafted-brand-rust absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Search in your list..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-crafted-surface border border-crafted-border text-crafted-text focus:outline-none focus:border-crafted-brand-rust"
            />
          </div>
        </div>

        {/* List of Entries */}
        {filteredList.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-crafted-surface/40 rounded-2xl border border-crafted-border">
            <Sparkles className="w-10 h-10 text-crafted-text-dim opacity-40 mx-auto" />
            <h4 className="text-sm font-bold text-white">
              {listSearch ? `No titles matching "${listSearch}"` : 'No titles in this category'}
            </h4>
            <p className="text-xs text-crafted-text-dim max-w-sm mx-auto">
              {user.isLoggedIn
                ? 'Your MyAnimeList library is empty in this category. Add anime or refresh your account.'
                : 'Connect your MyAnimeList account to load your cloud watchlist and ratings.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredList.map((anime) => {
              const titleStr =
                typeof anime.title === 'object'
                  ? anime.title.english || anime.title.romaji || anime.title.userPreferred || 'Anime'
                  : String(anime.title || 'Anime');

              return (
                <div
                  key={anime.id}
                  className="bg-crafted-surface border border-crafted-border rounded-2xl p-4 shadow-crafted-card space-y-3 flex flex-col justify-between hover:border-crafted-brand-rust transition-all group"
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={anime.coverImage?.large || anime.coverImage?.extraLarge}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-16 aspect-[2/3] object-cover rounded-xl border border-crafted-border shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-crafted-brand-rust/20 text-crafted-brand-rustLight border border-crafted-brand-rust/40">
                          {anime.format || 'TV'}
                        </span>
                        {anime.averageScore ? (
                          <div className="flex items-center gap-1 text-[11px] font-mono text-amber-300">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{(anime.averageScore / 10).toFixed(1)}/10</span>
                          </div>
                        ) : null}
                      </div>

                      <h4
                        onClick={() => setSelectedAnime(anime)}
                        className="text-sm font-bold text-white truncate cursor-pointer hover:text-crafted-brand-rustLight transition-colors"
                      >
                        {titleStr}
                      </h4>

                      <p className="text-[11px] text-crafted-text-dim truncate">
                        {anime.description || `${anime.episodes || 12} Episodes`}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-crafted-border">
                    <button
                      onClick={() => openPlayer(anime)}
                      className="flex-1 py-1.5 rounded-lg bg-crafted-button text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-crafted-glow hover:brightness-110 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Stream Series</span>
                    </button>

                    <button
                      onClick={() => setSelectedAnime(anime)}
                      className="px-3 py-1.5 rounded-lg bg-crafted-surface hover:bg-crafted-surface-hover text-crafted-text border border-crafted-border text-xs font-mono hover:text-white cursor-pointer"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
