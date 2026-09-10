import axios from 'axios';
import { AnimeItem } from '../types/anime';

export interface StremioStream {
  name: string;
  title: string;
  infoHash: string;
  fileIdx?: number;
  sources?: string[];
  seeders: number;
  size: string;
  rawSize?: number;
  quality: string;
  releaseGroup: string;
  audioInfo: string;
  behaviorHints?: {
    bingeGroup?: string;
    filename?: string;
  };
  magnet: string;
  url?: string;
}

export interface StremioSubtitle {
  id: string;
  url: string;
  lang: string;
  label?: string;
}

const DEFAULT_TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.tracker.cl:1337/announce',
  'udp://tracker.openbittorrent.com:80/announce',
  'udp://opentracker.i2p.rocks:6969/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://open.stealth.si:80/announce',
  'http://nyaa.tracker.wf:7777/announce',
  'http://anidex.moe:6969/announce',
  'http://tracker.anirena.com:80/announce',
];

export class StremioAddonService {
  private static kitsuIdCache = new Map<number, number>();
  private static imdbIdCache = new Map<number, string>();

  /**
   * Resolve Kitsu ID and IMDb ID for an anime via Ani.zip, Cinemeta, and Kitsu search
   */
  static async resolveAnimeIds(anime: AnimeItem): Promise<{ kitsuId?: number; imdbId?: string; malId?: number }> {
    const anilistId = anime.id;
    if (this.kitsuIdCache.has(anilistId) && this.imdbIdCache.has(anilistId)) {
      return {
        kitsuId: this.kitsuIdCache.get(anilistId),
        imdbId: this.imdbIdCache.get(anilistId),
        malId: anime.malId,
      };
    }

    let kitsuId = this.kitsuIdCache.get(anilistId);
    let imdbId = this.imdbIdCache.get(anilistId);

    // 1. AniZip mapping
    try {
      const url = anilistId
        ? `https://api.ani.zip/mappings?anilist_id=${anilistId}`
        : `https://api.ani.zip/mappings?mal_id=${anime.malId}`;

      const res = await axios.get(url, { timeout: 4000 });
      const mappings = res.data?.mappings;

      if (mappings) {
        if (mappings.kitsu_id && !kitsuId) {
          kitsuId = Number(mappings.kitsu_id);
          this.kitsuIdCache.set(anilistId, kitsuId);
        }
        if (mappings.imdb_id && !imdbId) {
          imdbId = String(mappings.imdb_id);
          this.imdbIdCache.set(anilistId, imdbId);
        }
      }
    } catch (err) {}

    const titleStr = anime.title?.english || anime.title?.romaji || '';
    const baseTitle = titleStr
      .replace(/Season\s*\d+/gi, '')
      .replace(/\d+(?:st|nd|rd|th)\s*Season/gi, '')
      .replace(/S\d+/gi, '')
      .replace(/[:!?\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 2. Cinemeta fallback for IMDb ID
    if (!imdbId && baseTitle) {
      try {
        const cmRes = await axios.get(
          `https://v3-cinemeta.strem.io/catalog/series/top/search=${encodeURIComponent(baseTitle)}.json`,
          { timeout: 3500 }
        );
        const metas = cmRes.data?.metas;
        if (Array.isArray(metas) && metas[0]?.id) {
          imdbId = String(metas[0].id);
          this.imdbIdCache.set(anilistId, imdbId);
        }
      } catch (e) {}
    }

    // 3. Kitsu API fallback for exact Season Kitsu ID
    if (!kitsuId && titleStr) {
      try {
        const kRes = await axios.get(
          `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(titleStr)}`,
          { timeout: 3500 }
        );
        if (kRes.data?.data?.[0]?.id) {
          kitsuId = parseInt(kRes.data.data[0].id, 10);
          this.kitsuIdCache.set(anilistId, kitsuId);
        }
      } catch (e) {}
    }

    return {
      kitsuId,
      imdbId,
      malId: anime.malId,
    };
  }

  /**
   * Fetch all Stremio Streams from Torrentio & Stremio Addons
   */
  static async getStreams(
    anime: AnimeItem,
    episodeNum: number
  ): Promise<StremioStream[]> {
    const { kitsuId, imdbId } = await this.resolveAnimeIds(anime);
    const title = anime.title?.english || anime.title?.romaji || '';
    const seasonMatch = title.match(/Season\s*(\d+)|(\d+)(?:st|nd|rd|th)\s*Season|S(\d+)/i);
    const seasonNum = seasonMatch ? parseInt(seasonMatch[1] || seasonMatch[2] || seasonMatch[3], 10) : 1;

    const streamEndpoints: string[] = [];

    // 1. Torrentio with Kitsu ID
    if (kitsuId) {
      streamEndpoints.push(`https://torrentio.strem.fun/stream/series/kitsu:${kitsuId}:${episodeNum}.json`);
      streamEndpoints.push(`https://torrentio.strem.fun/stream/anime/kitsu:${kitsuId}:${episodeNum}.json`);
    }

    // 2. Torrentio with IMDb ID
    if (imdbId) {
      streamEndpoints.push(`https://torrentio.strem.fun/stream/series/${imdbId}:${seasonNum}:${episodeNum}.json`);
    }

    // 3. Anime Kitsu Addon
    if (kitsuId) {
      streamEndpoints.push(`https://anime-kitsu.strem.fun/stream/series/kitsu:${kitsuId}:${episodeNum}.json`);
    }

    const streamMap = new Map<string, StremioStream>();

    // Parallel fetch from all Stremio Addon endpoints
    const fetchPromises = streamEndpoints.map(async (url) => {
      try {
        const res = await axios.get(url, {
          timeout: 4500,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
        });
        const streams = res.data?.streams;
        if (Array.isArray(streams)) {
          for (const s of streams) {
            const parsed = this.parseStremioStream(s);
            if (
              parsed &&
              this.isStrictTitleMatch(parsed.title, title, seasonNum, episodeNum) &&
              !streamMap.has(parsed.infoHash)
            ) {
              streamMap.set(parsed.infoHash, parsed);
            }
          }
        }
      } catch (e) {}
    });

    await Promise.all(fetchPromises);

    // Fallback: If 0 addon streams found, query real-time TokyoTosho/Nyaa mirror
    if (streamMap.size === 0) {
      try {
        const toshoStreams = await this.fallbackSearchAnimeTosho(title, episodeNum, seasonNum);
        for (const s of toshoStreams) {
          if (!streamMap.has(s.infoHash)) {
            streamMap.set(s.infoHash, s);
          }
        }
      } catch (e) {}
    }

    const results = Array.from(streamMap.values());

    // Sort Streams: Highest Seeders first (200+, 100+, etc.)
    results.sort((a, b) => (b.seeders || 0) - (a.seeders || 0));

    return results;
  }

  /**
   * Parse a raw Stremio stream object into normalized StremioStream
   */
  private static parseStremioStream(raw: any): StremioStream | null {
    if (!raw) return null;
    const infoHash = (raw.infoHash || '').toLowerCase();
    if (!infoHash && !raw.url) return null;

    const rawTitle = raw.title || raw.name || '';
    const rawName = raw.name || '';

    // Extract seeders count: e.g. "👤 287" or "287 seeders"
    let seeders = 10;
    const seedersMatch = rawTitle.match(/👤\s*(\d+)/) || rawTitle.match(/(\d+)\s*seeders/i) || rawName.match(/👤\s*(\d+)/);
    if (seedersMatch) {
      seeders = parseInt(seedersMatch[1], 10);
    }

    // Extract file size: e.g. "💾 1.4 GB" or "💾 279.22 MB"
    let size = '1.4 GB';
    const sizeMatch = rawTitle.match(/💾\s*([\d\.]+\s*[GMK]B)/i);
    if (sizeMatch) {
      size = sizeMatch[1];
    }

    // Extract quality: 4K / 1080p / 720p / 480p
    let quality = '1080p';
    if (rawName.includes('4K') || rawTitle.includes('4K') || rawTitle.includes('2160p')) quality = '4K';
    else if (rawName.includes('720p') || rawTitle.includes('720p')) quality = '720p';
    else if (rawName.includes('480p') || rawTitle.includes('480p')) quality = '480p';

    // Extract release group
    let releaseGroup = 'Torrentio';
    const groupMatch = rawTitle.match(/\[([a-zA-Z0-9_\-]+)\]/);
    if (groupMatch) {
      releaseGroup = groupMatch[1];
    }

    // Extract audio info
    let audioInfo = 'Japanese (Multi-Subs)';
    if (rawTitle.toLowerCase().includes('dual') || rawTitle.toLowerCase().includes('dual-audio') || rawTitle.toLowerCase().includes('dual audio')) {
      audioInfo = 'Dual Audio (ENG/JAP)';
    } else if (rawTitle.toLowerCase().includes('english dub') || rawTitle.toLowerCase().includes('dubbed') || rawTitle.toLowerCase().includes('dub')) {
      audioInfo = 'English Dub';
    }

    // Construct high-speed magnet URI with announce trackers
    const trackers = Array.isArray(raw.sources)
      ? (raw.sources as string[]).filter((s: string) => s.startsWith('tracker:')).map((s: string) => s.replace('tracker:', ''))
      : DEFAULT_TRACKERS;

    const allTrackers = Array.from(new Set([...trackers, ...DEFAULT_TRACKERS]));
    const trackerParams = allTrackers.map((t) => `&tr=${encodeURIComponent(t)}`).join('');
    const magnet = infoHash
      ? `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(raw.behaviorHints?.filename || releaseGroup)}${trackerParams}`
      : raw.url || '';

    // Clean display title
    const cleanTitle = (raw.behaviorHints?.filename || rawTitle.split('\n')[0] || `Stream ${quality}`).trim();

    return {
      name: rawName || `Torrentio ${quality}`,
      title: cleanTitle,
      infoHash,
      fileIdx: typeof raw.fileIdx === 'number' ? raw.fileIdx : undefined,
      sources: allTrackers,
      seeders,
      size,
      quality,
      releaseGroup,
      audioInfo,
      behaviorHints: raw.behaviorHints,
      magnet,
      url: raw.url,
    };
  }

  /**
   * Filter out spin-offs, movies, specials, and wrong seasons not part of the target anime
   */
  private static isStrictTitleMatch(torrentTitle: string, animeTitle: string, seasonNum: number, episodeNum: number): boolean {
    const tLower = torrentTitle.toLowerCase();
    const aLower = animeTitle.toLowerCase();

    // 1. Negative spin-off / OVA blacklist (unless original anime specifically includes it)
    const spinOffTerms = [
      'junior high',
      'chibi',
      'spinoff',
      'spin-off',
      'ova',
      'oad',
      'the movie',
      'movie',
      'recap',
      'special',
      'specials',
      'picture drama',
      'no regrets',
      'lost girls',
      'rozen maiden',
    ];

    for (const term of spinOffTerms) {
      if (tLower.includes(term) && !aLower.includes(term)) {
        return false;
      }
    }

    // 2. Strict Season check
    const otherSeasons = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((s) => s !== seasonNum);
    for (const s of otherSeasons) {
      const sPad = s < 10 ? `0${s}` : `${s}`;
      if (
        (tLower.includes(`season ${s}`) ||
          tLower.includes(`season ${sPad}`) ||
          tLower.includes(`s${sPad}e`) ||
          tLower.includes(`s${s}e`) ||
          tLower.includes(`s${sPad} `) ||
          tLower.includes(` ${s}nd season`) ||
          tLower.includes(` ${s}rd season`) ||
          tLower.includes(` ${s}th season`)) &&
        !aLower.includes(`season ${s}`)
      ) {
        return false;
      }
    }

    // 3. Target episode matching
    const epNumStr = `${episodeNum}`;
    const epPadStr = episodeNum < 10 ? `0${episodeNum}` : `${episodeNum}`;
    const epPatterns = [
      ` - ${epPadStr}`,
      ` - ${epNumStr}`,
      ` e${epPadStr}`,
      ` ep${epPadStr}`,
      ` ep ${epPadStr}`,
      `_${epPadStr}_`,
      `[${epPadStr}]`,
      ` ${epPadStr} `,
      `e${epPadStr}`,
      ` ${epPadStr}.`,
      `s0${seasonNum}e${epPadStr}`,
      `s${seasonNum}e${epPadStr}`,
    ];

    return epPatterns.some((p) => tLower.includes(p));
  }

  /**
   * Fallback real-time search via AnimeTosho JSON API
   */
  private static async fallbackSearchAnimeTosho(
    animeTitle: string,
    episodeNum: number,
    seasonNum: number
  ): Promise<StremioStream[]> {
    const epPad = episodeNum < 10 ? `0${episodeNum}` : `${episodeNum}`;
    const seasonPad = seasonNum < 10 ? `0${seasonNum}` : `${seasonNum}`;
    const baseTitle = animeTitle.replace(/Season\s*\d+/gi, '').replace(/S\d+/gi, '').trim();

    const queries = [
      `${baseTitle} S${seasonPad}E${epPad}`,
      `${baseTitle} ${epPad}`,
      `SubsPlease ${baseTitle} ${epPad}`,
      `Erai-raws ${baseTitle} ${epPad}`,
    ];

    const results: StremioStream[] = [];
    const seenHashes = new Set<string>();

    for (const q of queries) {
      try {
        const url = `https://feed.animetosho.org/json?q=${encodeURIComponent(q)}`;
        const res = await axios.get(url, { timeout: 4000 });
        const data = res.data;
        if (!Array.isArray(data)) continue;

        for (const item of data) {
          if (!item.info_hash && !item.magnet_uri) continue;
          const infoHash = (item.info_hash || '').toLowerCase();
          if (seenHashes.has(infoHash)) continue;

          const title = item.title || item.torrent_name || '';

          // Apply strict match
          if (!this.isStrictTitleMatch(title, animeTitle, seasonNum, episodeNum)) {
            continue;
          }

          seenHashes.add(infoHash);
          const seeders = typeof item.seeders === 'number' ? item.seeders : 5;
          const rawSize = item.size || 0;
          const size = rawSize ? `${(rawSize / (1024 * 1024 * 1024)).toFixed(2)} GB` : '1.4 GB';

          let quality = '1080p';
          if (title.includes('4K') || title.includes('2160p')) quality = '4K';
          else if (title.includes('720p')) quality = '720p';

          let releaseGroup = 'Nyaa';
          const groupMatch = title.match(/\[([a-zA-Z0-9_\-]+)\]/);
          if (groupMatch) releaseGroup = groupMatch[1];

          let audioInfo = 'Japanese (Multi-Subs)';
          if (title.toLowerCase().includes('dual')) audioInfo = 'Dual Audio (ENG/JAP)';
          else if (title.toLowerCase().includes('dub')) audioInfo = 'English Dub';

          const trackerParams = DEFAULT_TRACKERS.map((t) => `&tr=${encodeURIComponent(t)}`).join('');
          const magnet = item.magnet_uri || `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}${trackerParams}`;

          results.push({
            name: `Nyaa\n${quality}`,
            title,
            infoHash,
            seeders,
            size,
            quality,
            releaseGroup,
            audioInfo,
            magnet,
          });
        }
      } catch (e) {}
    }

    return results;
  }

  /**
   * Find single best stream (auto-play fallback)
   */
  static async findEpisodeStream(
    anime: AnimeItem,
    episodeNum: number,
    preferDub = false
  ): Promise<StremioStream | null> {
    const streams = await this.getStreams(anime, episodeNum);
    if (streams.length === 0) return null;

    if (preferDub) {
      const dubStream = streams.find((s) => s.audioInfo.includes('Dual') || s.audioInfo.includes('Dub'));
      if (dubStream) return dubStream;
    }

    const scoreStream = (s: StremioStream): number => {
      let score = 0;
      const full = `${s.title || ''} ${s.name || ''} ${s.releaseGroup || ''}`.toLowerCase();

      // 1. Heavy penalty for Mega-Batches / multi-season collections
      const isMegaBatch =
        full.includes('s1-s7') ||
        full.includes('s01-s07') ||
        full.includes('s1-s6') ||
        full.includes('s01 s02') ||
        full.includes('all seasons') ||
        full.includes('complete series') ||
        full.includes('season 01-') ||
        full.includes('batch');

      if (isMegaBatch) {
        score -= 10000;
      } else {
        score += 5000;
      }

      // 2. Heavy penalty for AV1 (causes stuttering on software decoders)
      if (full.includes('av1')) {
        score -= 5000;
      }

      // 3. Boost single episode WEB-DL / BD H.264
      if (
        full.includes('x264') ||
        full.includes('h264') ||
        full.includes('h.264') ||
        full.includes('avc') ||
        full.includes('web-dl') ||
        full.includes('webrip')
      ) {
        score += 3000;
      }

      // 4. Boost trusted high-speed release groups
      if (
        full.includes('subsplease') ||
        full.includes('erai-raws') ||
        full.includes('judas') ||
        full.includes('toonshub') ||
        full.includes('varyg') ||
        full.includes('yameii')
      ) {
        score += 2000;
      }

      // 5. Direct seeders multiplier
      const seeders = typeof s.seeders === 'number' ? s.seeders : 0;
      score += seeders * 20;

      return score;
    };

    const sortedByScore = [...streams].sort((a, b) => scoreStream(b) - scoreStream(a));
    return sortedByScore[0] || streams[0];
  }
}
