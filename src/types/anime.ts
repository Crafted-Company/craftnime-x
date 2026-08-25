export interface AnimeTitle {
  romaji: string;
  english?: string;
  native?: string;
  userPreferred?: string;
}

export interface AnimeCoverImage {
  extraLarge?: string;
  large: string;
  medium?: string;
  color?: string;
}

export interface AnimeTrailer {
  id?: string;
  site?: string;
  thumbnail?: string;
}

export interface AnimeCharacter {
  id: number;
  name: {
    full: string;
    native?: string;
  };
  image: {
    large: string;
  };
  role: string;
  voiceActor?: {
    name: string;
    language: string;
    image: string;
  };
}

export interface AnimeRelation {
  id: number;
  title: AnimeTitle;
  type: string;
  format: string;
  coverImage: AnimeCoverImage;
  status: string;
}

export interface AnimeEpisode {
  id: string;
  number: number;
  title: string;
  thumbnail?: string;
  duration?: string;
  isFiller?: boolean;
  hasDub?: boolean;
  hasSub?: boolean;
  airDate?: string;
  description?: string;
}

export interface AnimeItem {
  id: number;
  malId?: number;
  title: AnimeTitle;
  description: string;
  bannerImage?: string;
  coverImage: AnimeCoverImage;
  format: 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC';
  status: 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS';
  episodes?: number;
  duration?: number;
  season?: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL';
  seasonYear?: number;
  averageScore?: number;
  popularity?: number;
  genres: string[];
  studios?: string[];
  trailer?: AnimeTrailer;
  characters?: AnimeCharacter[];
  relations?: AnimeRelation[];
  streamingEpisodes?: {
    title?: string;
    thumbnail?: string;
    url?: string;
    site?: string;
  }[];
  nextAiringEpisode?: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  };
  spotlightVideoUrl?: string;
  tagline?: string;
}

export interface ContinueWatchingItem {
  anime: AnimeItem;
  episodeNumber: number;
  episodeTitle: string;
  progressPercent: number;
  currentTimeSeconds: number;
  totalDurationSeconds: number;
  lastWatchedAt: string;
  audioLanguage: 'sub' | 'dub';
}

export interface MALUserProfile {
  username: string;
  avatarUrl: string;
  episodesWatched: number;
  totalAnime: number;
  meanScore: number;
  isLoggedIn: boolean;
}
