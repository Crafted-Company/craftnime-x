import axios from 'axios';
import { AnimeItem } from '../types/anime';
import { StremioAddonService } from './stremioAddon';

export interface SubtitleTrackInfo {
  id: string;
  label: string;
  lang: string;
  isDefault?: boolean;
  url?: string;
}

export interface SubtitleCue {
  id?: string;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

const LANG_MAP: Record<string, string> = {
  eng: 'English',
  en: 'English',
  spa: 'Spanish',
  es: 'Spanish',
  por: 'Portuguese',
  pt: 'Portuguese',
  pob: 'Portuguese (BR)',
  fre: 'French',
  fr: 'French',
  ger: 'German',
  de: 'German',
  ita: 'Italian',
  it: 'Italian',
  ind: 'Indonesian',
  id: 'Indonesian',
  vie: 'Vietnamese',
  vi: 'Vietnamese',
  zho: 'Chinese',
  zh: 'Chinese',
  zht: 'Chinese (Trad)',
  ara: 'Arabic',
  ar: 'Arabic',
  rus: 'Russian',
  ru: 'Russian',
  jpn: 'Japanese',
  ja: 'Japanese',
  pol: 'Polish',
  hun: 'Hungarian',
  ben: 'Bengali',
};

function getLanguageDisplayName(code: string): string {
  const c = (code || '').toLowerCase().trim();
  return LANG_MAP[c] || c.toUpperCase();
}

export class SubtitleService {
  /**
   * Parse raw WebVTT, SRT, or ASS text into an array of SubtitleCue
   */
  static parseSubtitleContent(content: string): SubtitleCue[] {
    if (!content) return [];

    const isAss = content.includes('[Events]') || content.includes('Dialogue:');
    if (isAss) {
      return this.parseASS(content);
    }

    return this.parseVTT(content);
  }

  /**
   * Parse ASS / SSA format subtitle lines
   */
  static parseASS(content: string): SubtitleCue[] {
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const cues: SubtitleCue[] = [];

    // Dialogue: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
    const dialogRegex = /^Dialogue:\s*[^,]+,([^,]+),([^,]+),[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,[^,]*,(.*)$/i;

    const parseTime = (str: string): number => {
      const parts = str.trim().split(':');
      if (parts.length === 3) {
        const h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        const s = parseFloat(parts[2]) || 0;
        return h * 3600 + m * 60 + s;
      }
      return 0;
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const match = line.match(dialogRegex);
      if (match) {
        const start = parseTime(match[1]);
        const end = parseTime(match[2]);
        const rawText = match[3] || '';

        // Strip ASS style overrides {\...}, \N for newline, \h for space
        const cleaned = rawText
          .replace(/\{[^}]+\}/g, '')
          .replace(/\\N/g, '\n')
          .replace(/\\n/g, '\n')
          .replace(/\\h/g, ' ')
          .replace(/<[^>]+>/g, '')
          .trim();

        if (cleaned && end > start) {
          cues.push({ start, end, text: cleaned });
        }
      }
    }

    cues.sort((a, b) => a.start - b.start);
    return cues;
  }

  /**
   * Parse raw WebVTT or SRT text into an array of SubtitleCue
   */
  static parseVTT(content: string): SubtitleCue[] {
    if (!content) return [];

    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const cues: SubtitleCue[] = [];
    let i = 0;

    const timeRegex = /(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})/;

    while (i < lines.length) {
      const line = lines[i].trim();
      const match = line.match(timeRegex);

      if (match) {
        const startH = parseInt(match[1] || '0', 10);
        const startM = parseInt(match[2], 10);
        const startS = parseInt(match[3], 10);
        const startMs = parseInt(match[4], 10);
        const start = startH * 3600 + startM * 60 + startS + startMs / 1000;

        const endH = parseInt(match[5] || '0', 10);
        const endM = parseInt(match[6], 10);
        const endS = parseInt(match[7], 10);
        const endMs = parseInt(match[8], 10);
        const end = endH * 3600 + endM * 60 + endS + endMs / 1000;

        i++;
        const textLines: string[] = [];
        while (i < lines.length && lines[i].trim() !== '') {
          const rawText = lines[i];
          // Skip pure digit index lines if any
          if (/^\d+$/.test(rawText.trim())) {
            i++;
            continue;
          }
          // Clean out ASS/VTT formatting tags e.g. <font color="...">, {\an8}, etc.
          const cleaned = rawText
            .replace(/<[^>]+>/g, '')
            .replace(/\{[^}]+\}/g, '')
            .trim();
          if (cleaned) {
            textLines.push(cleaned);
          }
          i++;
        }

        if (textLines.length > 0 && end > start) {
          cues.push({
            start,
            end,
            text: textLines.join('\n'),
          });
        }
      }
      i++;
    }

