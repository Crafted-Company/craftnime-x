import { create } from 'zustand';
import { AnimeItem } from '../types/anime';
import { AniListService, FEATURED_BILLBOARD_ANIME } from '../services/anilist';

interface AnimeState {
  // Navigation
  activeNavTab: 'home' | 'trending' | 'seasonal' | 'browse' | 'watchlist' | 'details';
  setActiveNavTab: (tab: 'home' | 'trending' | 'seasonal' | 'browse' | 'watchlist' | 'details') => void;

  // Catalog State
  featuredBillboard: AnimeItem[];
  currentBillboardIndex: number;
  newEpisodesList: AnimeItem[];
  trendingList: AnimeItem[];
  topAiringList: AnimeItem[];
  popularSeasonList: AnimeItem[];
  continueWatchingList: AnimeItem[];
  watchlist: AnimeItem[];
  selectedAnime: AnimeItem | null;
  detailedAnimeInfo: AnimeItem | null;

  // Browse & Search Filters
  searchQuery: string;
  selectedGenre: string;
  selectedSeason: string;
  selectedSeasonYear: number;
  selectedFormat: string;
  selectedSort: 'TRENDING_DESC' | 'POPULARITY_DESC' | 'SCORE_DESC' | 'START_DATE_DESC';
  browseList: AnimeItem[];
  searchResults: AnimeItem[];
  isLoading: boolean;
  isSearchModalOpen: boolean;

  // Actions
  fetchInitialCatalog: () => Promise<void>;
  setCurrentBillboardIndex: (index: number) => void;
  nextBillboard: () => void;
  prevBillboard: () => void;
  setSelectedAnime: (anime: AnimeItem | null) => Promise<void>;
  setSearchModalOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedGenre: (genre: string) => void;
  setSelectedSeason: (season: string, year?: number) => void;
  setSelectedFormat: (format: string) => void;
  setSelectedSort: (sort: 'TRENDING_DESC' | 'POPULARITY_DESC' | 'SCORE_DESC' | 'START_DATE_DESC') => void;
  applyBrowseFilters: () => Promise<void>;
  searchAnime: (query: string, genre?: string) => Promise<void>;
  toggleWatchlist: (anime: AnimeItem) => void;
  isInWatchlist: (animeId: number) => boolean;
  removeFromContinueWatching: (animeId: number) => void;
  recordWatchProgress: (
    anime: AnimeItem,
    episodeNumber: number,
    episodeTitle: string,
    currentTime?: number,
    duration?: number
  ) => void;
}

const LOCAL_STORAGE_WATCHLIST_KEY = 'craftnime_watchlist_v1';
const LOCAL_STORAGE_CONTINUE_KEY = 'craftnime_continue_watching_v1';

