import { create } from 'zustand';
import { AccountSyncService } from '../services/accountSync';

interface WatchedState {
  // Map of `${animeId}-${episodeNumber}` -> boolean
  watchedMap: Record<string, boolean>;
  toggleWatchedEpisode: (animeId: number, episodeNumber: number, malId?: number) => void;
  markSeasonWatched: (animeId: number, totalEpisodes: number, malId?: number) => void;
  unmarkSeasonWatched: (animeId: number, totalEpisodes: number, malId?: number) => void;
  isEpisodeWatched: (animeId: number, episodeNumber: number, malId?: number) => boolean;
  syncFromMALList: (completedList: any[], watchingList: any[]) => void;
  exportBackupJSON: () => string;
  importBackupJSON: (jsonStr: string) => boolean;
}

const LOCAL_STORAGE_KEY = 'craftnime_watched_episodes_v1';

const getInitialMap = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const useWatchedStore = create<WatchedState>((set, get) => ({
  watchedMap: getInitialMap(),

  toggleWatchedEpisode: (animeId: number, episodeNumber: number, malId?: number) => {
    const key1 = `${animeId}-${episodeNumber}`;
    const key2 = malId ? `${malId}-${episodeNumber}` : null;
    const { watchedMap } = get();
    const current = !!(watchedMap[key1] || (key2 && watchedMap[key2]));
    const nextVal = !current;

    const updated = { ...watchedMap, [key1]: nextVal };
    if (key2) updated[key2] = nextVal;

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    set({ watchedMap: updated });

    // Push live to MyAnimeList cloud
    const targetMalId = malId || animeId;
    if (nextVal && targetMalId) {
      AccountSyncService.updateMALProgress(targetMalId, episodeNumber, 'watching').catch(() => {});
    }
  },

  markSeasonWatched: (animeId: number, totalEpisodes: number, malId?: number) => {
    const { watchedMap } = get();
    const updated = { ...watchedMap };
    for (let i = 1; i <= totalEpisodes; i++) {
      updated[`${animeId}-${i}`] = true;
      if (malId) updated[`${malId}-${i}`] = true;
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    set({ watchedMap: updated });

    const targetMalId = malId || animeId;
    if (targetMalId) {
      AccountSyncService.updateMALProgress(targetMalId, totalEpisodes, 'completed').catch(() => {});
    }
  },

  unmarkSeasonWatched: (animeId: number, totalEpisodes: number, malId?: number) => {
    const { watchedMap } = get();
    const updated = { ...watchedMap };
    for (let i = 1; i <= totalEpisodes; i++) {
      delete updated[`${animeId}-${i}`];
      if (malId) delete updated[`${malId}-${i}`];
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    set({ watchedMap: updated });
  },

  isEpisodeWatched: (animeId: number, episodeNumber: number, malId?: number) => {
    const { watchedMap } = get();
    return !!(
      watchedMap[`${animeId}-${episodeNumber}`] ||
      (malId && watchedMap[`${malId}-${episodeNumber}`])
    );
  },

  syncFromMALList: (completedList: any[], watchingList: any[]) => {
    const { watchedMap } = get();
    const updated = { ...watchedMap };

    // 1. All completed anime marked 100% watched
    for (const item of completedList) {
      const animeId = item.id || item.malId;
      const total = item.episodes || 12;
      if (animeId) {
        for (let i = 1; i <= total; i++) {
          updated[`${animeId}-${i}`] = true;
        }
      }
    }

    // 2. All currently watching anime marked up to watched count
    for (const item of watchingList) {
      const animeId = item.id || item.malId;
      const desc = item.description || '';
      const match = desc.match(/Watched:\s*(\d+)/i) || desc.match(/Progress:\s*(\d+)/i);
      const watchedCount = match ? parseInt(match[1], 10) : 0;
      if (animeId && watchedCount > 0) {
        for (let i = 1; i <= watchedCount; i++) {
          updated[`${animeId}-${i}`] = true;
        }
      }
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    set({ watchedMap: updated });
  },

  exportBackupJSON: () => {
    const backup = {
      version: 1,
      exportDate: new Date().toISOString(),
      watchlist: JSON.parse(localStorage.getItem('craftnime_watchlist_v1') || '[]'),
      continueWatching: JSON.parse(localStorage.getItem('craftnime_continue_watching_v1') || '[]'),
      watchedEpisodes: JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{}'),
      malUser: JSON.parse(localStorage.getItem('craftnime_user') || 'null'),
    };
    return JSON.stringify(backup, null, 2);
  },

  importBackupJSON: (jsonStr: string) => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.watchlist) localStorage.setItem('craftnime_watchlist_v1', JSON.stringify(data.watchlist));
      if (data.continueWatching) localStorage.setItem('craftnime_continue_watching_v1', JSON.stringify(data.continueWatching));
      if (data.watchedEpisodes) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.watchedEpisodes));
        set({ watchedMap: data.watchedEpisodes });
      }
      if (data.malUser) localStorage.setItem('craftnime_user', JSON.stringify(data.malUser));
      return true;
    } catch {
      return false;
    }
  },
}));
