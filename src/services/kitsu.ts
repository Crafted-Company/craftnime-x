import axios from 'axios';
import { AnimeItem } from '../types/anime';

export interface KitsuEpisode {
  number: number;
  title: string;
  thumbnail: string;
  synopsis: string;
}

export class KitsuService {
  private static cache: Map<string, KitsuEpisode[]> = new Map();

  /**
   * Fetch complete franchise relationships (Prequels, Sequels, Side Stories, Spin-offs, Movies) from Kitsu
   */
  static async getRelationsForAnime(
    animeTitle: string,
    kitsuIdParam?: number
  ): Promise<any[]> {
    if (!animeTitle && !kitsuIdParam) return [];

    try {
      let targetKitsuId = kitsuIdParam;

      if (!targetKitsuId) {
        const rawTitle = animeTitle.replace(/\(TV\)/gi, '').trim();
        const seasonMappedTitle = animeTitle
          .replace(/\(TV\)/gi, '')
          .replace(/Season (\d+)/gi, '$1')
          .trim();

        let searchRes = await axios.get('https://kitsu.io/api/edge/anime', {
          params: { 'filter[text]': rawTitle },
          timeout: 5000,
        });

        let list = searchRes.data?.data;
        if (!list || list.length === 0) {
          searchRes = await axios.get('https://kitsu.io/api/edge/anime', {
            params: { 'filter[text]': seasonMappedTitle },
            timeout: 5000,
          });
          list = searchRes.data?.data;
        }

        if (!list || list.length === 0) return [];

        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetNorm = normalize(rawTitle);

        const matched =
          list.find((a: any) => {
            const attr = a.attributes || {};
            const titles = attr.titles || {};
            const canonical = normalize(attr.canonicalTitle || '');
            const en = normalize(titles.en || '');
            const enJp = normalize(titles.en_jp || '');
            return (
              canonical === targetNorm ||
              en === targetNorm ||
              enJp === targetNorm ||
              canonical.includes(targetNorm) ||
              targetNorm.includes(canonical)
            );
          }) || list[0];

        targetKitsuId = parseInt(matched.id, 10);
      }

      if (!targetKitsuId) return [];

      const relRes = await axios.get(
        `https://kitsu.io/api/edge/anime/${targetKitsuId}/media-relationships?include=destination&page[limit]=20`,
        { timeout: 6000 }
      );

      const relData = relRes.data?.data || [];
      const included = relRes.data?.included || [];
      const relations: any[] = [];

      for (const item of relData) {
        const role = item.attributes?.role || 'other';
        const destData = item.relationships?.destination?.data;
        if (!destData || destData.type !== 'anime') continue;

        const dest = included.find((x: any) => x.type === 'anime' && x.id === destData.id);
        if (!dest) continue;

        const attr = dest.attributes || {};
        const subtype = (attr.subtype || 'TV').toUpperCase();

        // Map Kitsu roles to standardized Craftnime relation types
        let type = 'OTHER';
        if (role === 'sequel') type = 'SEQUEL';
        else if (role === 'prequel') type = 'PREQUEL';
        else if (role === 'side_story') type = 'SIDE_STORY';
        else if (role === 'spinoff') type = 'SPIN_OFF';
        else if (role === 'alternative_version' || role === 'alternative_setting') type = 'ALTERNATIVE';
        else if (role === 'summary') type = 'SUMMARY';

        const titles = attr.titles || {};
        const titleRomaji = attr.canonicalTitle || titles.en_jp || titles.ja_jp || 'Anime';
        const titleEnglish = titles.en || titles.en_us || attr.canonicalTitle || titleRomaji;

        const posterImg =
          attr.posterImage?.large ||
          attr.posterImage?.original ||
          attr.posterImage?.medium ||
          'https://media.kitsu.app/anime/poster_images/11469/large.jpg';

        relations.push({
          id: parseInt(dest.id, 10) || Math.floor(Math.random() * 100000),
          malId: parseInt(dest.id, 10) || undefined,
          type,
          format: subtype,
          status: (attr.status || 'FINISHED').toUpperCase(),
          episodes: attr.episodeCount || 12,
          title: {
            romaji: titleRomaji,
            english: titleEnglish,
            userPreferred: titleEnglish,
          },
          coverImage: {
            large: posterImg,
            extraLarge: posterImg,
          },
        });
      }

      return relations;
    } catch (err) {
      console.warn('Kitsu getRelationsForAnime error:', err);
      return [];
    }
  }

