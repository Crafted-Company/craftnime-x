import axios from 'axios';
import { AnimeItem, AnimeEpisode, AnimeCharacter, AnimeRelation } from '../types/anime';

const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co';

export const FEATURED_BILLBOARD_ANIME: AnimeItem[] = [
  {
    id: 151807,
    malId: 52299,
    title: {
      romaji: 'Ore dake Level Up na Ken',
      english: 'Solo Leveling: Arise',
      native: '俺だけレベルアップな件',
      userPreferred: 'Solo Leveling',
    },
    description:
      'In a world where hunters—humans who possess magical abilities—must battle deadly monsters to protect the human race from certain annihilation, a notoriously weak hunter named Sung Jinwoo finds himself in a seemingly endless struggle for survival. Deep inside an ultra-rare double dungeon, he receives a mysterious quest log that only he can see.',
    bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37yfQA3ym8PA.jpg',
    coverImage: {
      large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-it355ZgzquUd.png',
      extraLarge: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-it355ZgzquUd.png',
      color: '#433FA9',
    },
    format: 'TV',
    status: 'RELEASING',
    episodes: 12,
    duration: 24,
    season: 'WINTER',
    seasonYear: 2024,
    averageScore: 89,
    popularity: 420000,
    genres: ['Action', 'Adventure', 'Fantasy'],
    studios: ['A-1 Pictures'],
    trailer: {
      id: 'r_Lp5Q-kZ5Q',
      site: 'youtube',
    },
    tagline: 'The Weakest Hunter of All Mankind Reawakens in Shadow',
  },
  {
    id: 145064,
    malId: 51009,
    title: {
      romaji: 'Jujutsu Kaisen 2nd Season',
      english: 'Jujutsu Kaisen Season 2',
      native: '呪術廻戦 懐玉・玉折／渋谷事変',
      userPreferred: 'Jujutsu Kaisen Season 2',
    },
    description:
      'The past comes to light as Satoru Gojo and Suguru Geto take on a dangerous mission to protect the Star Plasma Vessel. Years later, disaster strikes Tokyo as the Shibuya Incident begins, plunging the jujutsu world into an all-out war between sorcerers and cursed spirits.',
    bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/145064-esDtAY2He7sk.jpg',
    coverImage: {
      large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx145064-hSNRJM03pvv1.jpg',
      extraLarge: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx145064-hSNRJM03pvv1.jpg',
      color: '#A9452D',
    },
    format: 'TV',
    status: 'FINISHED',
    episodes: 23,
    duration: 24,
    season: 'SUMMER',
    seasonYear: 2023,
    averageScore: 90,
    popularity: 490000,
    genres: ['Action', 'Fantasy', 'Supernatural'],
    studios: ['MAPPA'],
    trailer: {
      id: 'AYnMY6p_z80',
      site: 'youtube',
    },
    tagline: 'The Shibuya Incident Unfolds. Unleash the Infinite Void.',
  },
  {
    id: 154587,
    malId: 52991,
    title: {
      romaji: 'Sousou no Frieren',
      english: "Frieren: Beyond Journey's End",
      native: '葬送のフリーレン',
      userPreferred: "Frieren: Beyond Journey's End",
    },
    description:
      'The demon king has been defeated, and the victorious hero party returns home before disbanding. The four—mage Frieren, hero Himmel, priest Heiter, and warrior Eisen—reminisce over their decade-long journey. But the passing of time is different for elves, prompting Frieren to embark on a new quest to understand the human heart.',
    bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg',
    coverImage: {
      large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-qQTzQnEJJ3oB.jpg',
      extraLarge: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-qQTzQnEJJ3oB.jpg',
      color: '#6864F6',
    },
    format: 'TV',
    status: 'FINISHED',
    episodes: 28,
    duration: 24,
    season: 'FALL',
    seasonYear: 2023,
    averageScore: 91,
    popularity: 380000,
    genres: ['Adventure', 'Drama', 'Fantasy'],
    studios: ['Madhouse'],
    trailer: {
      id: 'ZEkwCGJ3o_0',
      site: 'youtube',
    },
    tagline: 'The Journey After the End of All Legends',
  },
];

export const FALLBACK_TRENDING = FEATURED_BILLBOARD_ANIME;

const GRAPHQL_FIELDS = `
  id
  idMal
  title {
    romaji
    english
    native
    userPreferred
  }
  description(asHtml: false)
  bannerImage
  coverImage {
    extraLarge
    large
    medium
    color
  }
  format
  status
  episodes
  duration
  season
  seasonYear
  averageScore
  popularity
  genres
  studios(isMain: true) {
    nodes {
      name
    }
  }
  trailer {
    id
    site
    thumbnail
  }
  nextAiringEpisode {
    airingAt
    timeUntilAiring
    episode
  }
`;

