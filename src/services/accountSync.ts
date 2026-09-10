import axios from 'axios';
import { AnimeItem } from '../types/anime';

export interface MALAccountData {
  username: string;
  avatarUrl: string;
  episodesWatched: number;
  totalAnime: number;
  meanScore: number;
  provider: 'mal';
  isLoggedIn: boolean;
  accessToken?: string;
  lists: {
    all: AnimeItem[];
    watching: AnimeItem[];
    completed: AnimeItem[];
    onHold: AnimeItem[];
    dropped: AnimeItem[];
    planToWatch: AnimeItem[];
  };
}

export class AccountSyncService {
  /**
   * Fetch Live MyAnimeList (MAL) Profile and All Collections with Jikan / Direct Fallback
   */
  static async fetchMALUser(username: string): Promise<MALAccountData | null> {
    const cleanUser = username.trim();
    if (!cleanUser) return null;

    let allRawEntries: any[] = [];

    // Method 0: Android Native Java Bridge (Direct OS HTTP request, zero CORS)
    if (typeof window !== 'undefined' && (window as any).NativeStreamBridge?.fetchMalJson) {
      try {
        const nativeData: any[] = await new Promise((resolve) => {
          const timeout = setTimeout(() => resolve([]), 8000);
          (window as any).onNativeMalLoaded = (rawJson: string | null) => {
            clearTimeout(timeout);
            if (rawJson) {
              try {
                const parsed = JSON.parse(rawJson);
                if (Array.isArray(parsed)) {
                  resolve(parsed);
                  return;
                }
              } catch (e) {}
            }
            resolve([]);
          };
          (window as any).NativeStreamBridge.fetchMalJson(cleanUser);
        });

        if (nativeData.length > 0) {
          allRawEntries.push(...nativeData);
        }
      } catch (e) {
        console.warn('Native Android MAL fetch error:', e);
      }
    }

    // Method 1: Local Android Proxy or Direct load.json (Desktop & Android Proxy)
    if (allRawEntries.length === 0) {
      try {
        const isAndroid = typeof window !== 'undefined' && ((window as any).Capacitor || (window as any).NativeStreamBridge);
        const url = isAndroid
          ? `http://127.0.0.1:8099/mal?user=${encodeURIComponent(cleanUser)}`
          : `https://myanimelist.net/animelist/${encodeURIComponent(cleanUser)}/load.json?offset=0&status=7`;

        const res = await axios.get(url, {
          headers: isAndroid ? {} : { Referer: 'https://myanimelist.net/' },
          timeout: 9000,
        });
        const data = res.data;
        if (Array.isArray(data) && data.length > 0) {
          allRawEntries.push(...data);
        }
      } catch (directErr) {
        console.warn('Direct MAL load.json failed, falling back to proxies:', directErr);
      }
    }

    // Method 2: Jikan REST v4 Fallback (100% CORS-free and Mobile/Capacitor Friendly)
    if (allRawEntries.length === 0) {
      try {
        let page = 1;
        while (allRawEntries.length < 1500) {
          const res = await axios.get(
            `https://api.jikan.moe/v4/users/${cleanUser}/animelist?page=${page}`,
            { timeout: 9000 }
          );
          const data = res.data?.data;
          if (!Array.isArray(data) || data.length === 0) break;

          const mappedJikan = data.map((entry: any) => {
            let st = 1;
            const statusStr = (entry.status || '').toLowerCase();
            if (statusStr.includes('complete')) st = 2;
            else if (statusStr.includes('hold')) st = 3;
            else if (statusStr.includes('drop')) st = 4;
            else if (statusStr.includes('plan')) st = 6;

            return {
              anime_id: entry.entry?.mal_id,
              anime_title: entry.entry?.title,
              anime_num_episodes: entry.entry?.episodes || 12,
              num_watched_episodes: entry.score_watched_episodes || entry.num_episodes_watched || entry.episodes_watched || 0,
              score: entry.score || 0,
              status: st,
              anime_image_path: entry.entry?.images?.jpg?.large_image_url || entry.entry?.images?.jpg?.image_url,
            };
          });

          allRawEntries.push(...mappedJikan);
          if (!res.data?.pagination?.has_next_page) break;
          page++;
        }
      } catch (jikanErr) {
        console.warn('Jikan API fallback also failed:', jikanErr);
      }
    }

    // Method 3: AllOrigins CORS Proxy Fallback
    if (allRawEntries.length === 0) {
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://myanimelist.net/animelist/${cleanUser}/load.json?offset=0&status=7`)}`;
        const res = await axios.get(proxyUrl, { timeout: 9000 });
        if (res.data?.contents) {
          const parsed = JSON.parse(res.data.contents);
          if (Array.isArray(parsed) && parsed.length > 0) {
            allRawEntries.push(...parsed);
          }
        }
      } catch (proxyErr) {
        console.warn('Proxy fallback failed:', proxyErr);
      }
    }

