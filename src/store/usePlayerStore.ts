import { create } from 'zustand';
import { AnimeItem, AnimeEpisode } from '../types/anime';
import { AniListService } from '../services/anilist';
import { useMALStore } from './useMALStore';

interface PlayerState {
  isPlayerOpen: boolean;
  activeAnime: AnimeItem | null;
  activeEpisode: AnimeEpisode | null;
  episodeList: AnimeEpisode[];
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  playbackSpeed: number;
  audioTrack: 'sub' | 'dub';
  quality: '1080p' | '720p' | '480p' | 'auto';
  autoSkipIntro: boolean;
  autoSkipOutro: boolean;
  autoPlayNext: boolean;
  currentTime: number;
  duration: number;
  skipIntroInterval: { startTime: number; endTime: number } | null;
  skipOutroInterval: { startTime: number; endTime: number } | null;
  nextEpisodeCountdown: number | null;

  // Actions
  openPlayer: (anime: AnimeItem, episode?: AnimeEpisode) => Promise<void>;
  closePlayer: () => void;
  playEpisode: (episode: AnimeEpisode) => void;
  playNextEpisode: () => void;
  playPreviousEpisode: () => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackSpeed: (speed: number) => void;
  setAudioTrack: (track: 'sub' | 'dub') => void;
  setQuality: (quality: '1080p' | '720p' | '480p' | 'auto') => void;
  toggleAutoSkipIntro: () => void;
  toggleAutoSkipOutro: () => void;
  toggleAutoPlayNext: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  isPlayerOpen: false,
  activeAnime: null,
  activeEpisode: null,
  episodeList: [],
  isPlaying: false,
  volume: 0.9,
  isMuted: false,
  playbackSpeed: 1,
  audioTrack: 'sub',
  quality: '1080p',
  autoSkipIntro: true,
  autoSkipOutro: true,
  autoPlayNext: true,
  currentTime: 0,
  duration: 1440,
  skipIntroInterval: { startTime: 85, endTime: 175 },
  skipOutroInterval: { startTime: 1320, endTime: 1410 },
  nextEpisodeCountdown: null,

  openPlayer: async (anime: AnimeItem, episode?: AnimeEpisode) => {
    const episodes = AniListService.generateEpisodes(anime);

    let targetEp: AnimeEpisode | undefined = episode;

    if (!targetEp) {
      // 1. Check local continue watching history
      const continueList: any[] = JSON.parse(
        localStorage.getItem('craftnime_continue_watching_v1') || '[]'
      );
      const localItem = continueList.find((i) => i.id === anime.id || i.malId === anime.id);
      if (localItem?.lastWatchedEpisodeNumber) {
        targetEp = episodes.find((e) => e.number === localItem.lastWatchedEpisodeNumber);
      }

      // 2. If not in local history, check synced MAL / AniList progress!
      if (!targetEp) {
        const { syncedWatchingList } = useMALStore.getState();
        const malItem = syncedWatchingList.find(
          (i) => i.id === anime.id || (anime.malId && i.malId === anime.malId)
        );
        if (malItem?.description) {
          const match = malItem.description.match(/Watched (\d+)/i) || malItem.description.match(/Progress:\s*(\d+)/i);
          if (match && match[1]) {
            const watchedCount = parseInt(match[1], 10);
            const nextEpNum = watchedCount + 1;
            targetEp = episodes.find((e) => e.number === nextEpNum) || episodes[episodes.length - 1];
          }
        }
      }

      // 3. Fallback to Episode 1
      if (!targetEp) {
        targetEp = episodes[0];
      }
    }

    set({
      isPlayerOpen: true,
      activeAnime: anime,
      activeEpisode: targetEp,
      episodeList: episodes,
      isPlaying: true,
      currentTime: 0,
      nextEpisodeCountdown: null,
    });
  },

  closePlayer: () => {
    set({
      isPlayerOpen: false,
      isPlaying: false,
      nextEpisodeCountdown: null,
    });
  },

  playEpisode: (episode: AnimeEpisode) => {
    set({
      activeEpisode: episode,
      isPlaying: true,
      currentTime: 0,
      nextEpisodeCountdown: null,
    });
  },

  playNextEpisode: () => {
    const { activeEpisode, episodeList } = get();
    if (!activeEpisode || episodeList.length === 0) return;

    const currentIdx = episodeList.findIndex((ep) => ep.id === activeEpisode.id);
    if (currentIdx !== -1 && currentIdx < episodeList.length - 1) {
      const nextEp = episodeList[currentIdx + 1];
      set({
        activeEpisode: nextEp,
        currentTime: 0,
        isPlaying: true,
        nextEpisodeCountdown: null,
      });
    }
  },

  playPreviousEpisode: () => {
    const { activeEpisode, episodeList } = get();
    if (!activeEpisode || episodeList.length === 0) return;

    const currentIdx = episodeList.findIndex((ep) => ep.id === activeEpisode.id);
    if (currentIdx > 0) {
      const prevEp = episodeList[currentIdx - 1];
      set({
        activeEpisode: prevEp,
        currentTime: 0,
        isPlaying: true,
        nextEpisodeCountdown: null,
      });
    }
  },

  setPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setVolume: (volume: number) => set({ volume }),
  toggleMute: () => set({ isMuted: !get().isMuted }),
  setPlaybackSpeed: (playbackSpeed: number) => set({ playbackSpeed }),
  setAudioTrack: (audioTrack: 'sub' | 'dub') => set({ audioTrack }),
  setQuality: (quality) => set({ quality }),
  toggleAutoSkipIntro: () => set({ autoSkipIntro: !get().autoSkipIntro }),
  toggleAutoSkipOutro: () => set({ autoSkipOutro: !get().autoSkipOutro }),
  toggleAutoPlayNext: () => set({ autoPlayNext: !get().autoPlayNext }),
  setCurrentTime: (currentTime: number) => set({ currentTime }),
  setDuration: (duration: number) => set({ duration }),
}));
