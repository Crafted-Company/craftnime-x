import axios from 'axios';

export interface TorrentItem {
  title: string;
  link: string;
  magnet: string;
  seeders: number;
  leechers: number;
  downloads: number;
  size: string;
  rawSize: number;
  pubDate: string;
  quality: string;
  releaseGroup: string;
  infoHash: string;
  audioInfo: string;
}

const TRUSTED_GROUPS = [
  'SubsPlease',
  'Erai-raws',
  'Judgement',
  'ASW',
  'Golumpa',
  'EMBER',
  'HorribleSubs',
  'NC-Raws',
  'ToonsHub',
  'Yameii',
  'VARYG',
  'Judas',
  'NanDesuKa',
  'GJM',
];

export class TorrentStreamService {
  /**
   * Get all available streams for an episode, sorted by seeders descending (Stremio / Torrentio model)
   */
  static async getAvailableStreams(
    animeTitle: string,
    episodeNum: number,
    romajiTitle = '',
    absoluteEpisodeNum?: number
  ): Promise<TorrentItem[]> {
    const titles = Array.from(
      new Set([animeTitle, romajiTitle].filter(Boolean).map((t) => t.trim()))
    );

    const epPad = episodeNum < 10 ? `0${episodeNum}` : `${episodeNum}`;
    const allQueries: string[] = [];

    for (const title of titles) {
      const seasonMatch = title.match(/Season\s*(\d+)|(\d+)(?:st|nd|rd|th)\s*Season|S(\d+)/i);
      const seasonNum = seasonMatch ? (seasonMatch[1] || seasonMatch[2] || seasonMatch[3]) : null;
      const seasonPad = seasonNum ? (parseInt(seasonNum, 10) < 10 ? `0${parseInt(seasonNum, 10)}` : `${seasonNum}`) : null;

      const baseTitle = title
        .replace(/Season\s*\d+/gi, '')
        .replace(/\d+(?:st|nd|rd|th)\s*Season/gi, '')
        .replace(/S\d+/gi, '')
        .replace(/[:!?\-]/g, ' ')
        .replace(/\(TV\)/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (seasonNum) {
        allQueries.push(`${baseTitle} S${seasonPad}E${epPad}`);
        allQueries.push(`${baseTitle} S${seasonNum}E${epPad}`);
        allQueries.push(`${baseTitle} S${seasonNum} ${epPad}`);
        allQueries.push(`SubsPlease ${baseTitle} S${seasonNum} ${epPad}`);
        allQueries.push(`Erai-raws ${baseTitle} S${seasonNum} ${epPad}`);
        allQueries.push(`${title} ${epPad}`);
      }

      allQueries.push(`${baseTitle} S01E${epPad}`);
      allQueries.push(`SubsPlease ${baseTitle} ${epPad}`);
      allQueries.push(`Erai-raws ${baseTitle} ${epPad}`);
      allQueries.push(`${baseTitle} ${epPad}`);
      allQueries.push(`${baseTitle} ${episodeNum}`);

      if (absoluteEpisodeNum && absoluteEpisodeNum !== episodeNum) {
        const absPad = absoluteEpisodeNum < 10 ? `0${absoluteEpisodeNum}` : `${absoluteEpisodeNum}`;
        allQueries.push(`${baseTitle} ${absPad}`);
        allQueries.push(`SubsPlease ${baseTitle} ${absPad}`);
        allQueries.push(`Erai-raws ${baseTitle} ${absPad}`);
      }
    }

    const uniqueMap = new Map<string, TorrentItem>();

    // Parallel batch fetch
    for (let i = 0; i < allQueries.length; i += 4) {
      const batch = allQueries.slice(i, i + 4);
      try {
        const batchResults = await Promise.all(
          batch.map((q) => this.searchAnimeTosho(q).catch(() => []))
        );

        for (const items of batchResults) {
          for (const item of items) {
            if (this.matchesEpisode(item.title, episodeNum, absoluteEpisodeNum, animeTitle)) {
              const key = item.infoHash || item.title;
              if (!uniqueMap.has(key)) {
                uniqueMap.set(key, item);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Batch search error:', err);
      }
    }

    const results = Array.from(uniqueMap.values());

    // Sort by: Most Seeders to Least Seeders (Torrentio Standard)
    results.sort((a, b) => {
      const aSeeds = typeof a.seeders === 'number' ? a.seeders : parseInt(String(a.seeders || '0'), 10) || 0;
      const bSeeds = typeof b.seeders === 'number' ? b.seeders : parseInt(String(b.seeders || '0'), 10) || 0;
      return bSeeds - aSeeds;
    });

    return results;
  }

  /**
   * Search AnimeTosho (Nyaa / TokyoTosho mirror)
   */
  static async searchAnimeTosho(searchQuery: string): Promise<TorrentItem[]> {
    const encoded = encodeURIComponent(searchQuery);
    const url = `https://feed.animetosho.org/json?q=${encoded}`;

    const res = await axios.get(url, {
      timeout: 4500,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    const data = res.data;
    if (!Array.isArray(data)) return [];

    const results: TorrentItem[] = [];
    for (const item of data) {
      const title = item.title || item.torrent_name || '';
      const magnet = item.magnet_uri || '';
      const infoHash = item.info_hash || '';
      const seeders = typeof item.seeders === 'number' ? item.seeders : 5;
      const leechers = item.leechers || 0;
      const downloads = item.downloads || 0;
      const rawSize = item.size || 0;
      const size = rawSize ? `${(rawSize / (1024 * 1024 * 1024)).toFixed(2)} GB` : '1.4 GB';
      const pubDate = item.timestamp ? new Date(item.timestamp * 1000).toISOString() : '';

      if (!magnet && !infoHash) continue;

      let quality = '1080p';
      if (title.includes('2160p') || title.includes('4K')) quality = '4K';
      else if (title.includes('720p')) quality = '720p';
      else if (title.includes('480p')) quality = '480p';

      let releaseGroup = 'Torrentio';
      for (const g of TRUSTED_GROUPS) {
        if (title.toLowerCase().includes(g.toLowerCase())) {
          releaseGroup = g;
          break;
        }
      }

      let audioInfo = 'Japanese (Multi-Subs)';
      if (title.toLowerCase().includes('dual') || title.toLowerCase().includes('dual-audio')) {
        audioInfo = 'Dual Audio (ENG/JAP)';
      } else if (title.toLowerCase().includes('english dub') || title.toLowerCase().includes('dub')) {
        audioInfo = 'English Dub';
      }

      results.push({
        title,
        link: item.link || '',
        magnet: magnet || `magnet:?xt=urn:btih:${infoHash}`,
        seeders,
        leechers,
        downloads,
        size,
        rawSize,
        pubDate,
        quality,
        releaseGroup,
        infoHash,
        audioInfo,
      });
    }

    return results;
  }

  /**
   * Check if a torrent title matches the target episode number strictly
   */
  private static matchesEpisode(
    title: string,
    episodeNum: number,
    absoluteEpisodeNum?: number,
    animeTitle = ''
  ): boolean {
    const lower = title.toLowerCase();
    const aLower = animeTitle.toLowerCase();
    const epNumStr = `${episodeNum}`;
    const epPadStr = episodeNum < 10 ? `0${episodeNum}` : `${episodeNum}`;

    if (lower.includes('01-') || lower.includes('01~') || lower.includes('batch')) return false;

    // Reject spin-offs and OVAs unless target anime title explicitly has them
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
    ];

    for (const term of spinOffTerms) {
      if (lower.includes(term) && !aLower.includes(term)) {
        return false;
      }
    }

    // Direct episode patterns
    const patterns = [
      ` - ${epPadStr}`,
      ` - ${epNumStr}`,
      ` e${epPadStr}`,
      ` ep${epPadStr}`,
      ` ep ${epPadStr}`,
      ` episode ${epNumStr}`,
      ` episode ${epPadStr}`,
      ` ${epPadStr} [`,
      ` ${epPadStr}v`,
      `_${epPadStr}_`,
      `[${epPadStr}]`,
      `e${epPadStr}`,
      `s01e${epPadStr}`,
      `s02e${epPadStr}`,
      `s03e${epPadStr}`,
      `s04e${epPadStr}`,
      `s05e${epPadStr}`,
      `s06e${epPadStr}`,
      `s07e${epPadStr}`,
      `s08e${epPadStr}`,
      `s09e${epPadStr}`,
      `s10e${epPadStr}`,
    ];

    if (absoluteEpisodeNum && absoluteEpisodeNum !== episodeNum) {
      const absPad = absoluteEpisodeNum < 10 ? `0${absoluteEpisodeNum}` : `${absoluteEpisodeNum}`;
      patterns.push(` - ${absPad}`, ` - ${absoluteEpisodeNum}`, ` [ep: ${absoluteEpisodeNum}]`, `(${absoluteEpisodeNum})`, `_${absPad}_`);
    }

    return patterns.some((p) => lower.includes(p));
  }

  /**
   * Find single best torrent (auto-play fallback)
   */
  static async findEpisodeTorrent(
    animeTitle: string,
    episodeNum: number,
    preferDub = false,
    romajiTitle = '',
    absoluteEpisodeNum?: number
  ): Promise<TorrentItem | null> {
    const streams = await this.getAvailableStreams(animeTitle, episodeNum, romajiTitle, absoluteEpisodeNum);
    if (streams.length === 0) return null;

    if (preferDub) {
      const dubStream = streams.find((s) => s.audioInfo.includes('Dual') || s.audioInfo.includes('Dub'));
      if (dubStream) return dubStream;
    }

    return streams[0];
  }
}