    if (allRawEntries.length === 0) {
      return null;
    }

    const mapMALItem = (item: any): AnimeItem => {
      const title = item.anime_title || item.title || 'Anime';
      const numEps = item.anime_num_episodes || item.total_episodes || 12;
      const progress = item.num_watched_episodes || 0;
      const score = item.score || 0;
      const malId = item.anime_id || item.id;

      return {
        id: malId,
        malId: malId,
        title: {
          romaji: title,
          english: item.anime_title_eng || title,
          userPreferred: title,
        },
        description: `Score: ${score ? `${score}/10` : 'N/A'} • Watched: ${progress} / ${numEps} eps`,
        coverImage: {
          large: item.anime_image_path || '',
          extraLarge: item.anime_image_path || '',
        },
        bannerImage: item.anime_image_path || '',
        format: 'TV',
        status: item.status === 2 ? 'FINISHED' : 'RELEASING',
        episodes: numEps,
        duration: 24,
        genres: ['Animation'],
        studios: [],
        averageScore: score ? score * 10 : 85,
      };
    };

    const watchingRaw = allRawEntries.filter((i) => i.status === 1);
    const completedRaw = allRawEntries.filter((i) => i.status === 2);
    const onHoldRaw = allRawEntries.filter((i) => i.status === 3);
    const droppedRaw = allRawEntries.filter((i) => i.status === 4);
    const planRaw = allRawEntries.filter((i) => i.status === 6);

    const watchingList = watchingRaw.map(mapMALItem);
    const completedList = completedRaw.map(mapMALItem);
    const onHoldList = onHoldRaw.map(mapMALItem);
    const droppedList = droppedRaw.map(mapMALItem);
    const planToWatchList = planRaw.map(mapMALItem);
    const allList = allRawEntries.map(mapMALItem);

    const totalEpisodesWatched = allRawEntries.reduce(
      (acc, curr) => acc + (curr.num_watched_episodes || 0),
      0
    );

    const meanScoreCalc =
      allRawEntries.filter((i) => i.score > 0).reduce((acc, curr) => acc + curr.score, 0) /
      (allRawEntries.filter((i) => i.score > 0).length || 1);

    return {
      username: cleanUser,
      avatarUrl:
        watchingList[0]?.coverImage?.large ||
        completedList[0]?.coverImage?.large ||
        'https://cdn.myanimelist.net/images/userimages/default.jpg',
      episodesWatched: totalEpisodesWatched || 120,
      totalAnime: allList.length || 1,
      meanScore: parseFloat(meanScoreCalc.toFixed(1)) || 8.4,
      provider: 'mal',
      isLoggedIn: true,
      lists: {
        all: allList,
        watching: watchingList,
        completed: completedList,
        onHold: onHoldList,
        dropped: droppedList,
        planToWatch: planToWatchList,
      },
    };
  }

  /**
   * Update Remote MyAnimeList Progress via OAuth2 / Session API (Mihon/Tachiyomi pattern)
   */
  static async updateMALProgress(
    malAnimeId: number,
    numWatchedEpisodes: number,
    status: 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch' = 'watching'
  ): Promise<boolean> {
    try {
      const storedToken = localStorage.getItem('craftnime_mal_oauth_token');
      if (storedToken) {
        const params = new URLSearchParams();
        params.append('num_watched_episodes', String(numWatchedEpisodes));
        params.append('status', status);

        const res = await axios.put(
          `https://api.myanimelist.net/v2/anime/${malAnimeId}/my_list_status`,
          params.toString(),
          {
            headers: {
              Authorization: `Bearer ${storedToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 6000,
          }
        );
        return res.status === 200;
      } else if (typeof window !== 'undefined' && (window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        const res = await ipcRenderer.invoke('update-mal-remote-status', {
          malAnimeId,
          numWatchedEpisodes,
          status,
        });
        return !!res?.success;
      }
    } catch (err) {
      console.warn(`Failed to push progress to MAL cloud for anime ${malAnimeId}:`, (err as any).message);
    }
    return false;
  }
}
