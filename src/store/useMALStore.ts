import { create } from 'zustand';
import { MALUserProfile, AnimeItem } from '../types/anime';
import { AccountSyncService } from '../services/accountSync';
import { useWatchedStore } from './useWatchedStore';

interface MALState {
  user: MALUserProfile;
  isAutoScrobbleEnabled: boolean;
  isAutoCompleteEnabled: boolean;
  isLoginModalOpen: boolean;
  isSyncing: boolean;
  lastScrobbledAnime: string | null;
  syncedAllList: AnimeItem[];
  syncedWatchingList: AnimeItem[];
  syncedCompletedList: AnimeItem[];
  syncedOnHoldList: AnimeItem[];
  syncedDroppedList: AnimeItem[];
  syncedPlanList: AnimeItem[];

  // Actions
  setUser: (user: MALUserProfile) => void;
  toggleLoginModal: (open?: boolean) => void;
  loginMAL: (username: string) => Promise<boolean>;
  logout: () => void;
  toggleAutoScrobble: () => void;
  toggleAutoComplete: () => void;
  scrobbleEpisode: (animeTitle: string, episodeNum: number, totalEpisodes?: number) => void;
}

const storedUser = localStorage.getItem('craftnime_user');
const initialUser: MALUserProfile = storedUser
  ? JSON.parse(storedUser)
  : {
      username: '',
      avatarUrl: '',
      episodesWatched: 0,
      totalAnime: 0,
      meanScore: 0,
      isLoggedIn: false,
    };

export const useMALStore = create<MALState>((set, get) => ({
  user: initialUser,
  isAutoScrobbleEnabled: true,
  isAutoCompleteEnabled: true,
  isLoginModalOpen: false,
  isSyncing: false,
  lastScrobbledAnime: null,
  syncedAllList: JSON.parse(localStorage.getItem('craftnime_mal_all') || '[]'),
  syncedWatchingList: JSON.parse(localStorage.getItem('craftnime_mal_watching') || '[]'),
  syncedCompletedList: JSON.parse(localStorage.getItem('craftnime_mal_completed') || '[]'),
  syncedOnHoldList: JSON.parse(localStorage.getItem('craftnime_mal_onhold') || '[]'),
  syncedDroppedList: JSON.parse(localStorage.getItem('craftnime_mal_dropped') || '[]'),
  syncedPlanList: JSON.parse(localStorage.getItem('craftnime_mal_plan') || '[]'),

  setUser: (user: MALUserProfile) => {
    localStorage.setItem('craftnime_user', JSON.stringify(user));
    set({ user });
  },

  toggleLoginModal: (open) =>
    set({ isLoginModalOpen: open !== undefined ? open : !get().isLoginModalOpen }),

  loginMAL: async (username: string) => {
    if (!username.trim()) return false;
    set({ isSyncing: true });
    try {
      const data = await AccountSyncService.fetchMALUser(username.trim());
      if (data) {
        const userProf: MALUserProfile = {
          username: data.username,
          avatarUrl: data.avatarUrl,
          episodesWatched: data.episodesWatched,
          totalAnime: data.totalAnime,
          meanScore: data.meanScore,
          isLoggedIn: true,
        };
        localStorage.setItem('craftnime_user', JSON.stringify(userProf));
        localStorage.setItem('craftnime_mal_all', JSON.stringify(data.lists.all));
        localStorage.setItem('craftnime_mal_watching', JSON.stringify(data.lists.watching));
        localStorage.setItem('craftnime_mal_completed', JSON.stringify(data.lists.completed));
        localStorage.setItem('craftnime_mal_onhold', JSON.stringify(data.lists.onHold));
        localStorage.setItem('craftnime_mal_dropped', JSON.stringify(data.lists.dropped));
        localStorage.setItem('craftnime_mal_plan', JSON.stringify(data.lists.planToWatch));

        // Sync completed and in-progress episodes into local watched store
        useWatchedStore.getState().syncFromMALList(data.lists.completed, data.lists.watching);

        set({
          user: userProf,
          syncedAllList: data.lists.all,
          syncedWatchingList: data.lists.watching,
          syncedCompletedList: data.lists.completed,
          syncedOnHoldList: data.lists.onHold,
          syncedDroppedList: data.lists.dropped,
          syncedPlanList: data.lists.planToWatch,
          isSyncing: false,
          isLoginModalOpen: false,
        });
        return true;
      }
    } catch (e) {
      console.error('MAL login failed', e);
    }
    set({ isSyncing: false });
    return false;
  },

  logout: () => {
    localStorage.removeItem('craftnime_user');
    localStorage.removeItem('craftnime_mal_all');
    localStorage.removeItem('craftnime_mal_watching');
    localStorage.removeItem('craftnime_mal_completed');
    localStorage.removeItem('craftnime_mal_onhold');
    localStorage.removeItem('craftnime_mal_dropped');
    localStorage.removeItem('craftnime_mal_plan');
    set({
      user: {
        username: '',
        avatarUrl: '',
        episodesWatched: 0,
        totalAnime: 0,
        meanScore: 0,
        isLoggedIn: false,
      },
      syncedAllList: [],
      syncedWatchingList: [],
      syncedCompletedList: [],
      syncedOnHoldList: [],
      syncedDroppedList: [],
      syncedPlanList: [],
      lastScrobbledAnime: null,
    });
  },

  toggleAutoScrobble: () => set({ isAutoScrobbleEnabled: !get().isAutoScrobbleEnabled }),
  toggleAutoComplete: () => set({ isAutoCompleteEnabled: !get().isAutoCompleteEnabled }),

  scrobbleEpisode: (animeTitle: string, episodeNum: number, totalEpisodes?: number) => {
    const isCompleted = totalEpisodes && episodeNum >= totalEpisodes;
    const message = `${animeTitle} (Ep ${episodeNum}${totalEpisodes ? `/${totalEpisodes}` : ''})${
      isCompleted ? ' — Marked Completed!' : ''
    }`;
    set((state) => ({
      lastScrobbledAnime: message,
      user: {
        ...state.user,
        episodesWatched: state.user.episodesWatched + 1,
      },
    }));
  },
}));
