import axios from 'axios';

export interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

export interface AnimeSubtitleTrack {
  url: string;
  lang: string;
  label?: string;
  isDefault?: boolean;
}

export interface AnimeStreamResult {
  sources: StreamSource[];
  subtitles?: AnimeSubtitleTrack[];
  embedUrl?: string;
  hasDub: boolean;
  hasSub: boolean;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

const BASE_API = 'https://anidb.app';
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://anidb.app/',
};

function decodeScriptString(value: string): string {
  return value.replace(
    /\\u([\dA-Fa-f]{4})|\\x([\dA-Fa-f]{2})|\\([\\'"bnfrtv0])/g,
    (_, unicode, hex, escaped) => {
      if (unicode) return String.fromCharCode(parseInt(unicode, 16));
      if (hex) return String.fromCharCode(parseInt(hex, 16));
      return (
        { b: '\b', n: '\n', f: '\f', r: '\r', t: '\t', v: '\v', 0: '\0' }[escaped as string] ?? escaped
      );
    }
  );
}

function getScriptStrings(script: string): string[] {
  const strings: string[] = [];
  let index = 0;
  let previous = '';
  while (index < script.length) {
    const char = script[index];
    if (char === '/' && script[index + 1] === '/') {
      index = script.indexOf('\n', index + 2);
      if (index < 0) break;
      continue;
    }
    if (char === '/' && script[index + 1] === '*') {
      index = script.indexOf('*/', index + 2);
      if (index < 0) break;
      index += 2;
      continue;
    }
    if (char === '/' && /[=(:,[!&|?{};]/.test(previous)) {
      index++;
      let inClass = false;
      while (index < script.length) {
        if (script[index] === '\\') {
          index += 2;
          continue;
        }
        if (script[index] === '[') inClass = true;
        if (script[index] === ']') inClass = false;
        if (script[index] === '/' && !inClass) {
          index++;
          while (/[a-z]/i.test(script[index] ?? '')) index++;
          break;
        }
        index++;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      const quote = char;
      let value = '';
      index++;
      while (index < script.length && script[index] !== quote) {
        if (script[index] === '\\' && index + 1 < script.length) value += script[index++];
        value += script[index++];
      }
      strings.push(decodeScriptString(value));
      index++;
      continue;
    }
    if (char === '`') {
      index++;
      while (index < script.length && script[index] !== '`')
        index += script[index] === '\\' ? 2 : 1;
      index++;
      continue;
    }
    if (!/\s/.test(char)) previous = char;
    index++;
  }
  return [...new Set(strings)];
}

function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function decryptMegaPlaySourceWebCrypto(enc: string, script: string): Promise<string | null> {
  let encryptedBytes: Uint8Array;
  try {
    encryptedBytes = base64UrlToBytes(enc);
  } catch {
    return null;
  }
  if (!encryptedBytes.length || encryptedBytes.length % 16 !== 0) return null;

  const cryptoSubtle = globalThis.crypto?.subtle;
  if (!cryptoSubtle) return null;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const values = getScriptStrings(script).filter(
    (s) => encoder.encode(s).length > 0 && encoder.encode(s).length <= 32
  );
  const ivs = values.filter((s) => encoder.encode(s).length === 16);

  for (const keyValue of values) {
    const keyRaw = new Uint8Array(32);
    keyRaw.set(encoder.encode(keyValue));
    let cryptoKey: CryptoKey;
    try {
      cryptoKey = await cryptoSubtle.importKey('raw', keyRaw as any, { name: 'AES-CBC' }, false, ['decrypt']);
    } catch {
      continue;
    }

    for (const ivValue of ivs) {
      const ivRaw = encoder.encode(ivValue);
      try {
        const decryptedBuf = await cryptoSubtle.decrypt(
          { name: 'AES-CBC', iv: ivRaw as any },
          cryptoKey,
          encryptedBytes as any
        );
        const text = decoder.decode(decryptedBuf);
        const data = JSON.parse(text);
        const source = data?.file ?? data?.url;
        if (typeof source === 'string' && source) {
          return source;
        }
      } catch {}
    }
  }
  return null;
}

export class AnimeStreamService {
  /**
   * Resolve MegaPlay direct stream (.m3u8) with WebCrypto AES decryption
   */
  static async resolveMegaPlay(
    malId: number,
    episodeNumber: number,
    audioMode: 'sub' | 'dub' = 'sub'
  ): Promise<AnimeStreamResult | null> {
    try {
      const streamPageUrl = `https://megaplay.buzz/stream/mal/${malId}/${episodeNumber}/${audioMode}`;
      const pageRes = await axios.get(streamPageUrl, {
        headers: {
          'User-Agent': HEADERS['User-Agent'],
          Referer: 'https://megaplay.buzz/',
        },
        timeout: 6000,
      });

      const html = pageRes.data || '';
      const idMatch = html.match(/data-id="([0-9]+)"/) || html.match(/<title>File ([0-9]+)/i);
      const fileId = idMatch ? idMatch[1] : null;
      if (!fileId) return null;

      // Extract client script
      const scriptUrls = [...html.matchAll(/<script[^>]+src="([^"]+)"[^>]*>/gi)].map((m) =>
        new URL(m[1], streamPageUrl).href
      );
      const scripts = await Promise.all(
        scriptUrls.map(async (u) => {
          try {
            const r = await axios.get(u, {
              headers: { 'User-Agent': HEADERS['User-Agent'] },
              timeout: 6000,
            });
            return typeof r.data === 'string' ? r.data : '';
          } catch {
            return '';
          }
        })
      );
      const clientScript = scripts.find((s) => s && /getSources/i.test(s) && /AES-CBC/i.test(s)) || '';

      const srcRes = await axios.get(`https://megaplay.buzz/stream/getSources?id=${fileId}&id=${fileId}`, {
        headers: {
          'User-Agent': HEADERS['User-Agent'],
          Referer: streamPageUrl,
          'X-Requested-With': 'XMLHttpRequest',
        },
        timeout: 6000,
      });

      const data = srcRes.data || {};
      let directUrl: string | null = null;

      if (data.sources && Array.isArray(data.sources) && data.sources[0]?.file) {
        directUrl = data.sources[0].file;
      } else if (data.sources?.file) {
        directUrl = data.sources.file;
      } else if (data.enc && clientScript) {
        directUrl = await decryptMegaPlaySourceWebCrypto(data.enc, clientScript);
      }

      const subtitles: AnimeSubtitleTrack[] = (data.tracks || [])
        .filter((t: any) => {
          const kind = (t.kind || '').toLowerCase();
          return t.file && (!kind || kind.includes('caption') || kind.includes('sub'));
        })
        .map((t: any) => ({
          url: t.file,
          label: t.label || 'English',
          lang: (t.label || 'en').toLowerCase().includes('english') ? 'en' : 'sub',
          isDefault: !!t.default,
        }));

      if (directUrl) {
        return {
          sources: [
            { url: directUrl, quality: 'Auto', isM3U8: directUrl.includes('.m3u8') },
            { url: directUrl, quality: '1080p', isM3U8: directUrl.includes('.m3u8') },
            { url: directUrl, quality: '720p', isM3U8: directUrl.includes('.m3u8') },
          ],
          subtitles,
          embedUrl: streamPageUrl,
          hasDub: true,
          hasSub: true,
          intro: data.intro ? { start: data.intro.start, end: data.intro.end } : undefined,
          outro: data.outro ? { start: data.outro.start, end: data.outro.end } : undefined,
        };
      }
    } catch (e: any) {
      console.warn('MegaPlay resolution fallback:', e.message);
    }
    return null;
  }

  /**
   * Resolve direct master.m3u8 stream and resilient embed fallback for any anime episode
   */
  static async resolveStream(
    animeTitle: string,
    episodeNumber: number,
    malId?: number,
    audioMode: 'sub' | 'dub' = 'sub'
  ): Promise<AnimeStreamResult> {
    const cleanTitle = encodeURIComponent(animeTitle.replace(/[^a-zA-Z0-9 ]/g, ' ').trim());
    
    // Resilient universal embeds
    const fallbackEmbed = malId
      ? `https://vidsrc.cc/v2/embed/anime/mal/${malId}/${episodeNumber}`
      : `https://vidsrc.me/embed/anime?q=${cleanTitle}&ep=${episodeNumber}`;

    // 1. Prioritize MegaPlay Direct Decrypted Stream (Dango Engine)
    if (malId) {
      const megaPlayResult = await this.resolveMegaPlay(malId, episodeNumber, audioMode);
      if (megaPlayResult && megaPlayResult.sources.length > 0) {
        return megaPlayResult;
      }
    }

    try {
      // 2. Search Anime on AniDB
      const searchRes = await axios.get(`${BASE_API}/browse`, {
        params: { q: animeTitle },
        headers: HEADERS,
        timeout: 5000,
      });

      const pageHtml = searchRes.data || '';
      const allMatches = Array.from(pageHtml.matchAll(/anime\/([a-z0-9-]+-[0-9]+)"/g));
      const targetTitleLower = animeTitle.toLowerCase();
      const targetTokens = targetTitleLower.replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
      const spinOffWords = ['junior', 'high', 'chibi', 'spinoff', 'spin', 'ova', 'movie', 'recap', 'picture', 'drama'];

      let bestSlug = '';
      let bestScore = -9999;

      for (const m of (allMatches as any[])) {
        const slug = m[1];
        const slugTokens = slug.split('-').slice(0, -1);

        let score = 0;
        let hasUnwantedSpinOff = false;
        for (const word of spinOffWords) {
          if (slugTokens.includes(word) && !targetTitleLower.includes(word)) {
            hasUnwantedSpinOff = true;
            break;
          }
        }
        if (hasUnwantedSpinOff) {
          score -= 1000;
        }

        for (const tok of targetTokens) {
          if (slugTokens.includes(tok)) {
            score += 10;
          }
        }

        score -= Math.abs(slugTokens.length - targetTokens.length);

        if (score > bestScore) {
          bestScore = score;
          bestSlug = slug;
        }
      }

      if (bestSlug) {
        const animeSlug = bestSlug;
        const animeId = animeSlug.split('-').pop();

        // 3. Fetch Episodes
        const epRes = await axios.get(`${BASE_API}/api/frontend/anime/${animeId}/episodes`, {
          headers: HEADERS,
          timeout: 5000,
        });

        const episodes = epRes.data || [];
        const targetEp = episodes.find((e: any) => e.number === episodeNumber) || episodes[0];
        if (targetEp) {
          // 4. Fetch Languages & Embed
          const langRes = await axios.get(`${BASE_API}/api/frontend/episode/${targetEp.id}/languages`, {
            headers: HEADERS,
            timeout: 5000,
          });

          const languages = langRes.data?.languages || [];
          const targetLangCode = audioMode === 'dub' ? 'eng' : 'jpn';
          const langEntry = languages.find((l: any) => l.code === targetLangCode) || languages[0];

          if (langEntry && langEntry.embed_url) {
            // 5. Extract direct master m3u8
            try {
              const embedRes = await axios.get(langEntry.embed_url, { headers: HEADERS, timeout: 5000 });
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
            } catch {}

            return {
              sources: [],
              embedUrl: langEntry.embed_url,
              hasDub: languages.some((l: any) => l.code === 'eng'),
              hasSub: languages.some((l: any) => l.code === 'jpn'),
            };
          }
        }
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

