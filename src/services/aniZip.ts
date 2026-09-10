import axios from 'axios';

export interface AniZipEpisode {
  number: number;
  title: string;
  thumbnail: string;
  synopsis: string;
  airDate?: string;
  airDateUtc?: string;
  rating?: string;
}

export class AniZipService {
  private static cache: Map<string, AniZipEpisode[]> = new Map();

  /**
   * Fetch complete, accurate episode titles, TVDB screencaps, and air dates via Ani.zip
   */
  static async getEpisodes(anilistId: number, malId?: number): Promise<AniZipEpisode[]> {
    const key = `al_${anilistId}_mal_${malId || 0}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    try {
      const url = anilistId
        ? `https://api.ani.zip/mappings?anilist_id=${anilistId}`
        : `https://api.ani.zip/mappings?mal_id=${malId}`;

      const res = await axios.get(url, { timeout: 6000 });
      const data = res.data;

      if (data && data.episodes) {
        const rawEps = data.episodes;
        const episodesList: AniZipEpisode[] = [];

        for (const epKey of Object.keys(rawEps)) {
          const item = rawEps[epKey];
          if (!item) continue;

          const num = item.episodeNumber || parseInt(item.episode || epKey, 10);
          if (isNaN(num)) continue;

          // Determine cleanest display title (English > Romaji/x-jat > Japanese)
          const titleObj = item.title || {};
          let title = '';
          if (typeof titleObj === 'string') {
            title = titleObj;
          } else {
            title =
              titleObj.en ||
              titleObj['x-jat'] ||
              titleObj.ja ||
              titleObj.de ||
              titleObj.fr ||
              titleObj.es ||
              '';
          }

          const thumb = item.image || '';
          const synopsis = item.overview || item.summary || '';

          episodesList.push({
            number: num,
            title,
            thumbnail: thumb,
            synopsis,
            airDate: item.airDate || item.airdate,
            airDateUtc: item.airDateUtc,
            rating: item.rating ? String(item.rating) : undefined,
          });
        }

        // Sort by episode number ascending
        episodesList.sort((a, b) => a.number - b.number);

        if (episodesList.length > 0) {
          this.cache.set(key, episodesList);
          return episodesList;
        }
      }
    } catch (err) {
      console.warn(`AniZip fetch failed for AniList ID ${anilistId}:`, (err as any).message);
    }

    return [];
  }
}