const GRAPHQL_DETAIL_FIELDS = `
  ${GRAPHQL_FIELDS}
  streamingEpisodes {
    title
    thumbnail
    url
    site
  }
  characters(role: MAIN, perPage: 8) {
    edges {
      role
      node {
        id
        name {
          full
          native
        }
        image {
          large
        }
      }
      voiceActors(language: JAPANESE) {
        name {
          full
        }
        image {
          large
        }
        languageV2
      }
    }
  }
  relations {
    edges {
      relationType
      node {
        id
        idMal
        title {
          romaji
          english
          userPreferred
        }
        format
        status
        episodes
        bannerImage
        coverImage {
          large
          extraLarge
        }
      }
    }
  }
`;

export interface BrowseFilters {
  search?: string;
  genre?: string;
  season?: string;
  seasonYear?: number;
  format?: string;
  status?: string;
  sort?: 'TRENDING_DESC' | 'POPULARITY_DESC' | 'SCORE_DESC' | 'FAVOURITES_DESC' | 'START_DATE_DESC';
}

export class AniListService {
  static async getTrending(page = 1, perPage = 18): Promise<AnimeItem[]> {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
            ${GRAPHQL_FIELDS}
          }
        }
      }
    `;
    try {
      const res = await axios.post(
        ANILIST_GRAPHQL_URL,
        { query, variables: { page, perPage } },
        { timeout: 7000 }
      );
      const media = res.data?.data?.Page?.media;
      if (media && media.length > 0) {
        return media.map(this.transformMedia);
      }
    } catch (e) {
      console.warn('AniList getTrending failed, using fallback', e);
    }
    return FALLBACK_TRENDING;
  }

  static async getTopAiring(page = 1, perPage = 10): Promise<AnimeItem[]> {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(sort: SCORE_DESC, type: ANIME, status: RELEASING, isAdult: false) {
            ${GRAPHQL_FIELDS}
          }
        }
      }
    `;
    try {
      const res = await axios.post(
        ANILIST_GRAPHQL_URL,
        { query, variables: { page, perPage } },
        { timeout: 7000 }
      );
      const media = res.data?.data?.Page?.media;
      if (media && media.length > 0) {
        return media.map(this.transformMedia);
      }
    } catch (e) {
      console.warn('AniList Top Airing failed, using fallback', e);
    }
    return FALLBACK_TRENDING.slice(0, 10);
  }

  static async getSeasonal(season = 'WINTER', seasonYear = 2024, page = 1, perPage = 18): Promise<AnimeItem[]> {
    const query = `
      query ($page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int) {
        Page(page: $page, perPage: $perPage) {
          media(season: $season, seasonYear: $seasonYear, type: ANIME, isAdult: false, sort: POPULARITY_DESC) {
            ${GRAPHQL_FIELDS}
          }
        }
      }
    `;
    try {
      const res = await axios.post(
        ANILIST_GRAPHQL_URL,
        { query, variables: { page, perPage, season, seasonYear } },
        { timeout: 7000 }
      );
      const media = res.data?.data?.Page?.media;
      if (media && media.length > 0) {
        return media.map(this.transformMedia);
      }
    } catch (e) {
      console.warn('AniList Seasonal query failed', e);
    }
    return FALLBACK_TRENDING;
  }

  static async browseCatalog(filters: BrowseFilters, page = 1, perPage = 24): Promise<AnimeItem[]> {
    const query = `
      query (
        $page: Int,
        $perPage: Int,
        $search: String,
        $genre: String,
        $season: MediaSeason,
        $seasonYear: Int,
        $format: MediaFormat,
        $status: MediaStatus,
        $sort: [MediaSort]
      ) {
        Page(page: $page, perPage: $perPage) {
          media(
            search: $search,
            genre: $genre,
            season: $season,
            seasonYear: $seasonYear,
            format: $format,
            status: $status,
            sort: $sort,
            type: ANIME,
            isAdult: false
          ) {
            ${GRAPHQL_FIELDS}
          }
        }
      }
    `;

    try {
      const variables: Record<string, any> = {
        page,
        perPage,
        sort: [filters.sort || 'POPULARITY_DESC'],
      };

      if (filters.search && filters.search.trim()) variables.search = filters.search.trim();
      if (filters.genre && filters.genre !== 'All') variables.genre = filters.genre;
      if (filters.season && filters.season !== 'ALL') variables.season = filters.season;
      if (filters.seasonYear) variables.seasonYear = Number(filters.seasonYear);
      if (filters.format && filters.format !== 'ALL') variables.format = filters.format;
      if (filters.status && filters.status !== 'ALL') variables.status = filters.status;

      const res = await axios.post(
        ANILIST_GRAPHQL_URL,
        { query, variables },
        { timeout: 7000 }
      );
      const media = res.data?.data?.Page?.media;
      if (media) {
        return media.map(this.transformMedia);
      }
    } catch (e) {
      console.warn('AniList browse query failed, filtering fallback', e);
    }

    return FALLBACK_TRENDING.filter((item) => {
      const matchSearch = !filters.search || (item.title.english || item.title.romaji).toLowerCase().includes(filters.search.toLowerCase());
      const matchGenre = !filters.genre || filters.genre === 'All' || item.genres.includes(filters.genre);
      return matchSearch && matchGenre;
    });
  }

  static async getAnimeDetails(id: number): Promise<AnimeItem | null> {
    const query = `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          ${GRAPHQL_DETAIL_FIELDS}
        }
      }
    `;
    try {
      const res = await axios.post(
        ANILIST_GRAPHQL_URL,
        { query, variables: { id } },
        { timeout: 7000 }
      );
      const raw = res.data?.data?.Media;
      if (raw) {
        const item = this.transformMedia(raw);
        item.streamingEpisodes = raw.streamingEpisodes || [];
        if (raw.characters?.edges) {
          item.characters = raw.characters.edges.map((edge: any): AnimeCharacter => ({
            id: edge.node.id,
            name: edge.node.name,
            image: edge.node.image,
            role: edge.role,
            voiceActor: edge.voiceActors?.[0] ? {
              name: edge.voiceActors[0].name?.full,
              image: edge.voiceActors[0].image?.large,
              language: edge.voiceActors[0].languageV2 || 'Japanese',
            } : undefined,
          }));
        }
        if (raw.relations?.edges) {
          item.relations = raw.relations.edges.map((edge: any): AnimeRelation => ({
            id: edge.node.id,
            title: edge.node.title,
            type: edge.relationType,
            format: edge.node.format,
            coverImage: edge.node.coverImage,
            status: edge.node.status,
          }));
        }
        return item;
      }
    } catch (e) {
      console.warn(`Failed to fetch details for anime id ${id}`, e);
    }
    return FALLBACK_TRENDING.find((a) => a.id === id) || null;
  }

  static async search(searchQuery: string, genre?: string, perPage = 20): Promise<AnimeItem[]> {
    return this.browseCatalog({ search: searchQuery, genre }, 1, perPage);
  }

  static generateEpisodes(anime: AnimeItem): AnimeEpisode[] {
    const total = anime.episodes || (anime.nextAiringEpisode ? anime.nextAiringEpisode.episode - 1 : 24);
    const count = Math.max(1, total);
    const episodes: AnimeEpisode[] = [];
    const streaming = Array.isArray(anime.streamingEpisodes) ? anime.streamingEpisodes : [];

    const defaultCover =
      anime.bannerImage ||
      anime.coverImage?.extraLarge ||
      anime.coverImage?.large ||
      anime.coverImage?.medium ||
      '';

    const animeTitleStr =
      typeof anime.title === 'object'
        ? anime.title?.english || anime.title?.romaji || anime.title?.userPreferred || 'Anime'
        : String(anime.title || 'Anime');

    for (let i = 1; i <= count; i++) {
      const streamMatch =
        streaming[i - 1] ||
        streaming.find(
          (s) =>
            s &&
            typeof s.title === 'string' &&
            (s.title.toLowerCase().includes(`episode ${i}`) || s.title.toLowerCase().includes(`ep ${i}`))
        );

      const thumb = streamMatch?.thumbnail || defaultCover;
      const realTitle = streamMatch?.title
        ? String(streamMatch.title).replace(/^Episode \d+ - /, '')
        : this.getEpisodeTitleSnippet(i);

      episodes.push({
        id: `${anime.id}-ep-${i}`,
        number: i,
        title: `Episode ${i}: ${realTitle}`,
        thumbnail: thumb,
        duration: '24m',
        hasDub: true,
        hasSub: true,
        isFiller: i % 12 === 0,
        airDate: `Episode ${i}`,
        description: `Official broadcast Episode ${i} of ${animeTitleStr}. Stream in 1080p high definition.`,
      });
    }
    return episodes;
  }

  private static getEpisodeTitleSnippet(ep: number): string {
    const titles = [
      'Awakening & The First Descent',
      'The Secret Power of the Shadow',
      'Blood, Steel & Resolution',
      'Echoes of the Forgotten Realm',
      'Limit Break & Dual Strike',
      'The Domain Expansion Clash',
      'Battle of the Supreme Ascendant',
      'A Promise Across Two Worlds',
      'Shadow Monarch Rebirth',
      'The Final Standoff in the Void',
      'Resurgence of the Lost Clan',
      'Beyond Eternity: New Horizon',
    ];
    return titles[(ep - 1) % titles.length];
  }

  private static transformMedia(raw: any): AnimeItem {
    const epCount =
      raw.episodes ||
      (raw.nextAiringEpisode ? raw.nextAiringEpisode.episode - 1 : undefined);

    return {
      id: raw.id,
      malId: raw.idMal,
      title: raw.title,
      description: (raw.description || '').replace(/<[^>]*>?/gm, ''),
      bannerImage: raw.bannerImage || raw.coverImage?.extraLarge || raw.coverImage?.large,
      coverImage: raw.coverImage,
      format: raw.format || 'TV',
      status: raw.status || 'FINISHED',
      episodes: epCount,
      duration: raw.duration || 24,
      season: raw.season,
      seasonYear: raw.seasonYear,
      averageScore: raw.averageScore,
      popularity: raw.popularity,
      genres: raw.genres || [],
      studios: raw.studios?.nodes?.map((n: any) => n.name) || [],
      trailer: raw.trailer,
      streamingEpisodes: raw.streamingEpisodes || [],
      nextAiringEpisode: raw.nextAiringEpisode,
      spotlightVideoUrl: raw.spotlightVideoUrl,
    };
  }
}