  /**
   * Search Kitsu Anime ID by title
   */
  static async getKitsuAnimeId(animeTitle: string): Promise<number | null> {
    if (!animeTitle || !animeTitle.trim()) return null;
    try {
      const searchRes = await axios.get('https://kitsu.io/api/edge/anime', {
        params: { 'filter[text]': animeTitle },
        timeout: 4500,
      });
      const animeList = searchRes.data?.data;
      if (animeList && animeList.length > 0) {
        return parseInt(animeList[0].id, 10) || null;
      }
    } catch (e) {}
    return null;
  }

  /**
   * Fetch real episode titles, thumbnails, and synopses from Kitsu by anime title
   */
  static async getEpisodesForAnime(animeTitle: string): Promise<KitsuEpisode[]> {
    if (!animeTitle || !animeTitle.trim()) return [];

    const rawTitle = animeTitle.replace(/\(TV\)/gi, '').trim();
    const seasonMappedTitle = animeTitle
      .replace(/\(TV\)/gi, '')
      .replace(/Season (\d+)/gi, '$1')
      .trim();

    const cacheKey = rawTitle.toLowerCase();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // 1. Search Anime with exact title
      let searchRes = await axios.get('https://kitsu.io/api/edge/anime', {
        params: { 'filter[text]': rawTitle },
        timeout: 6000,
      });

      let animeList = searchRes.data?.data;
      if (!animeList || animeList.length === 0) {
        searchRes = await axios.get('https://kitsu.io/api/edge/anime', {
          params: { 'filter[text]': seasonMappedTitle },
          timeout: 6000,
        });
        animeList = searchRes.data?.data;
      }

      if (!animeList || animeList.length === 0) {
        return [];
      }

      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const targetNorm = normalize(rawTitle);

      // Find best match or default to first
      const matchedAnime =
        animeList.find((a: any) => {
          const attr = a.attributes || {};
          const titles = attr.titles || {};
          const canonical = normalize(attr.canonicalTitle || '');
          const en = normalize(titles.en || '');
          const enJp = normalize(titles.en_jp || '');
          return (
            canonical === targetNorm ||
            en === targetNorm ||
            enJp === targetNorm ||
            canonical.includes(targetNorm) ||
            targetNorm.includes(canonical)
          );
        }) || animeList[0];

      const kitsuId = matchedAnime.id;
      const allEpisodes: KitsuEpisode[] = [];
      let page = 0;

      while (allEpisodes.length < 150) {
        const epRes = await axios.get(`https://kitsu.io/api/edge/anime/${kitsuId}/episodes`, {
          params: { 'page[limit]': 20, 'page[offset]': page * 20 },
          timeout: 6000,
        });

        const data = epRes.data?.data || [];
        if (data.length === 0) break;

        for (const item of data) {
          const attr = item.attributes || {};
          const num = attr.number || allEpisodes.length + 1;
          const canonical = attr.canonicalTitle || '';
          const titles = attr.titles || {};
          const displayTitle =
            canonical || titles.en_jp || titles.en || titles.en_us || titles.ja_jp || '';

          allEpisodes.push({
            number: num,
            title: displayTitle,
            thumbnail: attr.thumbnail?.original || attr.thumbnail?.large || '',
            synopsis: attr.synopsis || '',
          });
        }

        if (data.length < 20) break;
        page++;
      }

      this.cache.set(cacheKey, allEpisodes);
      return allEpisodes;
    } catch (err) {
      console.warn(`Failed to fetch Kitsu episodes for "${animeTitle}":`, (err as any).message);
      return [];
    }
  }

  /**
   * Fetch Trending Anime from Kitsu
   */
  static async getTrending(limit = 30): Promise<AnimeItem[]> {
    try {
      const res = await axios.get('https://kitsu.io/api/edge/trending/anime', {
        params: { limit },
        timeout: 5000,
      });
      const data = res.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        return data.map(this.transformKitsuMedia);
      }
    } catch (e) {
      console.warn('Kitsu getTrending failed', (e as any).message);
    }
    return [];
  }

  /**
   * Fetch Top Airing / Popular from Kitsu
   */
  static async getPopular(limit = 30): Promise<AnimeItem[]> {
    try {
      const res = await axios.get('https://kitsu.io/api/edge/anime', {
        params: {
          'sort': '-userCount',
          'page[limit]': limit,
        },
        timeout: 5000,
      });
      const data = res.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        return data.map(this.transformKitsuMedia);
      }
    } catch (e) {
      console.warn('Kitsu getPopular failed', (e as any).message);
    }
    return [];
  }

  /**
   * Fetch Current Releasing / Seasonal from Kitsu
   */
  static async getSeasonal(limit = 30): Promise<AnimeItem[]> {
    try {
      const res = await axios.get('https://kitsu.io/api/edge/anime', {
        params: {
          'filter[status]': 'current',
          'sort': '-userCount',
          'page[limit]': limit,
        },
        timeout: 5000,
      });
      const data = res.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        return data.map(this.transformKitsuMedia);
      }
    } catch (e) {
      console.warn('Kitsu getSeasonal failed', (e as any).message);
    }
    return [];
  }

  /**
   * Search anime on Kitsu
   */
  static async search(query: string, limit = 24): Promise<AnimeItem[]> {
    try {
      const res = await axios.get('https://kitsu.io/api/edge/anime', {
        params: {
          'filter[text]': query,
          'page[limit]': limit,
        },
        timeout: 5000,
      });
      const data = res.data?.data;
      if (Array.isArray(data) && data.length > 0) {
        return data.map(this.transformKitsuMedia);
      }
    } catch (e) {
      console.warn('Kitsu search failed', (e as any).message);
    }
    return [];
  }

  /**
   * Transform raw Kitsu JSON:API resource to standard AnimeItem
   */
  static transformKitsuMedia(item: any): AnimeItem {
    const attr = item.attributes || {};
    const titles = attr.titles || {};
    const canonical = attr.canonicalTitle || '';
    const romaji = titles.en_jp || canonical;
    const english = titles.en || titles.en_us || canonical || romaji;
    const native = titles.ja_jp || '';

    const poster =
      attr.posterImage?.large ||
      attr.posterImage?.original ||
      attr.posterImage?.medium ||
      attr.posterImage?.small ||
      '';

    const banner =
      attr.coverImage?.large ||
      attr.coverImage?.original ||
      attr.coverImage?.small ||
      poster;

    const rawFormat = (attr.subtype || 'tv').toUpperCase();
    const format =
      rawFormat === 'TV' ||
      rawFormat === 'MOVIE' ||
      rawFormat === 'OVA' ||
      rawFormat === 'ONA' ||
      rawFormat === 'SPECIAL'
        ? rawFormat
        : 'TV';

    const rawStatus = (attr.status || 'finished').toLowerCase();
    const status =
      rawStatus === 'current'
        ? 'RELEASING'
        : rawStatus === 'unreleased' || rawStatus === 'upcoming'
        ? 'NOT_YET_RELEASED'
        : 'FINISHED';

    const score = attr.averageRating ? Math.round(parseFloat(attr.averageRating)) : 82;
    const popularity = attr.userCount || 10000;
    const numericId = parseInt(item.id, 10) || Math.floor(Math.random() * 100000);

    return {
      id: numericId,
      title: {
        romaji,
        english,
        native,
        userPreferred: english || romaji,
      },
      description:
        attr.synopsis?.replace(/<[^>]*>?/gm, '').slice(0, 300) ||
        'An epic anime adventure streaming in high fidelity.',
      coverImage: {
        extraLarge: poster,
        large: poster,
        medium: attr.posterImage?.medium || poster,
        color: '#A9452D',
      },
      bannerImage: banner,
      format,
      status,
      episodes: attr.episodeCount || 12,
      duration: attr.episodeLength || 24,
      season: 'WINTER',
      seasonYear: 2024,
      averageScore: score,
      popularity,
      genres: ['Action', 'Adventure', 'Fantasy'],
      studios: [],
    };
  }
}
