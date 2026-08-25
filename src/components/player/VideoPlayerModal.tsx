import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  FastForward,
  CheckCircle2,
  SkipForward,
  SkipBack,
  List,
  Server,
  RefreshCw,
  Settings,
  Tv,
} from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useMALStore } from '../../store/useMALStore';
import { useAnimeStore } from '../../store/useAnimeStore';

export const VideoPlayerModal: React.FC = () => {
  const {
    isPlayerOpen,
    closePlayer,
    activeAnime,
    activeEpisode,
    episodeList,
    isPlaying,
    setPlaying,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    playbackSpeed,
    setPlaybackSpeed,
    audioTrack,
    setAudioTrack,
    autoSkipIntro,
    autoSkipOutro,
    skipIntroInterval,
    skipOutroInterval,
    playNextEpisode,
    playPreviousEpisode,
    playEpisode,
  } = usePlayerStore();

  const { user, isAutoScrobbleEnabled, scrobbleEpisode } = useMALStore();
  const { recordWatchProgress } = useAnimeStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [directStreamUrl, setDirectStreamUrl] = useState<string | null>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [isLoadingStream, setIsLoadingStream] = useState(true);
  const [playerMode, setPlayerMode] = useState<'hls' | 'embed'>('hls');
  const [showControls, setShowControls] = useState(true);
  const [showAniSkipIntroPill, setShowAniSkipIntroPill] = useState(false);
  const [showAniSkipOutroPill, setShowAniSkipOutroPill] = useState(false);
  const [scrobbledNotice, setScrobbledNotice] = useState(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTimeState, setCurrentTimeState] = useState(0);
  const [durationState, setDurationState] = useState(1440);

  // Settings
  const [seekStep, setSeekStep] = useState<5 | 10>(10);
  const [selectedQuality, setSelectedQuality] = useState<string>('1080p');
  const [availableQualities, setAvailableQualities] = useState<string[]>(['1080p', '720p', '480p', 'Auto']);

  // Double-tap visual feedback
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<{ side: 'left' | 'right'; show: boolean } | null>(null);

  // Anti-loop state for auto-skip
  const hasAutoSkippedIntroRef = useRef(false);
  const hasAutoSkippedOutroRef = useRef(false);
  const lastTimeRef = useRef(0);
  const clickTimerRef = useRef<any>(null);

  const controlsTimeoutRef = useRef<any>(null);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && playerMode === 'hls' && !showSettingsDrawer && !showEpisodeDrawer) {
        setShowControls(false);
      }
    }, 4500);
  };

  // Reset flags when episode changes
  useEffect(() => {
    hasAutoSkippedIntroRef.current = false;
    hasAutoSkippedOutroRef.current = false;
    lastTimeRef.current = 0;
    setCurrentTimeState(0);
  }, [activeEpisode?.number, activeAnime?.id]);

  // Resolve Real Stream on Episode / Anime change
  useEffect(() => {
    if (!isPlayerOpen || !activeAnime || !activeEpisode) return;

    let isMounted = true;
    setIsLoadingStream(true);

    const title = activeAnime.title?.english || activeAnime.title?.romaji || '';
    const epNum = activeEpisode.number;

    const resolveStream = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).require) {
          const { ipcRenderer } = (window as any).require('electron');
          const result = await ipcRenderer.invoke('resolve-anime-stream', {
            title,
            episodeNumber: epNum,
            audioLanguage: audioTrack === 'dub' ? 'dub' : 'sub',
          });

          if (!isMounted) return;

          if (result?.streamUrl) {
            setDirectStreamUrl(result.streamUrl);
            setEmbedUrl(result.embedUrl || null);
            setPlayerMode('hls');
          } else if (result?.embedUrl) {
            setDirectStreamUrl(null);
            setEmbedUrl(result.embedUrl);
            setPlayerMode('embed');
          } else {
            const fb = `https://vidsrc.me/embed/anime?mal=${activeAnime.malId || activeAnime.id}&ep=${epNum}`;
            setDirectStreamUrl(null);
            setEmbedUrl(fb);
            setPlayerMode('embed');
          }
        } else {
          const fb = `https://vidsrc.me/embed/anime?mal=${activeAnime.malId || activeAnime.id}&ep=${epNum}`;
          setDirectStreamUrl(null);
          setEmbedUrl(fb);
          setPlayerMode('embed');
        }
      } catch (err) {
        console.warn('Stream resolution error:', err);
        const fb = `https://vidsrc.me/embed/anime?mal=${activeAnime.malId || activeAnime.id}&ep=${epNum}`;
        setDirectStreamUrl(null);
        setEmbedUrl(fb);
        setPlayerMode('embed');
      } finally {
        if (isMounted) setIsLoadingStream(false);
      }
    };

    resolveStream();

    return () => {
      isMounted = false;
    };
  }, [activeAnime?.id, activeEpisode?.number, audioTrack, isPlayerOpen]);

  // HLS Stream Attachment
  useEffect(() => {
    if (playerMode !== 'hls' || !directStreamUrl || !videoRef.current) return;

    const video = videoRef.current;

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        startLevel: -1,
      });

      hls.loadSource(directStreamUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hls.levels.map((l) => `${l.height}p`);
        if (levels.length > 0) {
          setAvailableQualities([...Array.from(new Set(levels)), 'Auto']);
        }
        video.play().catch(() => {});
        setPlaying(true);
        setIsLoadingStream(false);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              console.warn('HLS Fatal, fallback to embed');
              setPlayerMode('embed');
              setIsLoadingStream(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = directStreamUrl;
      video.play().catch(() => {});
      setPlaying(true);
      setIsLoadingStream(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [directStreamUrl, playerMode]);

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
    if (video.duration) setDurationState(video.duration);

    const isPlayingForward = now >= lastTimeRef.current;
    lastTimeRef.current = now;

    // AniSkip Opening
    if (skipIntroInterval) {
      const inIntro = now >= skipIntroInterval.startTime && now <= skipIntroInterval.endTime;
      setShowAniSkipIntroPill(inIntro);

      if (inIntro && autoSkipIntro && isPlayingForward && !hasAutoSkippedIntroRef.current) {
        hasAutoSkippedIntroRef.current = true;
        video.currentTime = skipIntroInterval.endTime;
      }
    }

    // AniSkip Ending
    if (skipOutroInterval) {
      const inOutro = now >= skipOutroInterval.startTime && now <= skipOutroInterval.endTime;
      setShowAniSkipOutroPill(inOutro);

      if (inOutro && autoSkipOutro && isPlayingForward && !hasAutoSkippedOutroRef.current) {
        hasAutoSkippedOutroRef.current = true;
        video.currentTime = skipOutroInterval.endTime;
      }
    }

    // Auto-Scrobble at 80%
    if (activeAnime && activeEpisode && video.duration > 0) {
      const pct = (now / video.duration) * 100;
      if (pct >= 80 && !scrobbledNotice && isAutoScrobbleEnabled && user.isLoggedIn) {
        scrobbleEpisode(
          activeAnime.title?.english || activeAnime.title?.romaji || 'Anime',
          activeEpisode.number,
          activeAnime.episodes
        );
        setScrobbledNotice(true);
      }

      recordWatchProgress(
        activeAnime,
        activeEpisode.number,
        activeEpisode.title || `Episode ${activeEpisode.number}`,
        pct,
        now,
        video.duration
      );
    }
  };

  // Touch / Click Area Handler with Phone Double-Tap to Seek
  const handlePlayerAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;

      if (clickX < width * 0.4) {
        seekDelta(-seekStep);
        setDoubleTapFeedback({ side: 'left', show: true });
        setTimeout(() => setDoubleTapFeedback(null), 800);
      } else if (clickX > width * 0.6) {
        seekDelta(seekStep);
        setDoubleTapFeedback({ side: 'right', show: true });
        setTimeout(() => setDoubleTapFeedback(null), 800);
      } else {
        togglePlay();
      }
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        togglePlay();
      }, 280);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    if (!isPlayerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowright':
          e.preventDefault();
          seekDelta(seekStep);
          break;
        case 'arrowleft':
          e.preventDefault();
          seekDelta(-seekStep);
          break;
        case 'n':
          e.preventDefault();
          playNextEpisode();
          break;
        case 'p':
          e.preventDefault();
          playPreviousEpisode();
          break;
        case 'escape':
          closePlayer();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayerOpen, isPlaying, seekStep]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const seekDelta = (seconds: number) => {
    if (!videoRef.current) return;
    const target = Math.max(
      0,
      Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds)
    );
    videoRef.current.currentTime = target;
    setCurrentTimeState(target);
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

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden"
      onMouseMove={resetControlsTimeout}
    >
      {/* Video Container */}
      <div
        onClick={handlePlayerAreaClick}
        className="relative w-full h-full bg-black flex items-center justify-center cursor-pointer"
      >
        <video
          ref={videoRef}
          onTimeUpdate={handleVideoTimeUpdate}
          onLoadedMetadata={(e) => {
            if (e.currentTarget.duration) setDurationState(e.currentTarget.duration);
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className={`w-full h-full object-contain pointer-events-none ${
            playerMode === 'hls' ? 'block' : 'hidden'
          }`}
          playsInline
          autoPlay
        />

        {playerMode === 'embed' && (
          <iframe
            src={embedUrl || `https://vidsrc.me/embed/anime?mal=${activeAnime.malId || activeAnime.id}&ep=${epNum}`}
            title="Craftnime In-App Player"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            className="w-full h-full border-0 bg-black"
          />
        )}

        {/* Loading Overlay */}
        {isLoadingStream && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-3 z-20 pointer-events-none">
            <RefreshCw className="w-8 h-8 text-crafted-brand-rust animate-spin" />
            <p className="text-sm font-mono text-crafted-text-dim">
              Loading 1080p stream for {activeAnime.title?.english || activeAnime.title?.romaji}...
            </p>
          </div>
        )}

        {/* Double-Tap Feedback Animation */}
        {doubleTapFeedback && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center px-6 py-4 rounded-2xl bg-black/70 border border-white/20 text-white font-mono font-bold text-sm backdrop-blur-md animate-in zoom-in-90 duration-200 pointer-events-none ${
              doubleTapFeedback.side === 'left' ? 'left-16' : 'right-16'
            }`}
          >
            {doubleTapFeedback.side === 'left' ? `« ${seekStep}s` : `${seekStep}s »`}
          </div>
        )}
      </div>

      {/* MAL 80% Auto-Scrobble Badge */}
      {scrobbledNotice && (
        <div className="absolute top-20 right-8 z-30 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-crafted-panel/95 border border-crafted-brand-lightViolet/60 text-crafted-text shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-white">MyAnimeList & AniList Synced!</span>
            <p className="text-crafted-text-dim text-[11px]">
              Episode {epNum} scrobbled to your cloud account
            </p>
          </div>
        </div>
      )}

      {/* AniSkip Intro / Outro action buttons */}
      {showAniSkipIntroPill && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (videoRef.current && skipIntroInterval) {
              videoRef.current.currentTime = skipIntroInterval.endTime;
              setCurrentTimeState(skipIntroInterval.endTime);
            }
          }}
          className="absolute bottom-28 right-8 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-crafted-brand-rust text-white font-bold text-xs shadow-crafted-glow hover:brightness-110 cursor-pointer animate-in fade-in"
        >
          <FastForward className="w-4 h-4" />
          <span>Skip Opening</span>
        </button>
      )}

      {showAniSkipOutroPill && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (videoRef.current && skipOutroInterval) {
              videoRef.current.currentTime = skipOutroInterval.endTime;
              setCurrentTimeState(skipOutroInterval.endTime);
            }
          }}
          className="absolute bottom-28 right-8 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-crafted-brand-violet text-white font-bold text-xs shadow-crafted-glow hover:brightness-110 cursor-pointer animate-in fade-in"
        >
          <FastForward className="w-4 h-4" />
          <span>Skip Ending</span>
        </button>
      )}

      {/* Top Header Overlay Bar */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-b from-black/95 via-black/60 to-transparent flex items-center justify-between z-30 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={closePlayer}
            className="p-2 rounded-xl bg-crafted-surface/80 hover:bg-crafted-surface text-crafted-text hover:text-white border border-crafted-border transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white truncate font-serif">
              {activeAnime.title?.english || activeAnime.title?.romaji || 'Anime Playback'}
            </h3>
            <p className="text-xs text-crafted-text-dim truncate font-mono">
              Episode {epNum} • {selectedQuality} • ({audioTrack.toUpperCase()})
            </p>
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Sub / Dub Audio Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-crafted-surface/80 border border-crafted-border">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAudioTrack('sub');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                audioTrack === 'sub'
                  ? 'bg-crafted-brand-rust text-white shadow-crafted-glow'
                  : 'text-crafted-text-dim hover:text-white'
              }`}
            >
              SUB
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAudioTrack('dub');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                audioTrack === 'dub'
                  ? 'bg-crafted-brand-lightViolet text-white shadow-crafted-glow'
                  : 'text-crafted-text-dim hover:text-white'
              }`}
            >
              DUB
            </button>
          </div>

          {/* Quality Switcher */}
          {playerMode === 'hls' && (
            <div className="flex items-center p-1 rounded-xl bg-crafted-surface/80 border border-crafted-border">
              <Tv className="w-3.5 h-3.5 text-crafted-brand-rust ml-1.5 hidden sm:inline" />
              <select
                value={selectedQuality}
                onChange={(e) => {
                  e.stopPropagation();
                  handleQualityChange(e.target.value);
                }}
                className="bg-transparent text-crafted-text text-xs font-mono px-2 py-0.5 focus:outline-none cursor-pointer"
              >
                {availableQualities.map((q) => (
                  <option key={q} value={q} className="bg-crafted-surface text-white">
                    {q}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Player Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-crafted-surface/80 border border-crafted-border">
            <Server className="w-3.5 h-3.5 text-crafted-brand-rust ml-1.5 hidden sm:inline" />
            <select
              value={playerMode}
              onChange={(e) => {
                e.stopPropagation();
                setPlayerMode(e.target.value as any);
              }}
              className="bg-transparent text-crafted-text text-xs font-mono px-2 py-0.5 focus:outline-none cursor-pointer"
            >
              <option value="hls" className="bg-crafted-surface text-white">Direct HLS (Native 1080p)</option>
              <option value="embed" className="bg-crafted-surface text-white">Stream Embed Mirror</option>
            </select>
          </div>

          {/* Settings Drawer Trigger */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSettingsDrawer(!showSettingsDrawer);
            }}
            className="p-2 rounded-xl bg-crafted-surface/80 hover:bg-crafted-surface text-crafted-text hover:text-white border border-crafted-border transition-colors cursor-pointer"
            title="Player Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Episode List Trigger */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEpisodeDrawer(!showEpisodeDrawer);
            }}
            className="p-2 rounded-xl bg-crafted-surface/80 hover:bg-crafted-surface text-crafted-text hover:text-white border border-crafted-border transition-colors cursor-pointer"
            title="Episode Matrix"
          >
            <List className="w-4 h-4" />
          </button>
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
              <label className="text-crafted-text-dim font-mono block">Double-Tap / Arrow Seek Step</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSeekStep(5)}
                  className={`py-2 rounded-lg font-mono font-bold border transition-all cursor-pointer ${
                    seekStep === 5
                      ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust shadow-crafted-glow'
                      : 'bg-crafted-surface text-crafted-text border-crafted-border'
                  }`}
                >
                  5 Seconds
                </button>
                <button
                  onClick={() => setSeekStep(10)}
                  className={`py-2 rounded-lg font-mono font-bold border transition-all cursor-pointer ${
                    seekStep === 10
                      ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust shadow-crafted-glow'
                      : 'bg-crafted-surface text-crafted-text border-crafted-border'
                  }`}
                >
                  10 Seconds
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-crafted-text-dim font-mono block">Default Resolution</label>
              <div className="grid grid-cols-2 gap-2">
                {availableQualities.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQualityChange(q)}
                    className={`py-2 rounded-lg font-mono font-bold border transition-all cursor-pointer ${
                      selectedQuality === q
                        ? 'bg-crafted-brand-lightViolet text-white border-crafted-brand-lightViolet shadow-crafted-glow'
                        : 'bg-crafted-surface text-crafted-text border-crafted-border'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Episode Matrix Drawer */}
      {showEpisodeDrawer && (
        <div className="absolute right-0 top-0 bottom-0 w-80 sm:w-96 bg-crafted-panel/95 border-l border-crafted-border z-40 p-4 flex flex-col backdrop-blur-xl animate-in slide-in-from-right">
          <div className="flex items-center justify-between pb-3 border-b border-crafted-border">
            <h4 className="text-sm font-bold font-serif text-white">Episodes Matrix</h4>
            <button
              onClick={() => setShowEpisodeDrawer(false)}
              className="p-1 text-crafted-text-dim hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {episodeList.map((ep) => (
              <div
                key={ep.id}
                onClick={() => {
                  playEpisode(ep);
                  setShowEpisodeDrawer(false);
                }}
                className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                  activeEpisode?.number === ep.number
                    ? 'bg-crafted-brand-rust/20 border-crafted-brand-rust text-white'
                    : 'bg-crafted-bg/60 border-crafted-border hover:bg-crafted-surface text-crafted-text-muted hover:text-white'
                }`}
              >
                <img
                  src={ep.thumbnail}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-16 aspect-video rounded object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-mono text-crafted-brand-rustLight font-bold">
                    EP {ep.number}
                  </span>
                  <p className="text-xs truncate">{(ep.title || '').replace(/^Episode \d+:\s*/, '')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Controls Bar for Direct HLS Stream */}
      {playerMode === 'hls' && (
        <div
          className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col gap-3 z-30 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Progress Seekbar */}
          <div className="w-full flex items-center gap-3">
            <span className="text-xs font-mono text-crafted-text-dim w-10 text-right">
              {formatTime(currentTimeState)}
            </span>
            <input
              type="range"
              min={0}
              max={durationState || 100}
              value={currentTimeState}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-crafted-brand-rust hover:h-2 transition-all"
            />
            <span className="text-xs font-mono text-crafted-text-dim w-10">
              {formatTime(durationState)}
            </span>
          </div>

          {/* Controls Strip */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="p-2 rounded-xl bg-crafted-button text-white shadow-crafted-glow hover:brightness-110 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  seekDelta(-seekStep);
                }}
                className="p-2 text-crafted-text-dim hover:text-white transition-colors cursor-pointer"
                title={`Rewind ${seekStep}s`}
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  seekDelta(seekStep);
                }}
                className="p-2 text-crafted-text-dim hover:text-white transition-colors cursor-pointer"
                title={`Forward ${seekStep}s`}
              >
                <SkipForward className="w-4 h-4" />
              </button>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 group">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className="p-1.5 text-crafted-text-dim hover:text-white cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (videoRef.current) videoRef.current.volume = v;
                  }}
                  className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-crafted-brand-rust hidden group-hover:block"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Playback Speed Switcher */}
              <select
                value={playbackSpeed}
                onChange={(e) => {
                  e.stopPropagation();
                  const spd = parseFloat(e.target.value);
                  setPlaybackSpeed(spd);
                  if (videoRef.current) videoRef.current.playbackRate = spd;
                }}
                className="bg-crafted-surface text-crafted-text text-xs font-mono px-2 py-1 rounded-lg border border-crafted-border focus:outline-none cursor-pointer"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1.0x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2.0x</option>
              </select>

              {/* Fullscreen Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="p-2 rounded-xl bg-crafted-surface hover:bg-crafted-surface-hover text-crafted-text hover:text-white border border-crafted-border transition-colors cursor-pointer"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