export const useAnimeStore = create<AnimeState>((set, get) => ({
  activeNavTab: 'home',
  setActiveNavTab: (tab) => set({ activeNavTab: tab }),

  featuredBillboard: FEATURED_BILLBOARD_ANIME,
  currentBillboardIndex: 0,
  newEpisodesList: [],
  trendingList: [],
  topAiringList: [],
  popularSeasonList: [],
  continueWatchingList: JSON.parse(localStorage.getItem(LOCAL_STORAGE_CONTINUE_KEY) || '[]'),
  watchlist: JSON.parse(localStorage.getItem(LOCAL_STORAGE_WATCHLIST_KEY) || '[]'),
  selectedAnime: null,
  detailedAnimeInfo: null,

  searchQuery: '',
  selectedGenre: 'All',
  selectedSeason: 'WINTER',
  selectedSeasonYear: 2024,
  selectedFormat: 'ALL',
  selectedSort: 'POPULARITY_DESC',
  browseList: [],
  searchResults: [],
  isLoading: false,
  isSearchModalOpen: false,

  fetchInitialCatalog: async () => {
    set({ isLoading: true });
    try {
      const [newEpisodes, trending, topAiring, seasonal] = await Promise.all([
        AniListService.getNewEpisodes(1, 24),
        AniListService.getTrending(1, 24),
        AniListService.getTopAiring(1, 10),
        AniListService.getSeasonal('WINTER', 2024, 1, 24),
      ]);

      const liveBillboard = trending.length >= 5 ? trending.slice(0, 5) : FEATURED_BILLBOARD_ANIME;

      set({
        featuredBillboard: liveBillboard,
        newEpisodesList: newEpisodes,
        trendingList: trending,
        topAiringList: topAiring,
        popularSeasonList: seasonal,
        browseList: trending,
        searchResults: trending,
        isLoading: false,
      });
    } catch (e) {
      console.error('Failed to load initial catalog', e);
      set({ isLoading: false });
    }
  },

  setCurrentBillboardIndex: (index: number) => {
    set({ currentBillboardIndex: index });
  },

  nextBillboard: () => {
    const { featuredBillboard, currentBillboardIndex } = get();
    const nextIdx = (currentBillboardIndex + 1) % featuredBillboard.length;
    set({ currentBillboardIndex: nextIdx });
  },

  prevBillboard: () => {
    const { featuredBillboard, currentBillboardIndex } = get();
    const prevIdx = (currentBillboardIndex - 1 + featuredBillboard.length) % featuredBillboard.length;
    set({ currentBillboardIndex: prevIdx });
  },

  setSelectedAnime: async (anime: AnimeItem | null) => {
    if (!anime) {
      set({ selectedAnime: null, detailedAnimeInfo: null });
      return;
    }

    set({
      selectedAnime: anime,
      detailedAnimeInfo: anime,
      activeNavTab: 'details',
    });

    try {
      const fullDetails = await AniListService.getAnimeDetails(anime.id, anime);
      if (
        fullDetails &&
        (fullDetails.id === anime.id ||
          fullDetails.malId === anime.malId ||
          fullDetails.title?.english === anime.title?.english ||
          fullDetails.title?.romaji === anime.title?.romaji)
      ) {
        set({ detailedAnimeInfo: fullDetails });
      }
    } catch (e) {
      console.warn('Could not fetch extra anime details', e);
    }
  },

  setSearchModalOpen: (open: boolean) => {
    set({ isSearchModalOpen: open });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSelectedGenre: (genre: string) => {
    set({ selectedGenre: genre });
    get().applyBrowseFilters();
  },

  setSelectedSeason: async (season: string, year?: number) => {
    const targetYear = year || get().selectedSeasonYear;
    set({
      selectedSeason: season,
      selectedSeasonYear: targetYear,
      isLoading: true,
    });
    try {
      const seasonal = await AniListService.getSeasonal(season, targetYear, 1, 40);
      set({ popularSeasonList: seasonal, isLoading: false });
    } catch (e) {
      console.error('Error fetching seasonal anime', e);
      set({ isLoading: false });
    }
  },

  setSelectedFormat: (format: string) => {
    set({ selectedFormat: format });
    get().applyBrowseFilters();
  },

  setSelectedSort: (sort) => {
    set({ selectedSort: sort });
    get().applyBrowseFilters();
  },

  applyBrowseFilters: async () => {
    const { searchQuery, selectedGenre, selectedFormat, selectedSort } = get();
    set({ isLoading: true });

    try {
      const results = await AniListService.browseCatalog(
        {
          search: searchQuery,
          genre: selectedGenre,
          format: selectedFormat,
          sort: selectedSort,
        },
        1,
        40
      );
      set({ browseList: results, isLoading: false });
    } catch (e) {
      console.error('Error applying browse filters', e);
      set({ isLoading: false });
    }
  },

  searchAnime: async (query: string, genre?: string) => {
    set({ isLoading: true });
    try {
      const results = await AniListService.search(query, genre === 'All' ? undefined : genre, 25);
      set({ searchResults: results, isLoading: false });
    } catch (e) {
      console.warn('Search query failed', e);
      set({ isLoading: false });
    }
  },

  toggleWatchlist: (anime: AnimeItem) => {
    const { watchlist } = get();
    const exists = watchlist.some((a) => a.id === anime.id);
    let updated: AnimeItem[];

    if (exists) {
      updated = watchlist.filter((a) => a.id !== anime.id);
    } else {
      updated = [anime, ...watchlist];
    }

    localStorage.setItem(LOCAL_STORAGE_WATCHLIST_KEY, JSON.stringify(updated));
    set({ watchlist: updated });
  },

  isInWatchlist: (animeId: number) => {
    const { watchlist } = get();
    return watchlist.some((a) => a.id === animeId);
  },

  removeFromContinueWatching: (animeId: number) => {
    const { continueWatchingList } = get();
    const updatedList = continueWatchingList.filter((item) => item.id !== animeId);
    localStorage.setItem(LOCAL_STORAGE_CONTINUE_KEY, JSON.stringify(updatedList));
    set({ continueWatchingList: updatedList });
  },

  recordWatchProgress: (anime, episodeNumber, episodeTitle, currentTime = 0, duration = 0) => {
    const { continueWatchingList } = get();
    const filtered = continueWatchingList.filter((item) => item.id !== anime.id);

    const progressPercent =
      duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0;

    const updatedItem: any = {
      ...anime,
      description: `Episode ${episodeNumber}: ${episodeTitle}`,
      lastWatchedEpisodeNumber: episodeNumber,
      lastWatchedEpisodeTitle: episodeTitle,
      currentTime: Math.round(currentTime),
      duration: Math.round(duration),
      progressPercent,
      updatedAt: Date.now(),
    };

    const updatedList = [updatedItem, ...filtered].slice(0, 25);
    localStorage.setItem(LOCAL_STORAGE_CONTINUE_KEY, JSON.stringify(updatedList));
    set({ continueWatchingList: updatedList });
  },
}));
