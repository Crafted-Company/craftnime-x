import axios from 'axios';
import { AnimeItem } from '../types/anime';

const SUB_SCHEDULE_URL =
  'https://raw.githubusercontent.com/RockinChaos/AniSchedule/master/raw/sub-schedule.json';
const SUB_FEED_URL =
  'https://raw.githubusercontent.com/RockinChaos/AniSchedule/master/raw/sub-episode-feed.json';

export interface AniScheduleNode {
  episode: number;
  airingAt: number;
}

export interface AniScheduleShow {
  id: number;
  idMal: number | null;
  title?: { romaji?: string; english?: string; native?: string };
  format?: string;
  genres?: string[];
  duration?: number | null;
  seasonYear?: number | null;
  coverImage?: { extraLarge?: string; medium?: string; color?: string };
  bannerImage?: string | null;
  isAdult?: boolean;
  airingSchedule?: { nodes: AniScheduleNode[] };
}

export interface AniScheduleFeedEntry {
  id: number;
  idMal: number | null;
  format?: string;
  duration?: number | null;
  episode: { aired: number; airedAt: string; addedAt: string };
}

export class AniScheduleService {
  private static showsCache: AniScheduleShow[] | null = null;
  private static showsExpiry = 0;

  private static feedCache: AniScheduleFeedEntry[] | null = null;
  private static feedExpiry = 0;

  static async getShows(): Promise<AniScheduleShow[]> {
    if (this.showsCache && Date.now() < this.showsExpiry) {
      return this.showsCache;
    }
    try {
      const res = await axios.get(SUB_SCHEDULE_URL, { timeout: 8000 });
      if (Array.isArray(res.data) && res.data.length > 0) {
        this.showsCache = res.data;
        this.showsExpiry = Date.now() + 15 * 60 * 1000; // 15 mins
        return res.data;
      }
    } catch (e) {
      console.warn('AniSchedule shows fetch failed:', e);
    }
    return this.showsCache || [];
  }

  static async getEpisodeFeed(): Promise<AniScheduleFeedEntry[]> {
    if (this.feedCache && Date.now() < this.feedExpiry) {
      return this.feedCache;
    }
    try {
      const res = await axios.get(SUB_FEED_URL, { timeout: 8000 });
      if (Array.isArray(res.data) && res.data.length > 0) {
        this.feedCache = res.data;
        this.feedExpiry = Date.now() + 5 * 60 * 1000; // 5 mins
        return res.data;
      }
    } catch (e) {
      console.warn('AniSchedule feed fetch failed:', e);
    }
    return this.feedCache || [];
  }

  /**
   * Returns newly released anime items mapped to Craftnime's AnimeItem format
   */
  static async getLatestReleases(limit = 24): Promise<AnimeItem[]> {
    const [feed, shows] = await Promise.all([this.getEpisodeFeed(), this.getShows()]);

    if (!feed.length || !shows.length) return [];

    const showsMap = new Map<number, AniScheduleShow>();
    for (const show of shows) {
      showsMap.set(show.id, show);
    }

    const items: AnimeItem[] = [];
    const seen = new Set<number>();

    for (const entry of feed) {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);

      const show = showsMap.get(entry.id);
      if (!show) continue;
      if (show.isAdult) continue;

      const titleEn = show.title?.english || show.title?.romaji || 'Anime';
      const titleRomaji = show.title?.romaji || titleEn;
      const poster = show.coverImage?.extraLarge || show.coverImage?.medium || '';

      const animeItem: AnimeItem = {
        id: show.id,
        malId: show.idMal || undefined,
        title: {
          romaji: titleRomaji,
          english: titleEn,
          native: show.title?.native,
          userPreferred: titleEn,
        },
        description: `New Episode ${entry.episode?.aired || 1} just aired!`,
        coverImage: {
          extraLarge: poster,
          large: poster,
          medium: show.coverImage?.medium || poster,
          color: show.coverImage?.color || '#A9452D',
        },
        bannerImage: show.bannerImage || poster,
        format: (show.format as any) || 'TV',
        status: 'RELEASING',
        episodes: entry.episode?.aired || 12,
        duration: show.duration || 24,
        seasonYear: show.seasonYear || new Date().getFullYear(),
        averageScore: 85,
        popularity: 10000,
        genres: show.genres || ['Animation'],
        studios: [],
        nextAiringEpisode: undefined,
        tagline: `Episode ${entry.episode?.aired || 1} Out Now`,
      };

      items.push(animeItem);
      if (items.length >= limit) break;
    }

    return items;
  }
}
