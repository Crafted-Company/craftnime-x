import axios from 'axios';
import { CapacitorHttp } from '@capacitor/core';
import { AnimeStreamResult, StreamSource, AnimeSubtitleTrack } from './animeStream';

const KAA_BASE = 'https://kaa.lt';
const KAA_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

async function httpGet(url: string, headers: Record<string, string> = {}): Promise<any> {
  const isCapacitor = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
  if (isCapacitor) {
    try {
      const res = await CapacitorHttp.get({
        url,
        headers,
        connectTimeout: 10000,
        readTimeout: 10000,
      });
      return res.data;
    } catch (e) {
      console.warn('[CapacitorHttp GET Fallback]', e);
    }
  }
  const res = await axios.get(url, { headers, timeout: 8000 });
  return res.data;
}

async function httpPost(url: string, data: any, headers: Record<string, string> = {}): Promise<any> {
  const isCapacitor = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());
  if (isCapacitor) {
    try {
      const res = await CapacitorHttp.post({
        url,
        data,
        headers: { ...headers, 'Content-Type': 'application/json' },
        connectTimeout: 10000,
        readTimeout: 10000,
      });
      return res.data;
    } catch (e) {
      console.warn('[CapacitorHttp POST Fallback]', e);
    }
  }
  const res = await axios.post(url, data, {
    headers: { ...headers, 'Content-Type': 'application/json' },
    timeout: 8000,
  });
  return res.data;
}

function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/\(tv\)/gi, '')
    .replace(/season\s+(\d+)/gi, 's$1')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class KaaStreamService {
  /**
   * Search for anime on Kaa.lt
   */
  static async search(query: string): Promise<any[]> {
    try {
      const cleanQ = query.replace(/\(tv\)/gi, '').trim();
      const data = await httpPost(
        `${KAA_BASE}/api/fsearch`,
        { page: 1, query: cleanQ },
        KAA_HEADERS
      );
      return Array.isArray(data?.result) ? data.result : [];
    } catch (e: any) {
      console.warn('[KAA] search error:', e.message);
      return [];
    }
  }

  /**
   * Find best matching slug from search results
   */
  static findBestMatch(results: any[], targetTitle: string): any {
    if (!results.length) return null;
    const normTarget = normalizeTitle(targetTitle);
    const targetTokens = normTarget.split(' ').filter(Boolean);

    let bestItem = results[0];
    let bestScore = -9999;

    for (const item of results) {
      const titleEn = normalizeTitle(item.title_en || item.title || '');
      const titleRomaji = normalizeTitle(item.title || '');
      const itemSlug = item.slug || '';

      let score = 0;
      for (const tok of targetTokens) {
        if (titleEn.includes(tok) || titleRomaji.includes(tok) || itemSlug.includes(tok)) {
          score += 10;
        }
      }

      if (titleEn === normTarget || titleRomaji === normTarget) {
        score += 50;
      }

      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    return bestItem;
  }

  /**
   * Resolve master.m3u8 and subtitles from KAA for a specific episode
   */
  static async resolveStream(
    animeTitle: string,
    episodeNumber: number,
    audioMode: 'sub' | 'dub' = 'sub'
  ): Promise<AnimeStreamResult | null> {
    try {
      const searchResults = await this.search(animeTitle);
      if (!searchResults.length) return null;

      const matchedShow = this.findBestMatch(searchResults, animeTitle);
      if (!matchedShow || !matchedShow.slug) return null;

      const slug = matchedShow.slug;
      const lang = audioMode === 'dub' ? 'en-US' : 'ja-JP';

      // 1. Fetch episodes list
      const epsData = await httpGet(
        `${KAA_BASE}/api/show/${encodeURIComponent(slug)}/episodes?ep=${episodeNumber}&lang=${encodeURIComponent(lang)}`,
        KAA_HEADERS
      );

      const episodes = Array.isArray(epsData?.result) ? epsData.result : [];
      let targetEp = episodes.find((e: any) => e.episode_number === episodeNumber) || episodes[0];

      if (!targetEp && episodes.length > 0) {
        targetEp = episodes[0];
      }
      if (!targetEp) return null;

      const epSlug = targetEp.slug;
      const fullSlug = `ep-${targetEp.episode_number}-${epSlug}`;

      // 2. Fetch servers for target episode
      const serversData = await httpGet(
        `${KAA_BASE}/api/show/${encodeURIComponent(slug)}/episode/${encodeURIComponent(fullSlug)}`,
        KAA_HEADERS
      );

      const servers = Array.isArray(serversData?.servers) ? serversData.servers : [];
      if (!servers.length) return null;

      for (const server of servers) {
        const src = server.src || '';
        if (!src) continue;

        // Fetch Cat player / VidStream HTML
        try {
          const rawData = await httpGet(src, {
            'User-Agent': KAA_HEADERS['User-Agent'],
            Referer: 'https://kaa.lt/',
            Origin: 'https://kaa.lt',
          });

          const html = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);
          let manifestUrl: string | null = null;
          const subtitles: AnimeSubtitleTrack[] = [];

          // Parse Astro props
          const astroPropsMatch = html.match(/props="([^"]+)"/);
          if (astroPropsMatch) {
            try {
              const unescaped = astroPropsMatch[1].replace(/&quot;/g, '"');
              const data = JSON.parse(unescaped);
              if (data.manifest && Array.isArray(data.manifest) && data.manifest[1]) {
                manifestUrl = data.manifest[1].replace(/^\/\//, 'https://');
              }
              if (data.subtitles && Array.isArray(data.subtitles)) {
                // data.subtitles is formatted like [1, [[0, { ... }]]]
                const rawSubs = data.subtitles;
                const extractTracks = (arr: any[]) => {
                  for (const item of arr) {
                    if (Array.isArray(item)) {
                      extractTracks(item);
                    } else if (item && typeof item === 'object') {
                      const srcUrl = item.src?.[1] || item.src;
                      const langLabel = item.name?.[1] || item.name || item.language?.[1] || 'English';
                      const langCode = item.language?.[1] || item.language || 'en';
                      if (srcUrl) {
                        const cleanUrl = String(srcUrl).replace(/^https:\/\/\//, 'https://');
                        subtitles.push({
                          url: cleanUrl,
                          label: String(langLabel),
                          lang: String(langCode),
                          isDefault: String(langCode).toLowerCase().includes('en'),
                        });
                      }
                    }
                  }
                };
                extractTracks(rawSubs);
              }
            } catch {}
          }

          // Fallback regex for manifest
          if (!manifestUrl) {
            const m = html.match(/"manifest"\s*:\s*\[0\s*,\s*"(\/\/[^"]+\.m3u8[^"]*)"\]/);
            if (m) manifestUrl = m[1].replace(/^\/\//, 'https://');
          }

          if (manifestUrl) {
            const finalStreamUrl = manifestUrl;

            const sources: StreamSource[] = [
              { url: finalStreamUrl, quality: 'Auto', isM3U8: true },
              { url: finalStreamUrl, quality: '1080p', isM3U8: true },
              { url: finalStreamUrl, quality: '720p', isM3U8: true },
            ];

            return {
              sources,
              subtitles,
              embedUrl: src,
              hasDub: matchedShow.locales?.includes('en-US') ?? true,
              hasSub: true,
            };
          }
        } catch (serverErr: any) {
          console.warn('[KAA] server fetch error:', serverErr.message);
        }
      }
    } catch (e: any) {
      console.warn('[KAA] resolveStream failed:', e.message);
    }

    return null;
  }
}
