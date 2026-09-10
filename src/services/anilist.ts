import axios from 'axios';
import { AnimeItem, AnimeEpisode } from '../types/anime';
import { KitsuService } from './kitsu';

const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co';

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
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  format
  status
  episodes
  duration
  season
  seasonYear
  averageScore
  meanScore
  popularity
  genres
  studios(isMain: true) {
    nodes {
      name
    }
  }
  nextAiringEpisode {
    airingAt
    timeUntilAiring
    episode
  }
  trailer {
    id
    site
    thumbnail
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
  sort?: 'TRENDING_DESC' | 'POPULARITY_DESC' | 'SCORE_DESC' | 'START_DATE_DESC';
}

export class AniListService {
  static async getTrending(page = 1, perPage = 30): Promise<AnimeItem[]> {
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
        { timeout: 5000 }
      );
      const media = res.data?.data?.Page?.media;
      if (media && media.length > 0) {
        return media.map(this.transformMedia);
      }
    } catch (e) {
      console.warn('AniList getTrending failed, attempting Kitsu fallback...');
    }

    try {
      const kitsuList = await KitsuService.getTrending(perPage);
      if (kitsuList && kitsuList.length > 0) {
        return kitsuList;
      }
    } catch (kErr) {
      console.warn('Kitsu getTrending fallback failed:', kErr);
    }

    return MASTER_CURATED_CATALOG;
  }

  static async getNewEpisodes(page = 1, perPage = 24): Promise<AnimeItem[]> {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(sort: TRENDING_DESC, type: ANIME, status: RELEASING, isAdult: false) {
            ${GRAPHQL_FIELDS}
          }
        }
      }
    `;
    try {
      const res = await axios.post(
        ANILIST_GRAPHQL_URL,
        { query, variables: { page, perPage } },
        { timeout: 5000 }
      );
      const media = res.data?.data?.Page?.media;
      if (media && media.length > 0) {
        return media.map(this.transformMedia);
      }
    } catch (e) {
      console.warn('AniList getNewEpisodes failed, using Kitsu fallback...');
    }

    try {
      const kitsuList = await KitsuService.getTrending(perPage);
      if (kitsuList && kitsuList.length > 0) {
        return kitsuList;
      }
    } catch (kErr) {
      console.warn('Kitsu getNewEpisodes fallback failed:', kErr);
    }

    return MASTER_CURATED_CATALOG.filter((a) => a.status === 'RELEASING' || !a.status);
  }

  static async getTopAiring(page = 1, perPage = 20): Promise<AnimeItem[]> {
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
        { timeout: 5000 }
      );
      const media = res.data?.data?.Page?.media;
      if (media && media.length > 0) {
        return media.map(this.transformMedia);
      }
    } catch (e) {
      console.warn('AniList getTopAiring failed, attempting Kitsu fallback...');
    }

    try {
      const kitsuList = await KitsuService.getPopular(perPage);
      if (kitsuList && kitsuList.length > 0) {
        return kitsuList;
      }
    } catch (kErr) {}

    return MASTER_CURATED_CATALOG.slice(0, 15);
  }

  static async getSeasonal(
    season: string,
    seasonYear: number,
    page = 1,
    perPage = 30
  ): Promise<AnimeItem[]> {
    const query = `
      query ($season: MediaSeason, $seasonYear: Int, $page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
            ${GRAPHQL_FIELDS}
          }
        }
      }
    `;
    try {
      const res = await axios.post(
        ANILIST_GRAPHQL_URL,
        { query, variables: { season, seasonYear, page, perPage } },
        { timeout: 5000 }
      );
      const media = res.data?.data?.Page?.media;
      if (media && media.length > 0) {
        return media.map(this.transformMedia);
      }
    } catch (e) {
      console.warn('AniList getSeasonal failed, attempting Kitsu fallback...');
    }

    try {
      const kitsuList = await KitsuService.getSeasonal(perPage);
      if (kitsuList && kitsuList.length > 0) {
        return kitsuList;
      }
    } catch (kErr) {}

    return MASTER_CURATED_CATALOG;
  }

  static async browseCatalog(
    filters: BrowseFilters,
    page = 1,
    perPage = 40
  ): Promise<AnimeItem[]> {
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

    const variables: any = { page, perPage };
    if (filters.search) variables.search = filters.search;
    if (filters.genre && filters.genre !== 'All') variables.genre = filters.genre;
    if (filters.season) variables.season = filters.season;
    if (filters.seasonYear) variables.seasonYear = filters.seasonYear;
    if (filters.format && filters.format !== 'ALL') variables.format = filters.format;
    if (filters.status) variables.status = filters.status;
    variables.sort = filters.sort ? [filters.sort] : ['POPULARITY_DESC'];

    try {
      const res = await axios.post(
        ANILIST_GRAPHQL_URL,
        { query, variables },
        { timeout: 5000 }
      );
      const media = res.data?.data?.Page?.media;
      if (media && media.length > 0) {
        return media.map(this.transformMedia);
      }
    } catch (e) {
      console.warn('AniList browseCatalog failed, attempting Kitsu fallback...');
    }

    try {
      if (filters.search) {
        const kitsuResults = await KitsuService.search(filters.search, perPage);
        if (kitsuResults.length > 0) return kitsuResults;
      } else {
        const kitsuPop = await KitsuService.getPopular(perPage);
        if (kitsuPop.length > 0) return kitsuPop;
      }
    } catch (kErr) {}

    let list = [...MASTER_CURATED_CATALOG];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((a) => {
        const titleStr = typeof a.title === 'object' ? `${a.title.english} ${a.title.romaji}` : String(a.title);
        return titleStr.toLowerCase().includes(q);
      });
    }
    if (filters.genre && filters.genre !== 'All') {
      list = list.filter((a) => a.genres?.some((g) => g.toLowerCase() === filters.genre?.toLowerCase()));
    }
    return list;
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
      const media = res.data?.data?.Media;
      if (media) {
        const item = this.transformMedia(media);
        if (media.streamingEpisodes) {
          item.streamingEpisodes = media.streamingEpisodes;
        }
        if (media.characters?.edges) {
          item.characters = media.characters.edges.map((edge: any) => ({
            id: edge.node.id,
            role: edge.role,
            name: {
              full: edge.node.name?.full || '',
              native: edge.node.name?.native || '',
            },
            image: {
              large: edge.node.image?.large || '',
            },
            voiceActor: edge.voiceActors?.[0]
              ? {
                  name: edge.voiceActors[0].name?.full || '',
                  image: edge.voiceActors[0].image?.large || '',
                  language: edge.voiceActors[0].languageV2 || 'Japanese',
                }
              : undefined,
          }));
        }
        if (media.relations?.edges) {
          item.relations = media.relations.edges.map((edge: any) => ({
            id: edge.node.id,
            malId: edge.node.idMal,
            type: edge.relationType,
            title: {
              romaji: edge.node.title?.romaji || '',
              english: edge.node.title?.english || edge.node.title?.romaji || '',
              userPreferred: edge.node.title?.userPreferred || '',
            },
            format: edge.node.format,
            episodes: edge.node.episodes,
            coverImage: edge.node.coverImage,
            status: edge.node.status,
          }));
        }
        return item;
      }
    } catch (e) {
      console.warn(`Failed to fetch details for anime id ${id}`, e);
    }
    const matched = MASTER_CURATED_CATALOG.find((a) => a.id === id || a.malId === id);
    if (matched) {
      if (!matched.relations || matched.relations.length === 0) {
        const title = matched.title?.english || matched.title?.romaji || '';
        try {
          const kitsuRels = await KitsuService.getRelationsForAnime(title);
          if (kitsuRels && kitsuRels.length > 0) {
            return { ...matched, relations: kitsuRels };
          }
        } catch {}
      }
      return matched;
    }

    try {
      const kitsuDetails = await KitsuService.getTrending(30);
      const kMatch = kitsuDetails.find((a) => a.id === id);
      if (kMatch) {
        const title = kMatch.title?.english || kMatch.title?.romaji || '';
        try {
          const rels = await KitsuService.getRelationsForAnime(title);
          if (rels && rels.length > 0) {
            return { ...kMatch, relations: rels };
          }
        } catch {}
        return kMatch;
      }
    } catch (e) {}

    return MASTER_CURATED_CATALOG[0] || null;
  }

  static async search(searchQuery: string, genre?: string, perPage = 20): Promise<AnimeItem[]> {
    return this.browseCatalog({ search: searchQuery, genre }, 1, perPage);
  }

  static generateEpisodes(anime: AnimeItem, extraEpisodes: any[] = []): AnimeEpisode[] {
    const total = anime.episodes || (anime.nextAiringEpisode ? anime.nextAiringEpisode.episode - 1 : 24);
    const count = Math.max(1, total);
    const episodes: AnimeEpisode[] = [];

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

    const nextAirEp = anime.nextAiringEpisode?.episode;
    const nowSecs = Math.floor(Date.now() / 1000);

    for (let i = 1; i <= count; i++) {
      let displayTitle = '';
      let thumb = defaultCover;
      let description = `Official broadcast Episode ${i} of ${animeTitleStr}. Stream in 1080p high definition.`;
      let airDate = `Episode ${i}`;
      let airDateUtc = '';
      let isAired = true;
      let releaseDateFormatted = '';

      // 1. Check AniZip / Extra episodes array first
      const extraMatch = extraEpisodes.find((e) => e.number === i);
      if (extraMatch) {
        if (extraMatch.title) displayTitle = extraMatch.title;
        if (extraMatch.thumbnail) thumb = extraMatch.thumbnail;
        if (extraMatch.synopsis) description = extraMatch.synopsis;
        if (extraMatch.airDate) airDate = extraMatch.airDate;
        if (extraMatch.airDateUtc) {
          airDateUtc = extraMatch.airDateUtc;
          const epAirSecs = Math.floor(new Date(extraMatch.airDateUtc).getTime() / 1000);
          if (!isNaN(epAirSecs) && epAirSecs > nowSecs) {
            isAired = false;
            releaseDateFormatted = new Date(extraMatch.airDateUtc).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          }
        }
      }

      // 2. Check nextAiringEpisode from AniList if not finished
      if (nextAirEp && i >= nextAirEp) {
        isAired = false;
        if (i === nextAirEp && anime.nextAiringEpisode?.airingAt) {
          const date = new Date(anime.nextAiringEpisode.airingAt * 1000);
          releaseDateFormatted = date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
        }
      }

      // If status is NOT_YET_RELEASED
      if (anime.status === 'NOT_YET_RELEASED') {
        isAired = false;
      }

      if (!displayTitle) {
        displayTitle = `Episode ${i}`;
      }

      episodes.push({
        id: `${anime.id}-ep-${i}`,
        number: i,
        title: `Episode ${i}: ${displayTitle}`,
        thumbnail: thumb,
        duration: '24m',
        hasDub: true,
        hasSub: true,
        isFiller: false,
        airDate,
        airDateUtc,
        description,
        isAired,
        releaseDateFormatted,
      });
    }
    return episodes;
  }

  private static transformMedia(media: any): AnimeItem {
    return {
      id: media.id,
      malId: media.idMal || media.id,
      title: {
        romaji: media.title?.romaji || '',
        english: media.title?.english || media.title?.romaji || '',
        native: media.title?.native || '',
        userPreferred: media.title?.userPreferred || media.title?.english || media.title?.romaji || '',
      },
      description: media.description
        ? media.description.replace(/<[^>]*>?/gm, '').slice(0, 300) + '...'
        : 'An epic anime adventure broadcast in supreme audio and visual fidelity.',
      coverImage: {
        extraLarge: media.coverImage?.extraLarge || media.coverImage?.large || '',
        large: media.coverImage?.large || '',
        medium: media.coverImage?.medium || '',
        color: media.coverImage?.color || '#A9452D',
      },
      bannerImage: media.bannerImage || media.coverImage?.extraLarge || '',
      format: media.format || 'TV',
      status: media.status || 'FINISHED',
      episodes: media.episodes,
      duration: media.duration || 24,
      season: media.season || 'WINTER',
      seasonYear: media.seasonYear || 2024,
      averageScore: media.averageScore || media.meanScore || 80,
      popularity: media.popularity || 0,
      genres: media.genres || [],
      studios: media.studios?.nodes?.map((s: any) => s.name) || [],
      nextAiringEpisode: media.nextAiringEpisode,
      trailer: media.trailer,
    };
  }
}

export const MASTER_CURATED_CATALOG: AnimeItem[] = [
  {
    id: 154587,
    malId: 52991,
    title: {
      romaji: 'Sousou no Frieren',
      english: "Frieren: Beyond Journey's End",
      userPreferred: "Frieren: Beyond Journey's End",
    },
    description:
      'The demon king has been defeated, and the victorious hero party returns home before disbanding. The four—mage Frieren, hero Himmel, priest Heiter, and warrior Eisen—reminisce to say goodbye.',
    coverImage: {
      extraLarge: 'https://media.kitsu.app/anime/46474/poster_image/large-ec9b98dd5fbf8f92532d1edb45f9e882.jpeg',
      large: 'https://media.kitsu.app/anime/46474/poster_image/large-ec9b98dd5fbf8f92532d1edb45f9e882.jpeg',
      medium: 'https://media.kitsu.app/anime/46474/poster_image/large-ec9b98dd5fbf8f92532d1edb45f9e882.jpeg',
      color: '#A9452D',
    },
    bannerImage: 'https://media.kitsu.app/anime/46474/cover_image/large-167edf3e01fac59ce6aacfeb47df5634.jpeg',
    format: 'TV',
    status: 'FINISHED',
    episodes: 28,
    duration: 24,
    season: 'FALL',
    seasonYear: 2023,
    averageScore: 91,
    popularity: 280000,
    genres: ['Adventure', 'Drama', 'Fantasy'],
    studios: ['Madhouse'],
  },
  {
    id: 151807,
    malId: 52299,
    title: {
      romaji: 'Ore dake Level Up na Ken',
      english: 'Solo Leveling',
      userPreferred: 'Solo Leveling',
    },
    description:
      'Over a decade after the appearance of gates connecting our world to another dimension, Sung Jinwoo, notoriously known as the weakest hunter of all mankind, awakens a secretive quest log.',
    coverImage: {
      extraLarge: 'https://media.kitsu.app/anime/46231/poster_image/large-cdadff31f42490b9f48a035939a01a92.jpeg',
      large: 'https://media.kitsu.app/anime/46231/poster_image/large-cdadff31f42490b9f48a035939a01a92.jpeg',
      medium: 'https://media.kitsu.app/anime/46231/poster_image/large-cdadff31f42490b9f48a035939a01a92.jpeg',
      color: '#3B82F6',
    },
    bannerImage: 'https://media.kitsu.app/anime/46231/cover_image/large-33273dc297cdc8b10cc1140de07d3dae.jpeg',
    format: 'TV',
    status: 'FINISHED',
    episodes: 12,
    duration: 24,
    season: 'WINTER',
    seasonYear: 2024,
    averageScore: 84,
    popularity: 260000,
    genres: ['Action', 'Adventure', 'Fantasy'],
    studios: ['A-1 Pictures'],
  },
  {
    id: 168010,
    malId: 56784,
    title: {
      romaji: 'Boku no Hero Academia 7',
      english: 'My Hero Academia Season 7',
      userPreferred: 'My Hero Academia Season 7',
    },
    description:
      'The battle between Heroes and Villains escalates toward its climax as Star and Stripe arrives from the United States to confront All For One and Tomura Shigaraki.',
    coverImage: {
      extraLarge: 'https://media.kitsu.app/anime/poster_images/11469/large.jpg',
      large: 'https://media.kitsu.app/anime/poster_images/11469/large.jpg',
      medium: 'https://media.kitsu.app/anime/poster_images/11469/large.jpg',
      color: '#10B981',
    },
    bannerImage: 'https://media.kitsu.app/anime/cover_images/11469/large.jpg',
    format: 'TV',
    status: 'RELEASING',
    episodes: 21,
    duration: 24,
    season: 'SPRING',
    seasonYear: 2024,
    averageScore: 85,
    popularity: 190000,
    genres: ['Action', 'Adventure', 'Super Power'],
    studios: ['BONES'],
  },
  {
    id: 166240,
    malId: 55701,
    title: {
      romaji: 'Kimetsu no Yaiba: Hashira Geiko-hen',
      english: 'Demon Slayer: Kimetsu no Yaiba Hashira Training Arc',
      userPreferred: 'Demon Slayer: Hashira Training Arc',
    },
    description:
      'Tanjiro and the Demon Slayer Corps undertake rigorous training under the formidable Hashira to prepare for the inevitable showdown in the Infinity Castle.',
    coverImage: {
      extraLarge: 'https://media.kitsu.app/anime/poster_images/41370/large.jpg',
      large: 'https://media.kitsu.app/anime/poster_images/41370/large.jpg',
      medium: 'https://media.kitsu.app/anime/poster_images/41370/large.jpg',
      color: '#EF4444',
    },
    bannerImage: 'https://media.kitsu.app/anime/41370/cover_image/large-3de3cc6d2b33162c928de10aa201e4ba.jpeg',
    format: 'TV',
    status: 'FINISHED',
    episodes: 8,
    duration: 24,
    season: 'SPRING',
    seasonYear: 2024,
    averageScore: 86,
    popularity: 220000,
    genres: ['Action', 'Fantasy', 'Historical'],
    studios: ['ufotable'],
  },
  {
    id: 145064,
    malId: 51009,
    title: {
      romaji: 'Jujutsu Kaisen 2nd Season',
      english: 'Jujutsu Kaisen Season 2',
      userPreferred: 'Jujutsu Kaisen Season 2',
    },
    description:
      'Unveiling Gojo and Geto’s past during the Hidden Inventory arc, followed by the catastrophic incident in Shibuya on Halloween night.',
    coverImage: {
      extraLarge: 'https://media.kitsu.app/anime/42765/poster_image/large-5ce19551c1a6cf995b378205b9149b5c.jpeg',
      large: 'https://media.kitsu.app/anime/42765/poster_image/large-5ce19551c1a6cf995b378205b9149b5c.jpeg',
      medium: 'https://media.kitsu.app/anime/42765/poster_image/large-5ce19551c1a6cf995b378205b9149b5c.jpeg',
      color: '#8B5CF6',
    },
    bannerImage: 'https://media.kitsu.app/anime/cover_images/42765/large.jpg',
    format: 'TV',
    status: 'FINISHED',
    episodes: 23,
    duration: 24,
    season: 'SUMMER',
    seasonYear: 2023,
    averageScore: 88,
    popularity: 310000,
    genres: ['Action', 'Supernatural'],
    studios: ['MAPPA'],
  },
  {
    id: 156822,
    malId: 53580,
    title: {
      romaji: 'Tensei shitara Slime Datta Ken 3rd Season',
      english: 'That Time I Got Reincarnated as a Slime Season 3',
      userPreferred: 'Tensura Season 3',
    },
    description:
      'Following Rimuru’s ascension to Demon Lord, the Jura Tempest Federation prepares for diplomatic relations and the Tempest Founder’s Festival.',
    coverImage: {
      extraLarge: 'https://media.kitsu.app/anime/poster_images/41024/large.jpg',
      large: 'https://media.kitsu.app/anime/poster_images/41024/large.jpg',
      medium: 'https://media.kitsu.app/anime/poster_images/41024/large.jpg',
      color: '#06B6D4',
    },
    bannerImage: 'https://media.kitsu.app/anime/cover_images/41024/large.jpg',
    format: 'TV',
    status: 'FINISHED',
    episodes: 24,
    duration: 24,
    season: 'SPRING',
    seasonYear: 2024,
    averageScore: 81,
    popularity: 140000,
    genres: ['Action', 'Adventure', 'Comedy', 'Fantasy'],
    studios: ['8bit'],
  },
  {
    id: 153288,
    malId: 52588,
    title: {
      romaji: 'Kaijuu 8-gou',
      english: 'Kaiju No. 8',
      userPreferred: 'Kaiju No. 8',
    },
    description:
      'In a world ravaged by monstrous beasts known as Kaiju, Kafka Hibino aspires to enlist in the Defense Force, but an unexpected transformation changes everything.',
    coverImage: {
      extraLarge: 'https://media.kitsu.app/anime/46300/poster_image/large-31cc66fd5854cc555d496ced7ab40c31.jpeg',
      large: 'https://media.kitsu.app/anime/46300/poster_image/large-31cc66fd5854cc555d496ced7ab40c31.jpeg',
      medium: 'https://media.kitsu.app/anime/46300/poster_image/large-31cc66fd5854cc555d496ced7ab40c31.jpeg',
      color: '#10B981',
    },
    bannerImage: 'https://media.kitsu.app/anime/46300/cover_image/large-beb78aec0cb2066bc44ea52f66311e04.jpeg',
    format: 'TV',
    status: 'FINISHED',
    episodes: 12,
    duration: 24,
    season: 'SPRING',
    seasonYear: 2024,
    averageScore: 82,
    popularity: 175000,
    genres: ['Action', 'Sci-Fi'],
    studios: ['Production I.G'],
  },
  {
    id: 110277,
    malId: 40028,
    title: {
      romaji: 'Shingeki no Kyojin: The Final Season',
      english: 'Attack on Titan Final Season',
      userPreferred: 'Attack on Titan Final Season',
    },
    description:
      'Gabi Braun and Falco Grice have been training their entire lives to inherit one of the seven Titans under Marley’s control as the battle for Paradis island begins.',
    coverImage: {
      extraLarge: 'https://media.kitsu.app/anime/poster_images/7442/large.jpg',
      large: 'https://media.kitsu.app/anime/poster_images/7442/large.jpg',
      medium: 'https://media.kitsu.app/anime/poster_images/7442/large.jpg',
      color: '#F59E0B',
    },
    bannerImage: 'https://media.kitsu.app/anime/cover_images/7442/large.jpg',
    format: 'TV',
    status: 'FINISHED',
    episodes: 16,
    duration: 24,
    season: 'WINTER',
    seasonYear: 2021,
    averageScore: 89,
    popularity: 390000,
    genres: ['Action', 'Drama', 'Fantasy', 'Mystery'],
    studios: ['MAPPA'],
  },
  {
    id: 127230,
    malId: 44511,
    title: {
      romaji: 'Chainsaw Man',
      english: 'Chainsaw Man',
      userPreferred: 'Chainsaw Man',
    },
    description:
      'Denji is a young man living as a Devil Hunter with Pochita, the Chainsaw Devil. After being betrayed and killed, Pochita fuses with Denji’s heart to revive him as Chainsaw Man.',
    coverImage: {
      extraLarge: 'https://media.kitsu.app/anime/43806/poster_image/large-815d6008fb3b56f4291b9f0ffa05cd8f.jpeg',
      large: 'https://media.kitsu.app/anime/43806/poster_image/large-815d6008fb3b56f4291b9f0ffa05cd8f.jpeg',
      medium: 'https://media.kitsu.app/anime/43806/poster_image/large-815d6008fb3b56f4291b9f0ffa05cd8f.jpeg',
      color: '#E11D48',
    },
    bannerImage: 'https://media.kitsu.app/anime/43806/cover_image/large-964674a0f11524f62d65dde845ad8e1f.jpeg',
    format: 'TV',
    status: 'FINISHED',
    episodes: 12,
    duration: 24,
    season: 'FALL',
    seasonYear: 2022,
    averageScore: 86,
    popularity: 340000,
    genres: ['Action', 'Supernatural'],
    studios: ['MAPPA'],
  },
  {
    id: 21,
    malId: 21,
    title: {
      romaji: 'ONE PIECE',
      english: 'One Piece',
      userPreferred: 'One Piece',
    },
    description:
      'Monkey D. Luffy refuses to let anyone or anything stand in the way of his quest to become the King of the Pirates in an epic odyssey across the Grand Line.',
    coverImage: {
      extraLarge: 'https://media.kitsu.app/anime/poster_images/12/large.jpg',
      large: 'https://media.kitsu.app/anime/poster_images/12/large.jpg',
      medium: 'https://media.kitsu.app/anime/poster_images/12/large.jpg',
      color: '#EAB308',
    },
    bannerImage: 'https://media.kitsu.app/anime/12/cover_image/large-3e72f400a87b5241780c5082f0582611.jpeg',
    format: 'TV',
    status: 'RELEASING',
    episodes: 1120,
    duration: 24,
    season: 'FALL',
    seasonYear: 1999,
    averageScore: 88,
    popularity: 420000,
    genres: ['Action', 'Adventure', 'Comedy', 'Fantasy'],
    studios: ['Toei Animation'],
  },
];

export const FEATURED_BILLBOARD_ANIME: AnimeItem[] = MASTER_CURATED_CATALOG.slice(0, 5);

export const FALLBACK_TRENDING = MASTER_CURATED_CATALOG;

