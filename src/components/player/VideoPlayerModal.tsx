import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
  Settings,
  ChevronLeft,
  X,
  List,
  Sparkles,
  Tv,
  CheckCircle2,
  Zap,
  Subtitles,
  Check,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useAnimeStore } from '../../store/useAnimeStore';
import { useMALStore } from '../../store/useMALStore';
import { useWatchedStore } from '../../store/useWatchedStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { AnimeStreamService } from '../../services/animeStream';
import { StremioAddonService, StremioStream } from '../../services/stremioAddon';
import { SubtitleService, SubtitleCue } from '../../services/subtitleService';

export const VideoPlayerModal: React.FC = () => {
  const {
    isPlayerOpen,
    activeAnime,
    activeEpisode,
    episodeList,
    closePlayer,
    playEpisode,
    playNextEpisode,
    playPreviousEpisode,
    audioTrack,
    setAudioTrack,
    selectedTorrent,
    openStreamSelector,
  } = usePlayerStore();

  const { recordWatchProgress } = useAnimeStore();
  const { user, isAutoScrobbleEnabled, scrobbleEpisode } = useMALStore();
  const { isEpisodeWatched, toggleWatchedEpisode } = useWatchedStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Playback States
  const [isPlaying, setPlaying] = useState(false);
  const [currentTimeState, setCurrentTimeState] = useState(0);
  const [durationState, setDurationState] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { seekStep, setSeekStep } = useSettingsStore();
  const lastRecordedTimeRef = useRef<number>(0);
  const [showControls, setShowControls] = useState(true);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<string[]>(['Auto', '1080p', '720p', '480p']);
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  const [scrobbledNotice, setScrobbledNotice] = useState(false);

  // Stream URLs
  const [directStreamUrl, setDirectStreamUrl] = useState<string | null>(null);
  const [isLoadingStream, setIsLoadingStream] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [loadingStatusText, setLoadingStatusText] = useState('Connecting to stream source...');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [torrentInfo, setTorrentInfo] = useState<StremioStream | null>(null);
  const [p2pStats, setP2pStats] = useState<{ numPeers: number; downloadSpeed: number } | null>(null);

  // Subtitles (CC) State (Stremio Standard)
  const [showSubtitlesDrawer, setShowSubtitlesDrawer] = useState(false);
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = useState<string | 'off'>('default');
  const [subtitleSearch, setSubtitleSearch] = useState('');
  const [subtitleDelay, setSubtitleDelay] = useState<number>(0.0);
  const [subtitleSize, setSubtitleSize] = useState<number>(100);
  const [subtitleOffsetVertical, setSubtitleOffsetVertical] = useState<number>(0);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [availableSubtitles, setAvailableSubtitles] = useState<Array<{ id: string; label: string; lang: string; isDefault?: boolean; url?: string }>>([
    { id: 'default-en', label: 'English (Default)', lang: 'en', isDefault: true },
  ]);

  const enableSubtitles = (trackId: string | 'off') => {
    setSelectedSubtitleTrack(trackId);
  };

  // Discover real subtitle tracks from cloud & local torrent
  useEffect(() => {
    if (!isPlayerOpen || !activeAnime) return;
    let isMounted = true;

    const loadTracks = async () => {
      const tracks = await SubtitleService.fetchAvailableTracks(activeAnime, activeEpisode?.number);
      if (isMounted && tracks.length > 0) {
        setAvailableSubtitles(tracks);
        const preferred = tracks.find((t) => t.isDefault && t.url) || tracks.find((t) => t.url) || tracks[0];
        if (preferred) {
          setSelectedSubtitleTrack(preferred.id);
        }
      }
    };

    loadTracks();

    return () => {
      isMounted = false;
    };
  }, [activeAnime?.id, activeEpisode?.number, isPlayerOpen]);

  // Fetch and parse subtitle cues whenever selected track changes
  useEffect(() => {
    if (selectedSubtitleTrack === 'off' || !isPlayerOpen) {
      setSubtitleCues([]);
      return;
    }

    let isMounted = true;
    const trackObj = availableSubtitles.find((t) => t.id === selectedSubtitleTrack);

    const loadCues = async () => {
      if (trackObj) {
        const cues = await SubtitleService.fetchTrackCues(trackObj);
        if (isMounted) {
          setSubtitleCues(cues);
        }
      }
    };

    loadCues();
    return () => {
      isMounted = false;
    };
  }, [selectedSubtitleTrack, availableSubtitles, isPlayerOpen]);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimeRef = useRef<number>(0);
  const hasAutoSkippedIntroRef = useRef(false);
  const hasAutoSkippedOutroRef = useRef(false);

  // Reset Controls Autohide Timer
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettingsDrawer && !showEpisodeDrawer) {
        setShowControls(false);
      }
    }, 3500);
  };

  // Reset flags when episode changes or player opens (always start cleanly from 0:00)
  useEffect(() => {
    hasAutoSkippedIntroRef.current = false;
    hasAutoSkippedOutroRef.current = false;
    lastTimeRef.current = 0;
    setCurrentTimeState(0);
    setDurationState(0);
    setScrobbledNotice(false);
    setStreamError(null);
    setDirectStreamUrl(null);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [activeEpisode?.number, activeAnime?.id, isPlayerOpen]);

  // Autohide controls when playback starts
  useEffect(() => {
    if (isPlaying) {
      resetControlsTimeout();
    }
  }, [isPlaying]);

  // Device orientation: Force landscape mode when player is open, restore portrait on exit
  useEffect(() => {
    if (isPlayerOpen) {
      try {
        if ((window as any).AndroidOrientationBridge?.setLandscape) {
          (window as any).AndroidOrientationBridge.setLandscape();
        } else if (screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch {}
    } else {
      try {
        if ((window as any).AndroidOrientationBridge?.setPortrait) {
          (window as any).AndroidOrientationBridge.setPortrait();
        } else if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      } catch {}
    }
  }, [isPlayerOpen]);

  // Poll P2P torrent stats when torrent stream is active
  useEffect(() => {
    if (!torrentInfo || typeof window === 'undefined' || !(window as any).require) return;
    const { ipcRenderer } = (window as any).require('electron');

    const interval = setInterval(async () => {
      try {
        const stats = await ipcRenderer.invoke('get-torrent-stats');
        if (stats?.isReady) {
          setP2pStats({ numPeers: stats.numPeers || 0, downloadSpeed: stats.downloadSpeed || 0 });
        }
      } catch (e) {}
    }, 2000);

    return () => clearInterval(interval);
  }, [torrentInfo]);

  // Clean up torrent engine when modal closes
  useEffect(() => {
    if (!isPlayerOpen && typeof window !== 'undefined' && (window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.invoke('stop-torrent-stream');
      } catch (e) {}
      setTorrentInfo(null);
      setP2pStats(null);
    }
  }, [isPlayerOpen]);

  // Listen to MPV native player IPC events (Stremio / Miru standard)
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).require) return;
    const { ipcRenderer } = (window as any).require('electron');

    const handleMpvEvent = (_event: any, evt: any) => {
      if (evt.event === 'property-change') {
        if (evt.name === 'time-pos' && typeof evt.value === 'number') {
          setCurrentTimeState(evt.value);
        } else if (evt.name === 'duration' && typeof evt.value === 'number' && evt.value > 300) {
          setDurationState(evt.value);
        } else if (evt.name === 'pause') {
          setPlaying(!evt.value);
        }
      } else if (evt.event === 'close') {
        // MPV player window closed
      }
    };

    ipcRenderer.on('mpv-event', handleMpvEvent);
    return () => {
      ipcRenderer.removeListener('mpv-event', handleMpvEvent);
    };
  }, []);

  const openInMpv = async () => {
    if (!directStreamUrl || typeof window === 'undefined' || !(window as any).require) return;
    const { ipcRenderer } = (window as any).require('electron');
    const title = activeAnime?.title?.english || activeAnime?.title?.romaji || 'Anime';
    const epTitle = activeEpisode?.title || `Episode ${activeEpisode?.number || 1}`;
    await ipcRenderer.invoke('launch-mpv-player', {
      streamUrl: directStreamUrl,
      animeTitle: title,
      episodeTitle: epTitle,
    });
  };

  // Resolve Stream on Episode / Anime / Audio track change
  useEffect(() => {
    if (!isPlayerOpen || !activeAnime || !activeEpisode) return;

    let isMounted = true;
    setIsLoadingStream(true);
    setStreamError(null);
    setTorrentInfo(null);

    const title = activeAnime.title?.english || activeAnime.title?.romaji || '';
    const epNum = activeEpisode.number;

    const resolveStream = async () => {
      try {
        setLoadingStatusText('Searching Stremio Swarms & Nyaa Indexes...');
        // Priority 1: Instant High-Speed Nyaa Sequential P2P Torrent (Zero Maintenance)
        if (typeof window !== 'undefined' && (window as any).require) {
          const { ipcRenderer } = (window as any).require('electron');
          
          try {
            const stream = selectedTorrent?.magnet
              ? selectedTorrent
              : await StremioAddonService.findEpisodeStream(
                  activeAnime,
                  epNum,
                  audioTrack === 'dub'
                );

            if (stream?.magnet && isMounted) {
              setLoadingStatusText(`Connecting to swarm (${stream.seeders || 0} seeders) & buffering pieces...`);
              const res = await ipcRenderer.invoke('start-torrent-stream', {
                magnet: stream.magnet,
                fileIdx: stream.fileIdx,
              });
              if (res?.streamUrl && isMounted) {
                setTorrentInfo(stream);
                setDirectStreamUrl(res.streamUrl);
                setLoadingStatusText('Buffer ready. Initializing video decoder...');
                return;
              }
            }
          } catch (tErr) {
            console.warn('Stremio torrent resolution fallback triggered:', tErr);
          }

          setLoadingStatusText('Resolving direct high-speed HLS stream...');
          // Fallback 1.5: Desktop Script Resolver
          const result = await ipcRenderer.invoke('resolve-anime-stream', {
            title,
            episodeNumber: epNum,
            audioLanguage: audioTrack === 'dub' ? 'dub' : 'sub',
          });

          if (!isMounted) return;

          if (result?.streamUrl) {
            setDirectStreamUrl(result.streamUrl);
            setLoadingStatusText('Direct master HLS connected.');
          } else {
            const webRes = await AnimeStreamService.resolveStream(title, epNum, activeAnime.malId, audioTrack);
            if (webRes.sources?.[0]?.url) {
              setDirectStreamUrl(webRes.sources[0].url);
              setLoadingStatusText('Direct master HLS connected.');
              if (webRes.subtitles && webRes.subtitles.length > 0) {
                const newSubs = webRes.subtitles.map((s, idx) => ({
                  id: s.url || `stream-sub-${idx}`,
                  label: s.label || s.lang,
                  lang: s.lang,
                  isDefault: s.isDefault ?? (s.lang === 'en' || s.lang === 'eng' || idx === 0),
                  url: s.url,
                }));
                setAvailableSubtitles((prev) => {
                  const existingUrls = new Set(prev.map((p) => p.url).filter(Boolean));
                  const unique = newSubs.filter((n) => n.url && !existingUrls.has(n.url));
                  const base = prev.filter((p) => p.url);
                  const combined = [...unique, ...base];
                  return combined.length > 0 ? combined : prev;
                });
                const defaultTrack = newSubs.find((s) => s.isDefault || s.lang === 'en' || s.lang === 'eng') || newSubs[0];
                if (defaultTrack && defaultTrack.url) {
                  setSelectedSubtitleTrack(defaultTrack.id);
                }
              }
            } else {
              setStreamError('Could not resolve stream source for this episode.');
            }
          }
        } else {
          setLoadingStatusText('Resolving direct master HLS stream...');
          const webRes = await AnimeStreamService.resolveStream(title, epNum, activeAnime.malId, audioTrack);
          if (!isMounted) return;
          if (webRes.sources?.[0]?.url) {
            setDirectStreamUrl(webRes.sources[0].url);
            setLoadingStatusText('Direct master HLS connected.');
            if (webRes.subtitles && webRes.subtitles.length > 0) {
              const newSubs = webRes.subtitles.map((s, idx) => ({
                id: s.url || `stream-sub-${idx}`,
                label: s.label || s.lang,
                lang: s.lang,
                isDefault: s.isDefault ?? (s.lang === 'en' || s.lang === 'eng' || idx === 0),
                url: s.url,
              }));
              setAvailableSubtitles((prev) => {
                const existingUrls = new Set(prev.map((p) => p.url).filter(Boolean));
                const unique = newSubs.filter((n) => n.url && !existingUrls.has(n.url));
                const base = prev.filter((p) => p.url);
                const combined = [...unique, ...base];
                return combined.length > 0 ? combined : prev;
              });
              const defaultTrack = newSubs.find((s) => s.isDefault || s.lang === 'en' || s.lang === 'eng') || newSubs[0];
              if (defaultTrack && defaultTrack.url) {
                setSelectedSubtitleTrack(defaultTrack.id);
              }
            }
          } else if (webRes.embedUrl) {
            setDirectStreamUrl(webRes.embedUrl);
          } else {
            setDirectStreamUrl(`https://vidsrc.cc/v2/embed/anime/mal/${activeAnime.malId || activeAnime.id}/${epNum}`);
          }
        }
      } catch (err: any) {
        console.warn('Stream resolution error:', err);
        if (isMounted) setStreamError('Stream resolution error occurred.');
      } finally {
        if (isMounted && !torrentInfo) setIsLoadingStream(false);
      }
    };

    resolveStream();

    return () => {
      isMounted = false;
    };
  }, [activeAnime?.id, activeEpisode?.number, audioTrack, isPlayerOpen, selectedTorrent]);

  // Stream Attachment (HLS vs Direct P2P/MP4)
  useEffect(() => {
    if (!directStreamUrl || !videoRef.current) return;

    const video = videoRef.current;
    video.currentTime = 0;

    const isHlsStream = directStreamUrl.includes('.m3u8');

    if (isHlsStream) {
      if (Hls.isSupported()) {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          maxBufferLength: 60,
          maxMaxBufferLength: 300,
          maxBufferSize: 60 * 1000 * 1000,
          backBufferLength: 30,
          startLevel: -1,
        });

        hls.loadSource(directStreamUrl);
        hls.attachMedia(video);
        hlsRef.current = hls;

        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.warn("[Player] HLS Event Error:", data);
          if (data.fatal) {
            console.log("[Player] Switching to native video source for direct playback");
            if (videoRef.current) {
              videoRef.current.src = directStreamUrl;
              videoRef.current.currentTime = 0;
              videoRef.current.play().catch(() => {});
            }
          }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const levels = hls.levels.map((l) => `${l.height}p`);
          if (levels.length > 0) {
            setAvailableQualities([...Array.from(new Set(levels)), 'Auto']);
          }
          video.currentTime = 0;
          video.play().catch(() => {});
          setPlaying(true);
          setIsLoadingStream(false);
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = directStreamUrl;
        video.currentTime = 0;
        video.play().catch(() => {});
        setPlaying(true);
        setIsLoadingStream(false);
      }
    } else {
      // Direct P2P Torrent Stream / Native MP4
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setAvailableQualities(['1080p Master (P2P)', 'Auto']);
      setSelectedQuality('1080p Master (P2P)');

      video.src = directStreamUrl;
      video.load();
      video.play().then(() => {
        setPlaying(true);
        setIsLoadingStream(false);
      }).catch((e) => {
        console.warn('Direct video play error:', e);
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [directStreamUrl]);

  // Quality Change
  const handleQualityChange = (q: string) => {
    setSelectedQuality(q);
    if (!hlsRef.current) return;

    if (q === 'Auto') {
      hlsRef.current.currentLevel = -1;
    } else {
      const height = parseInt(q, 10);
      const levelIdx = hlsRef.current.levels.findIndex((l) => l.height === height);
      if (levelIdx !== -1) {
        hlsRef.current.currentLevel = levelIdx;
      }
    }
  };

  // Video Time Update & Progress Record
  const handleVideoTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const now = video.currentTime;
    setCurrentTimeState(now);
    if (now > 0 && isLoadingStream) {
      setIsLoadingStream(false);
    }

    const validDuration = (video.duration && isFinite(video.duration) && video.duration > 300)
      ? video.duration
      : (activeAnime?.duration ? activeAnime.duration * 60 : 1440);

    if (durationState <= 300 || (video.duration && isFinite(video.duration) && video.duration > 300)) {
      setDurationState(validDuration);
    }

    lastTimeRef.current = now;

    // Real-time Continue Watching Progress recording (Netflix & Stremio standard)
    if (activeAnime && activeEpisode && now > 3) {
      if (Math.abs(now - lastRecordedTimeRef.current) >= 5) {
        lastRecordedTimeRef.current = now;
        recordWatchProgress(
          activeAnime,
          activeEpisode.number,
          activeEpisode.title || `Episode ${activeEpisode.number}`,
          now,
          validDuration
        );
      }
    }

    // Auto-Scrobble & Mark Watched at 80% (only if watched 80% of full episode)
    if (activeAnime && activeEpisode && validDuration > 120) {
      const pct = (now / validDuration) * 100;
      if (pct >= 80 && !scrobbledNotice) {
        setScrobbledNotice(true);
        setTimeout(() => setScrobbledNotice(false), 4000);
        toggleWatchedEpisode(activeAnime.id, activeEpisode.number, activeAnime.episodes);
        if (isAutoScrobbleEnabled && user.isLoggedIn) {
          scrobbleEpisode(
            activeAnime.title?.english || activeAnime.title?.romaji || 'Anime',
            activeEpisode.number,
            activeAnime.episodes
          );
        }
      }
    }
  };

  // 3-Zone Touch & Double Tap Seek Handler
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<'left' | 'right' | null>(null);
  const lastTapRef_zone = useRef<{ time: number; zone: 'left' | 'center' | 'right' }>({ time: 0, zone: 'center' });
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleZoneClick = (zone: 'left' | 'center' | 'right') => {
    const now = Date.now();
    const prev = lastTapRef_zone.current;

    if (now - prev.time < 300 && prev.zone === zone && (zone === 'left' || zone === 'right')) {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      // Double tap detected!
      if (zone === 'left') {
        seekRelative(-seekStep);
        setDoubleTapFeedback('left');
        setTimeout(() => setDoubleTapFeedback(null), 700);
      } else {
        seekRelative(seekStep);
        setDoubleTapFeedback('right');
        setTimeout(() => setDoubleTapFeedback(null), 700);
      }
      lastTapRef_zone.current = { time: 0, zone: 'center' };
      return;
    }

    lastTapRef_zone.current = { time: now, zone };
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);

    tapTimeoutRef.current = setTimeout(() => {
      // Single tap -> toggle controls
      setShowControls((prev) => !prev);
      resetControlsTimeout();
    }, 280);
  };

  // Play / Pause Toggle
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
    resetControlsTimeout();
  };

  // Volume Change
  const handleVolumeChange = (newVol: number) => {
    setVolumeState(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
  };

  // Seek Function
  const seekRelative = (seconds: number) => {
    if (!videoRef.current) return;
    const maxDur = durationState > 0 ? durationState : (videoRef.current.duration || 1440);
    const target = Math.max(0, Math.min(maxDur, currentTimeState + seconds));
    setCurrentTimeState(target);
    videoRef.current.currentTime = target;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setCurrentTimeState(target);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isPlayerOpen || !activeAnime) return null;

  const epNum = activeEpisode?.number || 1;

  const effectiveSubTime = currentTimeState + subtitleDelay;
  const activeSubtitleCues = (selectedSubtitleTrack !== 'off' && subtitleCues.length > 0)
    ? subtitleCues.filter((c) => effectiveSubTime >= c.start && effectiveSubTime <= c.end)
    : [];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden"
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      onTouchMove={resetControlsTimeout}
      onClick={resetControlsTimeout}
    >
      {/* Video Container & Touch Zones */}
      <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
        {directStreamUrl && (directStreamUrl.includes("embed") || directStreamUrl.includes("vidsrc") || directStreamUrl.includes("2embed")) ? (
          <iframe
            src={directStreamUrl}
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media"
            className="w-full h-full border-0 z-10"
            onLoad={() => setIsLoadingStream(false)}
          />
        ) : (
          <video
            ref={videoRef}
            poster="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'></svg>"
            style={{ backgroundColor: '#000000' }}
            onTimeUpdate={handleVideoTimeUpdate}
            onWaiting={() => setIsBuffering(true)}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.duration && isFinite(v.duration) && v.duration > 300) {
                setDurationState(v.duration);
              } else {
                const fallback = activeAnime.duration ? activeAnime.duration * 60 : 1440;
                setDurationState(fallback);
              }
              if (v.textTracks?.[0] && selectedSubtitleTrack !== 'off') {
                v.textTracks[0].mode = 'showing';
              }
            }}
            onLoadedData={() => {
              setIsLoadingStream(false);
              setIsBuffering(false);
              if (videoRef.current?.textTracks?.[0] && selectedSubtitleTrack !== 'off') {
                videoRef.current.textTracks[0].mode = 'showing';
              }
            }}
            onPlaying={() => {
              setIsLoadingStream(false);
              setIsBuffering(false);
            }}
            onCanPlay={() => {
              setIsLoadingStream(false);
              setIsBuffering(false);
            }}
            onSeeking={() => setIsLoadingStream(true)}
            onSeeked={() => {
              setIsLoadingStream(false);
              setIsBuffering(false);
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            className="w-full h-full object-contain pointer-events-none block bg-black"
            playsInline
            autoPlay
            crossOrigin="anonymous"
          />
        )}

        {/* 3-Zone Touch & Double-Tap Seeking Layer */}
        <div className="absolute inset-0 z-10 flex">
          {/* Left Zone: 30% width -> Double Tap: -seekStep */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleZoneClick('left');
            }}
            className="w-[30%] h-full cursor-pointer relative"
          >
            {doubleTapFeedback === 'left' && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/10 rounded-r-full animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col items-center gap-1 text-white">
                  <RotateCcw className="w-10 h-10 animate-spin" />
                  <span className="font-mono text-xs font-bold bg-black/75 px-2.5 py-1 rounded-md border border-white/20">-{seekStep}s</span>
                </div>
              </div>
            )}
          </div>

          {/* Center Zone: 40% width -> Single Tap: Toggle HUD */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleZoneClick('center');
            }}
            className="w-[40%] h-full cursor-pointer"
          />

          {/* Right Zone: 30% width -> Double Tap: +seekStep */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              handleZoneClick('right');
            }}
            className="w-[30%] h-full cursor-pointer relative"
          >
            {doubleTapFeedback === 'right' && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/10 rounded-l-full animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col items-center gap-1 text-white">
                  <RotateCw className="w-10 h-10 animate-spin" />
                  <span className="font-mono text-xs font-bold bg-black/75 px-2.5 py-1 rounded-md border border-white/20">+{seekStep}s</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Netflix-Style Center Floating Quick Controls (Mobile & Desktop) */}
        <div
          className={`absolute inset-0 pointer-events-none z-20 flex items-center justify-center gap-8 sm:gap-14 transition-opacity duration-300 ${
            showControls && !isLoadingStream && !streamError ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Rewind seekStep */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              seekRelative(-seekStep);
              resetControlsTimeout();
            }}
            className="p-3.5 sm:p-4 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xl text-white border border-white/20 shadow-2xl hover:scale-110 active:scale-95 transition-all pointer-events-auto cursor-pointer"
            title={`Rewind ${seekStep} seconds`}
          >
            <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>

          {/* Center Large Play / Pause Button - Sleek Translucent Frosted Glass */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="p-5 sm:p-6 rounded-full bg-black/45 hover:bg-black/75 backdrop-blur-xl text-white border border-white/25 shadow-2xl hover:scale-110 active:scale-95 transition-all pointer-events-auto cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-white" />
            ) : (
              <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white translate-x-0.5" />
            )}
          </button>

          {/* Forward seekStep */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              seekRelative(seekStep);
              resetControlsTimeout();
            }}
            className="p-3.5 sm:p-4 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xl text-white border border-white/20 shadow-2xl hover:scale-110 active:scale-95 transition-all pointer-events-auto cursor-pointer"
            title={`Forward ${seekStep} seconds`}
          >
            <RotateCw className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        </div>

        {/* Stremio-Style Swarm & Buffer Monitor Loading Overlay */}
        {isLoadingStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/92 z-30 space-y-5 p-6 animate-in fade-in duration-300">
            {/* Animated Radar Pulse Loader */}
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full border-2 border-crafted-brand-rust/30 animate-ping absolute" />
              <div className="w-14 h-14 rounded-full border-3 border-crafted-brand-rust border-t-transparent animate-spin" />
              <Zap className="w-6 h-6 text-crafted-brand-rust absolute animate-pulse" />
            </div>

            {/* Anime & Episode Title */}
            <div className="text-center space-y-1 max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crafted-panel border border-crafted-border text-[11px] font-mono text-crafted-brand-rustLight font-bold">
                <span>EPISODE {activeEpisode?.number || 1}</span>
                <span>•</span>
                <span>{audioTrack.toUpperCase()}</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white truncate">
                {activeAnime.title?.english || activeAnime.title?.romaji}
              </h3>
            </div>

            {/* Dynamic Status Readout (Stremio Standard) */}
            <div className="bg-crafted-surface/90 border border-crafted-border rounded-2xl px-5 py-3.5 max-w-md w-full shadow-2xl text-center space-y-2">
              <p className="text-xs font-mono font-bold text-white tracking-wide">
                {torrentInfo ? '⚡ Swarm Stream (P2P Torrentio)' : '⚡ Direct Master HLS Stream'}
              </p>
              <p className="text-[11px] font-mono text-crafted-text-dim animate-pulse">
                {loadingStatusText}
              </p>

              {torrentInfo && (
                <div className="flex items-center justify-center gap-4 pt-1 text-[11px] font-mono text-crafted-brand-rustLight border-t border-crafted-border/50">
                  <span>👤 Peers: <strong className="text-emerald-400">{p2pStats?.numPeers || torrentInfo.seeders || 'Connecting...'}</strong></span>
                  <span>📥 Speed: <strong className="text-emerald-400">{p2pStats && p2pStats.downloadSpeed > 0 ? `${(p2pStats.downloadSpeed / 1024 / 1024).toFixed(2)} MB/s` : 'Buffering...'}</strong></span>
                </div>
              )}
            </div>

            {/* Quick Stream Switching Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeAnime) {
                    openStreamSelector(activeAnime, activeEpisode || undefined);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-crafted-panel hover:bg-crafted-border text-white text-xs font-mono border border-crafted-border transition-colors cursor-pointer flex items-center gap-2"
              >
                <List className="w-3.5 h-3.5 text-crafted-brand-rust" />
                <span>Select Different Stream</span>
              </button>
            </div>
          </div>
        )}

        {/* In-Playback Buffering Pill */}
        {isBuffering && !isLoadingStream && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-black/80 backdrop-blur-md border border-crafted-brand-rust/50 text-white font-mono text-xs flex items-center gap-2 shadow-2xl animate-pulse">
            <div className="w-3 h-3 border-2 border-crafted-brand-rust border-t-transparent rounded-full animate-spin" />
            <span>Buffering stream... {p2pStats && p2pStats.downloadSpeed > 0 ? `${(p2pStats.downloadSpeed / 1024 / 1024).toFixed(1)} MB/s` : ''}</span>
          </div>
        )}

        {/* Stream Error Notice */}
        {streamError && !isLoadingStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 space-y-4 p-6 text-center">
            <div className="max-w-md space-y-2">
              <p className="text-sm font-bold text-rose-400 font-mono">Stream Loading Failed</p>
              <p className="text-xs text-crafted-text-dim font-mono break-all">{streamError}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAudioTrack(audioTrack === "dub" ? "sub" : "dub");
                }}
                className="px-4 py-2 rounded-xl bg-crafted-brand-rust text-white text-xs font-mono font-bold cursor-pointer hover:brightness-110 shadow-lg"
              >
                Switch to {audioTrack === "dub" ? "SUB" : "DUB"}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closePlayer();
                }}
                className="px-4 py-2 rounded-xl bg-crafted-surface text-white text-xs border border-crafted-border hover:bg-crafted-panel cursor-pointer"
              >
                Close Player
              </button>
            </div>
          </div>
        )}

        {/* 80% MAL Scrobbled Badge Notice */}
        {scrobbledNotice && (
          <div className="absolute top-20 right-8 z-30 px-4 py-2 rounded-xl bg-emerald-950/90 text-emerald-300 font-mono text-xs border border-emerald-500/40 shadow-2xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Watched & Scrobbled to MAL</span>
          </div>
        )}

        {/* High-Visibility Custom Subtitle Overlay (Stremio Standard - Instant Sync on Seek) */}
        {selectedSubtitleTrack !== 'off' && activeSubtitleCues.length > 0 && (
          <div
            className="absolute left-0 right-0 z-20 pointer-events-none flex flex-col items-center justify-center px-6 transition-all duration-150 select-none"
            style={{
              bottom: showControls ? `${88 + subtitleOffsetVertical}px` : `${28 + subtitleOffsetVertical}px`,
            }}
          >
            {activeSubtitleCues.map((cue, idx) => (
              <div
                key={idx}
                className="text-center font-sans font-bold leading-snug max-w-4xl px-3 py-1 select-none"
                style={{
                  fontSize: `${Math.round(22 * (subtitleSize / 100))}px`,
                  color: '#FFFFFF',
                  textShadow:
                    '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, -1px 0 0 #000, 1px 0 0 #000, 0 -1px 0 #000, 0 1px 0 #000, 0 3px 8px rgba(0, 0, 0, 0.95)',
                }}
              >
                {cue.text.split('\n').map((line, lIdx) => (
                  <span key={lIdx} className="block">
                    {line}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Header Overlay Bar */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between z-30 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={closePlayer}
            className="p-2 rounded-xl bg-black/60 hover:bg-crafted-brand-rust text-white border border-white/10 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                {activeAnime.title?.english || activeAnime.title?.romaji}
              </h3>
              {torrentInfo && (
                <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono shadow-md">
                  <Zap className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                  <span>P2P Direct • {torrentInfo.releaseGroup} ({p2pStats?.numPeers || torrentInfo.seeders} peers)</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-crafted-brand-rustLight">
              <span>Episode {epNum}</span>
              <span>•</span>
              <span className="text-crafted-text-dim truncate">
                {(activeEpisode?.title || `Episode ${epNum}`).replace(/^Episode \d+:\s*/, '')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeAnime && activeEpisode) {
                openStreamSelector(activeAnime, activeEpisode);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-crafted-panel hover:bg-crafted-surface text-white text-xs font-mono font-bold border border-crafted-border hover:border-crafted-brand-rust transition-all cursor-pointer shadow-md"
            title="Switch Torrent Release / Seeders (Torrentio)"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span className="hidden sm:inline">Streams</span>
          </button>

          {torrentInfo && (
            <>
              <button
                onClick={openInMpv}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-crafted-panel hover:bg-crafted-surface text-white text-xs font-mono font-bold border border-crafted-border hover:border-crafted-brand-rust shadow-lg transition-all cursor-pointer"
                title="Optional: Open stream in external MPV window"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Open in MPV</span>
              </button>
              <div className="sm:hidden flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono">
                <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                <span>{p2pStats?.numPeers || torrentInfo.seeders}P</span>
              </div>
            </>
          )}
          <button
            onClick={closePlayer}
            className="p-2 rounded-xl bg-black/60 hover:bg-rose-500 text-white border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent space-y-3 z-30 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Scrubber Progress Bar */}
        <div className="flex items-center gap-3 text-xs font-mono text-white">
          <span>{formatTime(currentTimeState)}</span>
          <input
            type="range"
            min={0}
            max={durationState || 100}
            value={currentTimeState}
            onChange={handleSeek}
            className="w-full accent-crafted-brand-rust h-1.5 rounded-lg bg-white/20 cursor-pointer"
          />
          <span>{formatTime(durationState)}</span>
        </div>

        {/* Buttons Control Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Left Playback Group */}
          <div className="flex items-center gap-2">
            <button
              onClick={playPreviousEpisode}
              className="p-2 text-white hover:text-crafted-brand-rust transition-colors cursor-pointer"
              title="Previous Episode"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={() => seekRelative(-seekStep)}
              className="px-2 py-1 text-xs font-mono text-crafted-text-dim hover:text-white transition-colors cursor-pointer"
            >
              -{seekStep}s
            </button>

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-crafted-button text-white flex items-center justify-center shadow-crafted-glow hover:scale-105 transition-transform cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>

            <button
              onClick={() => seekRelative(seekStep)}
              className="px-2 py-1 text-xs font-mono text-crafted-text-dim hover:text-white transition-colors cursor-pointer"
            >
              +{seekStep}s
            </button>

            {/* Dedicated Anime OP/ED 90-Second Skip Button */}
            <button
              onClick={() => seekRelative(90)}
              className="px-2.5 py-1 text-xs font-mono font-bold text-white bg-crafted-brand-rust/30 hover:bg-crafted-brand-rust border border-crafted-brand-rust/50 rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              title="Skip 90s (Anime Opening/Ending)"
            >
              <Sparkles className="w-3.5 h-3.5 text-crafted-brand-rustLight" />
              <span>+90s</span>
            </button>

            <button
              onClick={playNextEpisode}
              className="p-2 text-white hover:text-crafted-brand-rust transition-colors cursor-pointer"
              title="Next Episode"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2 ml-2">
              <button onClick={toggleMute} className="text-white hover:text-crafted-brand-rust cursor-pointer">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-16 accent-crafted-brand-rust h-1 bg-white/20 rounded cursor-pointer hidden sm:block"
              />
            </div>
          </div>

          {/* Right Extras Group */}
          <div className="flex items-center gap-2">
            {/* CC Subtitles Button & Popover */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSubtitlesDrawer(!showSubtitlesDrawer);
                }}
                className={`px-3 py-1 rounded-xl flex items-center gap-1.5 border text-xs font-mono font-bold transition-colors cursor-pointer ${
                  selectedSubtitleTrack !== 'off'
                    ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust shadow-md'
                    : 'bg-crafted-surface/80 hover:bg-crafted-surface text-crafted-text-dim border-crafted-border'
                }`}
                title="Subtitle Tracks (CC)"
              >
                <Subtitles className="w-3.5 h-3.5" />
                <span>CC</span>
              </button>

              {/* Subtitles Popover Menu (Stremio Subtitles Menu Standard) */}
              {showSubtitlesDrawer && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-12 right-0 w-80 max-h-[80vh] bg-crafted-panel/95 border border-crafted-border rounded-2xl shadow-2xl p-4 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 flex flex-col space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-crafted-border shrink-0">
                    <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                      <Subtitles className="w-3.5 h-3.5 text-crafted-brand-rust" />
                      <span>Subtitles (CC) • {availableSubtitles.length} Tracks</span>
                    </span>
                    <button
                      onClick={() => setShowSubtitlesDrawer(false)}
                      className="text-crafted-text-dim hover:text-white p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Search Bar */}
                  {availableSubtitles.length > 4 && (
                    <div className="shrink-0">
                      <input
                        type="text"
                        placeholder="Filter languages (e.g. English, Spanish)..."
                        value={subtitleSearch}
                        onChange={(e) => setSubtitleSearch(e.target.value)}
                        className="w-full bg-crafted-surface/90 text-white text-[11px] font-mono px-3 py-1.5 rounded-xl border border-crafted-border focus:border-crafted-brand-rust focus:outline-none placeholder-crafted-text-dim/60"
                      />
                    </div>
                  )}

                  {/* Track Selection (Scrollable) */}
                  <div className="flex-1 max-h-44 overflow-y-auto pr-1 space-y-1 text-xs font-mono custom-scrollbar">
                    <span className="text-[10px] text-crafted-text-dim font-bold block uppercase tracking-wider sticky top-0 bg-crafted-panel/95 py-0.5 z-10">
                      Track Selection
                    </span>
                    {availableSubtitles
                      .filter(
                        (s) =>
                          !subtitleSearch ||
                          s.label.toLowerCase().includes(subtitleSearch.toLowerCase()) ||
                          s.lang.toLowerCase().includes(subtitleSearch.toLowerCase())
                      )
                      .map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => {
                            enableSubtitles(sub.id);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                            selectedSubtitleTrack === sub.id
                              ? 'bg-crafted-brand-rust text-white font-bold shadow-sm'
                              : 'text-crafted-text hover:bg-crafted-surface'
                          }`}
                        >
                          <span className="truncate pr-2">{sub.label}</span>
                          {selectedSubtitleTrack === sub.id && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                        </button>
                      ))}
                    <button
                      onClick={() => {
                        enableSubtitles('off');
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                        selectedSubtitleTrack === 'off'
                          ? 'bg-crafted-brand-rust text-white font-bold shadow-sm'
                          : 'text-crafted-text-dim hover:bg-crafted-surface'
                      }`}
                    >
                      <span>Off</span>
                      {selectedSubtitleTrack === 'off' && <Check className="w-3.5 h-3.5 shrink-0 text-white" />}
                    </button>
                  </div>

                  {/* Subtitle Delay / Offset Stepper (Stremio Standard) */}
                  {selectedSubtitleTrack !== 'off' && (
                    <div className="shrink-0 space-y-2.5 pt-2 border-t border-crafted-border">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-crafted-text-dim text-[11px] font-mono font-bold">Subtitle Delay</span>
                          <button
                            onClick={() => setSubtitleDelay(0)}
                            className="text-[10px] font-mono text-crafted-brand-rust hover:underline cursor-pointer"
                          >
                            Reset (0.0s)
                          </button>
                        </div>
                        <div className="flex items-center justify-between bg-crafted-surface rounded-xl p-1 border border-crafted-border">
                          <button
                            onClick={() => setSubtitleDelay((d) => Math.round((d - 0.1) * 10) / 10)}
                            className="px-3 py-1 text-xs font-mono font-bold text-white hover:bg-crafted-panel rounded-lg cursor-pointer transition-colors"
                            title="Delay -0.1s"
                          >
                            -0.1s
                          </button>
                          <span className="text-xs font-mono font-bold text-crafted-brand-rustLight">
                            {subtitleDelay > 0 ? `+${subtitleDelay.toFixed(1)}s` : `${subtitleDelay.toFixed(1)}s`}
                          </span>
                          <button
                            onClick={() => setSubtitleDelay((d) => Math.round((d + 0.1) * 10) / 10)}
                            className="px-3 py-1 text-xs font-mono font-bold text-white hover:bg-crafted-panel rounded-lg cursor-pointer transition-colors"
                            title="Delay +0.1s"
                          >
                            +0.1s
                          </button>
                        </div>
                      </div>

                      {/* Subtitle Size Selector (Stremio Standard) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-crafted-text-dim text-[11px] font-mono font-bold">Subtitle Size</span>
                          <span className="text-[10px] font-mono text-crafted-brand-rustLight font-bold">{subtitleSize}%</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[75, 100, 125, 150].map((sz) => (
                            <button
                              key={sz}
                              onClick={() => setSubtitleSize(sz)}
                              className={`py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                                subtitleSize === sz
                                  ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust shadow-sm'
                                  : 'bg-crafted-surface text-crafted-text border-crafted-border hover:bg-crafted-panel'
                              }`}
                            >
                              {sz}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Vertical Position */}
                      <div className="space-y-1">
                        <span className="text-crafted-text-dim text-[11px] font-mono font-bold block">Position</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => setSubtitleOffsetVertical(0)}
                            className={`py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                              subtitleOffsetVertical === 0
                                ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust shadow-sm'
                                : 'bg-crafted-surface text-crafted-text border-crafted-border hover:bg-crafted-panel'
                            }`}
                          >
                            Normal
                          </button>
                          <button
                            onClick={() => setSubtitleOffsetVertical(28)}
                            className={`py-1 rounded-lg text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                              subtitleOffsetVertical === 28
                                ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust shadow-sm'
                                : 'bg-crafted-surface text-crafted-text border-crafted-border hover:bg-crafted-panel'
                            }`}
                          >
                            Raised (+28px)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quality Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-crafted-surface/80 border border-crafted-border">
              <Tv className="w-3.5 h-3.5 text-crafted-brand-rust ml-1.5 hidden sm:inline" />
              <select
                value={selectedQuality}
                onChange={(e) => handleQualityChange(e.target.value)}
                className="bg-transparent text-crafted-text text-xs font-mono px-2 py-0.5 focus:outline-none cursor-pointer"
              >
                {availableQualities.map((q) => (
                  <option key={q} value={q} className="bg-crafted-surface text-white">
                    {q}
                  </option>
                ))}
              </select>
            </div>

            {/* Settings Trigger */}
            <button
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className="p-2 rounded-xl bg-crafted-surface/80 hover:bg-crafted-surface text-crafted-text hover:text-white border border-crafted-border transition-colors cursor-pointer"
              title="Player Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Episode List Trigger */}
            <button
              onClick={() => setShowEpisodeDrawer(!showEpisodeDrawer)}
              className="p-2 rounded-xl bg-crafted-surface/80 hover:bg-crafted-surface text-crafted-text hover:text-white border border-crafted-border transition-colors cursor-pointer"
              title="Episode Matrix"
            >
              <List className="w-4 h-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-crafted-surface/80 hover:bg-crafted-surface text-crafted-text hover:text-white border border-crafted-border transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Settings Drawer */}
      {showSettingsDrawer && (
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-crafted-panel/95 border-l border-crafted-border z-40 p-5 flex flex-col backdrop-blur-xl animate-in slide-in-from-right space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-crafted-border">
            <h4 className="text-sm font-bold font-serif text-white">Playback Settings</h4>
            <button
              onClick={() => setShowSettingsDrawer(false)}
              className="p-1 text-crafted-text-dim hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-crafted-text-dim font-mono block">Seek Step (Skip Buttons)</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 15, 30].map((step) => (
                  <button
                    key={step}
                    onClick={() => setSeekStep(step)}
                    className={`py-2 rounded-lg font-mono font-bold border transition-all cursor-pointer ${
                      seekStep === step
                        ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust shadow-crafted-glow'
                        : 'bg-crafted-surface text-crafted-text border-crafted-border hover:border-white/20'
                    }`}
                  >
                    {step}s
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-crafted-border">
              <button
                onClick={() => {
                  setShowSettingsDrawer(false);
                  useSettingsStore.getState().openSettings();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-crafted-surface hover:bg-crafted-panel border border-crafted-border hover:border-crafted-brand-rust text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Settings className="w-4 h-4 text-crafted-brand-rustLight" />
                <span>Open Full Settings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Episode Drawer */}
      {showEpisodeDrawer && (
        <div className="absolute right-0 top-0 bottom-0 w-80 sm:w-96 bg-crafted-panel/95 border-l border-crafted-border z-40 flex flex-col backdrop-blur-xl animate-in slide-in-from-right">
          <div className="flex items-center justify-between p-4 border-b border-crafted-border">
            <h4 className="text-sm font-bold font-serif text-white">Episodes ({episodeList.length})</h4>
            <button
              onClick={() => setShowEpisodeDrawer(false)}
              className="p-1 text-crafted-text-dim hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {episodeList.map((ep) => {
              const isCurrent = ep.number === activeEpisode?.number;
              const isWatched = isEpisodeWatched(activeAnime.id, ep.number);

              return (
                <div
                  key={ep.id}
                  onClick={() => {
                    playEpisode(ep);
                    setShowEpisodeDrawer(false);
                  }}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust shadow-crafted-glow'
                      : isWatched
                      ? 'bg-emerald-950/20 text-crafted-text-dim hover:text-white border-emerald-500/30'
                      : 'bg-crafted-surface hover:bg-crafted-surface-hover text-crafted-text border-crafted-border'
                  }`}
                >
                  <img
                    src={ep.thumbnail || activeAnime.bannerImage}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-16 aspect-video object-cover rounded-lg shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono block">Episode {ep.number}</span>
                    <h5 className="text-xs font-semibold truncate">
                      {(ep.title || `Episode ${ep.number}`).replace(/^Episode \d+:\s*/, '')}
                    </h5>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
