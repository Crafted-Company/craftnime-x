import axios from 'axios';

export interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

export interface AnimeStreamResult {
  sources: StreamSource[];
  subtitles?: { url: string; lang: string }[];
  embedUrl?: string;
  hasDub: boolean;
  hasSub: boolean;
}

const BASE_API = 'https://anidb.app';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://anidb.app/',
};

export class AnimeStreamService {
  /**
   * Resolve direct master.m3u8 stream and embed fallback for any anime episode
   */
  static async resolveStream(
    animeTitle: string,
    episodeNumber: number,
    malId?: number,
    audioMode: 'sub' | 'dub' = 'sub'
  ): Promise<AnimeStreamResult> {
    const fallbackEmbed = malId
      ? `https://vidsrc.me/embed/anime?mal=${malId}&ep=${episodeNumber}`
      : `https://vidsrc.me/embed/anime?q=${encodeURIComponent(animeTitle)}&ep=${episodeNumber}`;

    try {
      // 1. Search Anime
      const searchRes = await axios.get(`${BASE_API}/browse`, {
        params: { q: animeTitle },
        headers: HEADERS,
        timeout: 6000,
      });

      const pageHtml = searchRes.data || '';
      const match = pageHtml.match(/anime\/([a-z0-9-]+-[0-9]+)"/);
      if (!match) {
        return {
          sources: [],
          embedUrl: fallbackEmbed,
          hasDub: true,
          hasSub: true,
        };
      }

      const animeSlug = match[1];
      const animeId = animeSlug.split('-').pop();

      // 2. Fetch Episodes
      const epRes = await axios.get(`${BASE_API}/api/frontend/anime/${animeId}/episodes`, {
        headers: HEADERS,
        timeout: 6000,
      });

      const episodes = epRes.data || [];
      const targetEp = episodes.find((e: any) => e.number === episodeNumber) || episodes[0];
      if (!targetEp) {
        return {
          sources: [],
          embedUrl: fallbackEmbed,
          hasDub: true,
          hasSub: true,
        };
      }

      // 3. Fetch Languages & Embed
      const langRes = await axios.get(`${BASE_API}/api/frontend/episode/${targetEp.id}/languages`, {
        headers: HEADERS,
        timeout: 6000,
      });

      const languages = langRes.data?.languages || [];
      const targetLangCode = audioMode === 'dub' ? 'eng' : 'jpn';
      const langEntry = languages.find((l: any) => l.code === targetLangCode) || languages[0];

      if (langEntry && langEntry.embed_url) {
        // 4. Extract direct master m3u8
        const embedRes = await axios.get(langEntry.embed_url, { headers: HEADERS, timeout: 6000 });
        const embedHtml = embedRes.data || '';
        const m3u8Match = embedHtml.match(/file:\s*'([^']+\.m3u8[^']*)'/);

        if (m3u8Match) {
          return {
            sources: [
              { url: m3u8Match[1], quality: 'auto', isM3U8: true },
              { url: m3u8Match[1], quality: '1080p', isM3U8: true },
              { url: m3u8Match[1], quality: '720p', isM3U8: true },
            ],
            embedUrl: langEntry.embed_url,
            hasDub: languages.some((l: any) => l.code === 'eng'),
            hasSub: languages.some((l: any) => l.code === 'jpn'),
          };
        }

        return {
          sources: [],
          embedUrl: langEntry.embed_url,
          hasDub: languages.some((l: any) => l.code === 'eng'),
          hasSub: languages.some((l: any) => l.code === 'jpn'),
        };
      }
    } catch (e) {
      console.warn('Direct stream resolution fell back to embed:', (e as any).message);
    }

    return {
      sources: [],
      embedUrl: fallbackEmbed,
      hasDub: true,
      hasSub: true,
    };
  }
}
