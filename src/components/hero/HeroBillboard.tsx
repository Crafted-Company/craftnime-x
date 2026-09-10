import React, { useEffect, useState } from 'react';
import { Play, Plus, Check, Info, ChevronRight, ChevronLeft, Star, Sparkles } from 'lucide-react';
import { useAnimeStore } from '../../store/useAnimeStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Badge } from '../common/Badge';

export const HeroBillboard: React.FC = () => {
  const {
    featuredBillboard,
    currentBillboardIndex,
    setCurrentBillboardIndex,
    nextBillboard,
    prevBillboard,
    setSelectedAnime,
    toggleWatchlist,
    isInWatchlist,
  } = useAnimeStore();

  const { openPlayer } = usePlayerStore();
  const [bgFailed, setBgFailed] = useState(false);

  const currentAnime = (featuredBillboard && featuredBillboard.length > 0)
    ? (featuredBillboard[currentBillboardIndex] || featuredBillboard[0])
    : null;

  // Auto-advance billboard every 15 seconds
  useEffect(() => {
    if (!featuredBillboard || featuredBillboard.length === 0) return;
    const interval = setInterval(() => {
      nextBillboard();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentBillboardIndex, featuredBillboard]);

  useEffect(() => {
    setBgFailed(false);
  }, [currentBillboardIndex]);

  if (!currentAnime) {
    return (
      <div className="w-full h-[65vh] min-h-[480px] bg-crafted-panel flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-crafted-brand-rust border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const inWatchlist = isInWatchlist(currentAnime.id);

  const bannerImg =
    currentAnime.bannerImage ||
    currentAnime.coverImage?.extraLarge ||
    currentAnime.coverImage?.large ||
    'https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37yfQA3ym8PA.jpg';

  const epDisplay = currentAnime.episodes
    ? `${currentAnime.episodes} Episodes`
    : currentAnime.nextAiringEpisode
    ? `Ep ${currentAnime.nextAiringEpisode.episode - 1} Airing`
    : '12 Episodes';

  const titleStr =
    typeof currentAnime.title === 'object'
      ? currentAnime.title?.english || currentAnime.title?.romaji || currentAnime.title?.userPreferred || 'Anime'
      : currentAnime.title || 'Anime';

  const genresList = Array.isArray(currentAnime.genres) ? currentAnime.genres : [];
  const studiosList = Array.isArray(currentAnime.studios) ? currentAnime.studios : [];

  return (
    <div className="relative w-full h-[65vh] min-h-[480px] max-h-[640px] overflow-hidden bg-crafted-bg select-none group">
      {/* Background Keyart Image */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-crafted-panel">
        {!bgFailed ? (
          <img
            key={currentAnime.id}
            src={bannerImg}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setBgFailed(true)}
            className="w-full h-full object-cover object-top opacity-75 transition-all duration-700 scale-100"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-crafted-panel via-crafted-surface to-crafted-bg" />
        )}
      </div>

      {/* Cinematic Vignette Overlays */}
      <div className="absolute inset-0 z-10 hero-vignette-bottom" />
      <div className="absolute inset-0 z-10 hero-vignette-left" />
      <div className="absolute inset-0 z-10 hero-vignette-top" />

      {/* Arrow Navigation Controls */}
      <button
        onClick={prevBillboard}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/50 hover:bg-crafted-brand-rust text-white/80 hover:text-white backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 hover:scale-110 shadow-2xl cursor-pointer"
        title="Previous Anime"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      <button
        onClick={nextBillboard}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/50 hover:bg-crafted-brand-rust text-white/80 hover:text-white backdrop-blur-md border border-white/10 transition-all opacity-0 group-hover:opacity-100 hover:scale-110 shadow-2xl cursor-pointer"
        title="Next Anime"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Main Billboard Content */}
      <div className="relative z-20 max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-8 pt-20">
        <div className="max-w-2xl space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
          {/* Spotlight Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-crafted-brand-rust text-white shadow-crafted-glow">
              <Sparkles className="w-3.5 h-3.5 fill-white" />
              SPOTLIGHT
            </span>
            <Badge variant="violet" size="sm">
              {currentAnime.season || 'SEASON'} {currentAnime.seasonYear || 2024}
            </Badge>
            <Badge variant="surface" size="sm">
              {currentAnime.format || 'TV'}
            </Badge>
            <Badge variant="emerald" size="sm">
              SUB & DUB
            </Badge>
          </div>

          {/* Title */}
          <div className="space-y-0.5">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white font-serif leading-[1.05] drop-shadow-2xl">
              {titleStr}
            </h1>
            {currentAnime.title?.native && (
              <p className="text-xs sm:text-sm font-sans text-crafted-text-dim tracking-wider">
                {currentAnime.title.native} • {studiosList.join(', ') || 'Animation Studio'}
              </p>
            )}
          </div>

          {/* Rating & Metadata Strip */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-mono text-crafted-text-muted flex-wrap">
            <div className="flex items-center gap-1 text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{((currentAnime.averageScore || 88) / 10).toFixed(1)} / 10</span>
            </div>
            <span className="hidden xs:inline">•</span>
            <span className="text-crafted-text font-medium shrink-0">{epDisplay}</span>
            <span className="hidden xs:inline">•</span>
            <span className="text-crafted-text-dim max-w-full truncate">
              {genresList.slice(0, 3).join(' / ')}
            </span>
          </div>

          {/* Tagline & Synopsis */}
          {currentAnime.tagline && (
            <p className="text-xs sm:text-sm font-semibold text-crafted-brand-rustLight italic font-serif">
              "{currentAnime.tagline}"
            </p>
          )}
          <p className="text-xs sm:text-sm text-crafted-text-muted line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-xl">
            {currentAnime.description}
          </p>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            <button
              onClick={() => openPlayer(currentAnime)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-crafted-button text-white font-bold text-xs sm:text-sm shadow-crafted-glow hover:scale-[1.02] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Watch Episode 1</span>
            </button>

            <button
              onClick={() => toggleWatchlist(currentAnime)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-xs transition-all cursor-pointer ${
                inWatchlist
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-crafted-surface/80 hover:bg-crafted-surface text-crafted-text border-crafted-border hover:border-crafted-border-bright'
              }`}
            >
              {inWatchlist ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>In Watchlist</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-crafted-brand-rust" />
                  <span>Add to List</span>
                </>
              )}
            </button>

            <button
              onClick={() => setSelectedAnime(currentAnime)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-crafted-panel/80 hover:bg-crafted-surface text-crafted-text border border-crafted-border hover:border-crafted-brand-violet/50 font-semibold text-xs transition-all cursor-pointer"
            >
              <Info className="w-4 h-4 text-crafted-brand-lightViolet" />
              <span>Details & Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Slide Dots */}
      <div className="absolute bottom-4 right-8 z-30 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
        {featuredBillboard.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => setCurrentBillboardIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
              idx === currentBillboardIndex
                ? 'w-6 bg-crafted-brand-rust shadow-crafted-glow'
                : 'w-2 bg-white/30 hover:bg-white/60'
            }`}
            title={item.title?.english || item.title?.romaji || 'Anime'}
          />
        ))}
      </div>
    </div>
  );
};