    cues.sort((a, b) => a.start - b.start);
    return cues;
  }

  /**
   * Fetch available subtitle tracks from Stremio Subtitle Addons & Local Torrent Streamer
   */
  static async fetchAvailableTracks(
    anime?: AnimeItem | null,
    episodeNum?: number
  ): Promise<SubtitleTrackInfo[]> {
    const tracks: SubtitleTrackInfo[] = [];
    const seenUrls = new Set<string>();

    // 1. Cloud Subtitles from Stremio Anime Kitsu & OpenSubtitles addons
    if (anime && typeof episodeNum === 'number') {
      try {
        const { kitsuId, imdbId } = await StremioAddonService.resolveAnimeIds(anime);
        const endpoints: string[] = [];

        if (imdbId) {
          const imdbFormatted = imdbId.startsWith('tt') ? imdbId : `tt${imdbId}`;
          const seasonMatch = (anime.title?.english || anime.title?.romaji || '').match(/Season\s*(\d+)|(\d+)(?:st|nd|rd|th)\s*Season|S(\d+)/i);
          const seasonNum = seasonMatch ? parseInt(seasonMatch[1] || seasonMatch[2] || seasonMatch[3], 10) : 1;
          endpoints.push(`https://opensubtitles-v3.strem.io/subtitles/series/${imdbFormatted}:${seasonNum}:${episodeNum}.json`);
          if (seasonNum !== 1) {
            endpoints.push(`https://opensubtitles-v3.strem.io/subtitles/series/${imdbFormatted}:1:${episodeNum}.json`);
          }
          endpoints.push(`https://subtitles.strem.io/subtitles/series/${imdbFormatted}:${seasonNum}:${episodeNum}.json`);
        }

        if (kitsuId) {
          endpoints.push(`https://opensubtitles-v3.strem.io/subtitles/series/kitsu:${kitsuId}:${episodeNum}.json`);
          endpoints.push(`https://subtitles.strem.io/subtitles/series/kitsu:${kitsuId}:${episodeNum}.json`);
        }

        for (const epUrl of endpoints) {
          try {
            const res = await axios.get(epUrl, { timeout: 4500 });
            const subs = res.data?.subtitles;
            if (Array.isArray(subs)) {
              subs.forEach((s: any) => {
                if (!s.url || seenUrls.has(s.url)) return;
                seenUrls.add(s.url);

                const langCode = (s.lang || 'eng').toLowerCase();
                const langName = getLanguageDisplayName(langCode);
                const tag = s.releaseGroup || s.movieReleaseName || s.subtitleFileName || '';
                const tagSuffix = tag ? ` (${tag})` : '';

                tracks.push({
                  id: s.url,
                  label: `${langName}${tagSuffix}`,
                  lang: langCode,
                  url: s.url,
                  isDefault: langCode === 'eng' || langCode === 'en',
                });
              });
            }
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Subtitle cloud fetch error:', err);
      }
    }

    // 2. Local Embedded Tracks from Torrent Server
    try {
      const localRes = await axios.get(`http://127.0.0.1:8888/subtitles/list?t=${Date.now()}`, {
        timeout: 2500,
      });
      if (Array.isArray(localRes.data) && localRes.data.length > 0) {
        localRes.data.forEach((t: any) => {
          const trackId = `local-${t.id}`;
          if (!seenUrls.has(trackId)) {
            seenUrls.add(trackId);
            tracks.push({
              id: trackId,
              label: `${t.label || 'English'} (Embedded)`,
              lang: t.lang || 'en',
              url: `http://127.0.0.1:8888/subtitles/text?track=${t.id}`,
              isDefault: tracks.length === 0 && t.isDefault,
            });
          }
        });
      }
    } catch (e) {}

    // Sort tracks: English first, then by language name
    tracks.sort((a, b) => {
      const aIsEng = a.lang === 'eng' || a.lang === 'en';
      const bIsEng = b.lang === 'eng' || b.lang === 'en';
      if (aIsEng && !bIsEng) return -1;
      if (!aIsEng && bIsEng) return 1;
      return a.label.localeCompare(b.label);
    });

    if (tracks.length > 0) {
      // Mark the very first English track as default
      const engTrack = tracks.find((t) => t.lang === 'eng' || t.lang === 'en');
      if (engTrack) {
        tracks.forEach((t) => (t.isDefault = false));
        engTrack.isDefault = true;
      }
      return tracks;
    }

    // Fallback default tracks
    return [
      { id: 'default-en', label: 'English (Default)', lang: 'en', isDefault: true },
    ];
  }

  /**
   * Fetch and parse subtitle cues by track info or URL
   */
  static async fetchTrackCues(track: SubtitleTrackInfo | string): Promise<SubtitleCue[]> {
    const url = typeof track === 'string' ? track : track.url;
    if (!url) return [];

    try {
      const res = await axios.get(url, {
        timeout: 7000,
        responseType: 'text',
      });
      if (typeof res.data === 'string') {
        return this.parseSubtitleContent(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch subtitle text from URL:', url, err);
    }
    return [];
  }
}
