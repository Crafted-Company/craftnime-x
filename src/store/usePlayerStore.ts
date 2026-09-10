import { create } from 'zustand';
import { AnimeItem, AnimeEpisode } from '../types/anime';
import { AniListService } from '../services/anilist';
import { AniZipService } from '../services/aniZip';
import { KitsuService } from '../services/kitsu';
import { useWatchedStore } from './useWatchedStore';

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
  isStreamSelectOpen: boolean;
  selectedTorrent: any | null;
  playerEngine: 'mpv' | 'web';

  // Actions
  openPlayer: (anime: AnimeItem, episode?: AnimeEpisode) => Promise<void>;
  openStreamSelector: (anime: AnimeItem, episode?: AnimeEpisode) => Promise<void>;
  closeStreamSelector: () => void;
  playWithTorrent: (torrent: any) => void;
  setPlayerEngine: (engine: 'mpv' | 'web') => void;
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
  playerEngine: typeof window !== 'undefined' && (window as any).require ? 'mpv' : 'web',
  autoSkipIntro: true,
  autoSkipOutro: true,
  autoPlayNext: true,
  currentTime: 0,
  duration: 1440,
  skipIntroInterval: { startTime: 85, endTime: 175 },
  skipOutroInterval: { startTime: 1320, endTime: 1410 },
  nextEpisodeCountdown: null,
  isStreamSelectOpen: false,
  selectedTorrent: null,

  setPlayerEngine: (engine: 'mpv' | 'web') => {
    set({ playerEngine: engine });
  },

  openStreamSelector: async (anime: AnimeItem, episode?: AnimeEpisode) => {
    const episodes = AniListService.generateEpisodes(anime, []);
    const targetEp = episode || episodes[0] || {
      id: 1,
      number: 1,
      title: 'Episode 1',
      isAired: true,
    };
    set({
      activeAnime: anime,
      activeEpisode: targetEp,
      episodeList: episodes,
      isStreamSelectOpen: true,
    });

    // Background enrich episode metadata
    AniZipService.getEpisodes(anime.id, anime.malId).then(async (extra) => {
      if (!extra || extra.length === 0) {
        const titleStr =
          typeof anime.title === 'object'
            ? anime.title?.english || anime.title?.romaji || ''
            : String(anime.title || '');
        if (titleStr) {
          extra = await KitsuService.getEpisodesForAnime(titleStr);
        }
      }
      if (extra && extra.length > 0) {
        set({ episodeList: AniListService.generateEpisodes(anime, extra) });
      }
    }).catch(() => {});
  },

  closeStreamSelector: () => {
    set({ isStreamSelectOpen: false });
  },

  playWithTorrent: (torrent: any) => {
    set({
      selectedTorrent: torrent,
      isStreamSelectOpen: false,
      isPlayerOpen: true,
      isPlaying: true,
      currentTime: 0,
      nextEpisodeCountdown: null,
    });
  },

  openPlayer: async (anime: AnimeItem, episode?: AnimeEpisode) => {
    // Generate immediate episodes for zero-latency response
    const immediateEpisodes = AniListService.generateEpisodes(anime, []);
    let targetEp: AnimeEpisode | undefined = episode;

    // Filter out unreleased episodes
    if (targetEp && targetEp.isAired === false) {
      targetEp = undefined;
    }

    if (!targetEp) {
      // 1. Check first unwatched aired episode in store (highest priority)
      const { isEpisodeWatched } = useWatchedStore.getState();
      for (let i = 1; i <= immediateEpisodes.length; i++) {
        const ep = immediateEpisodes[i - 1];
        if (ep && ep.isAired !== false && !isEpisodeWatched(anime.id, i, anime.malId)) {
          targetEp = ep;
          break;
        }
      }

      // 2. Check local continue watching history if not found
      if (!targetEp) {
        try {
          const continueList: any[] = JSON.parse(
            localStorage.getItem('craftnime_continue_watching_v1') || '[]'
          );
          const localItem = continueList.find((i) => i.id === anime.id || i.malId === anime.id);
          if (localItem?.lastWatchedEpisodeNumber) {
            const matchEp = immediateEpisodes.find((e) => e.number === localItem.lastWatchedEpisodeNumber);
            if (matchEp && matchEp.isAired !== false) {
              targetEp = matchEp;
            }
          }
        } catch {}
      }

      // 3. Fallback to first aired episode
      if (!targetEp) {
        targetEp = immediateEpisodes.find((e) => e.isAired !== false) || immediateEpisodes[0];
      }
    }

    // Immediately open player HUD
    set({
      isPlayerOpen: true,
      activeAnime: anime,
      activeEpisode: targetEp,
      episodeList: immediateEpisodes,
      isPlaying: true,
      currentTime: 0,
      nextEpisodeCountdown: null,
    });

    // Background enrich episode metadata without freezing player launch
    AniZipService.getEpisodes(anime.id, anime.malId).then(async (extra) => {
      if (!extra || extra.length === 0) {
        const titleStr =
          typeof anime.title === 'object'
            ? anime.title?.english || anime.title?.romaji || anime.title?.userPreferred || ''
            : String(anime.title || '');
        if (titleStr) {
          extra = await KitsuService.getEpisodesForAnime(titleStr);
        }
      }
      if (extra && extra.length > 0) {
        const enriched = AniListService.generateEpisodes(anime, extra);
        set((s) => ({
          episodeList: enriched,
          activeEpisode: enriched.find((e) => e.number === s.activeEpisode?.number) || s.activeEpisode,
        }));
      }
    }).catch(() => {});
  },

  closePlayer: () => {
    set({
      isPlayerOpen: false,
      isPlaying: false,
      activeAnime: null,
      activeEpisode: null,
      currentTime: 0,
      nextEpisodeCountdown: null,
    });
  },

  playEpisode: (episode: AnimeEpisode) => {
    if (episode.isAired === false) return;
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
      if (nextEp && nextEp.isAired !== false) {
        set({
          activeEpisode: nextEp,
          currentTime: 0,
          isPlaying: true,
          nextEpisodeCountdown: null,
        });
      }
    }
  },

  playPreviousEpisode: () => {
    const { activeEpisode, episodeList } = get();
    if (!activeEpisode || episodeList.length === 0) return;

    const currentIdx = episodeList.findIndex((ep) => ep.id === activeEpisode.id);
    if (currentIdx > 0) {
      const prevEp = episodeList[currentIdx - 1];
      if (prevEp && prevEp.isAired !== false) {
        set({
          activeEpisode: prevEp,
          currentTime: 0,
          isPlaying: true,
          nextEpisodeCountdown: null,
        });
      }
    }
  },

  setPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setVolume: (volume: number) => set({ volume, isMuted: volume === 0 }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  setPlaybackSpeed: (playbackSpeed: number) => set({ playbackSpeed }),
  setAudioTrack: (audioTrack: 'sub' | 'dub') => set({ audioTrack }),
  setQuality: (quality: '1080p' | '720p' | '480p' | 'auto') => set({ quality }),
  toggleAutoSkipIntro: () => set((state) => ({ autoSkipIntro: !state.autoSkipIntro })),
  toggleAutoSkipOutro: () => set((state) => ({ autoSkipOutro: !state.autoSkipOutro })),
  toggleAutoPlayNext: () => set((state) => ({ autoPlayNext: !state.autoPlayNext })),
  setCurrentTime: (currentTime: number) => set({ currentTime }),
  setDuration: (duration: number) => set({ duration }),
}));
