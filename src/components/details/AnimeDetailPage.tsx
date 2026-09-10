import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  Plus,
  Check,
  Star,
  Sparkles,
  Search,
  ArrowRight,
  GitBranch,
  Compass,
  CheckCircle2,
  Loader2,
  Calendar,
  Lock,
  Zap,
} from 'lucide-react';
import { useAnimeStore } from '../../store/useAnimeStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useMALStore } from '../../store/useMALStore';
import { useWatchedStore } from '../../store/useWatchedStore';
import { AniListService } from '../../services/anilist';
import { AniZipService, AniZipEpisode } from '../../services/aniZip';
import { KitsuService } from '../../services/kitsu';
import { Badge } from '../common/Badge';
import { AnimeEpisode, AnimeRelation } from '../../types/anime';

type TabType = 'episodes' | 'characters' | 'relations' | 'overview';

export const AnimeDetailPage: React.FC = () => {
  const {
    selectedAnime,
    detailedAnimeInfo,
    setSelectedAnime,
    toggleWatchlist,
    isInWatchlist,
    setActiveNavTab,
  } = useAnimeStore();
  const { openPlayer, openStreamSelector } = usePlayerStore();
  const { syncedWatchingList } = useMALStore();
  const { isEpisodeWatched, toggleWatchedEpisode, markSeasonWatched, unmarkSeasonWatched } = useWatchedStore();

  const [activeTab, setActiveTab] = useState<TabType>('episodes');
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [audioPreference, setAudioPreference] = useState<'sub' | 'dub'>('sub');
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [jumpInput, setJumpInput] = useState('');
  const [extraEpisodes, setExtraEpisodes] = useState<AniZipEpisode[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(true);
  const [fallbackRelations, setFallbackRelations] = useState<AnimeRelation[]>([]);

  const anime = detailedAnimeInfo || selectedAnime;

  // Always scroll to top & reset chunk pagination when anime changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setActiveChunkIndex(0);
    setEpisodeSearch('');
    setActiveTab('episodes');
    setExtraEpisodes([]);
    setFallbackRelations([]);
    setIsLoadingEpisodes(true);

    if (anime) {
      const anilistId = anime.id;
      const malId = anime.malId;
      const titleStr =
        typeof anime.title === 'object'
          ? anime.title?.english || anime.title?.romaji || anime.title?.userPreferred || ''
          : String(anime.title || '');

      // Fetch from AniZip first (global TVDB/AniDB episode metadata and screencaps)
      AniZipService.getEpisodes(anilistId, malId)
        .then(async (eps) => {
          if (eps && eps.length > 0) {
            setExtraEpisodes(eps);
            setIsLoadingEpisodes(false);
          } else if (titleStr) {
            // Fallback to Kitsu
            const kitsuEps = await KitsuService.getEpisodesForAnime(titleStr);
            if (kitsuEps && kitsuEps.length > 0) {
              setExtraEpisodes(kitsuEps);
            }
            setIsLoadingEpisodes(false);
          } else {
            setIsLoadingEpisodes(false);
          }
        })
        .catch(() => {
          setIsLoadingEpisodes(false);
        });

      // If anime.relations is missing or empty, fetch relations from Kitsu
      if (!anime.relations || anime.relations.length === 0) {
        KitsuService.getRelationsForAnime(titleStr)
          .then((rels) => {
            if (rels && rels.length > 0) {
              setFallbackRelations(rels);
            }
          })
          .catch(() => {});
      }
    } else {
      setIsLoadingEpisodes(false);
    }
  }, [anime?.id]);

  const episodes: AnimeEpisode[] = useMemo(() => {
    if (!anime) return [];
    try {
      return AniListService.generateEpisodes(anime, extraEpisodes);
    } catch {
      return [];
    }
  }, [anime, extraEpisodes]);

  const CHUNK_SIZE = 50;
  const totalChunks = Math.max(1, Math.ceil(episodes.length / CHUNK_SIZE));

  const displayedEpisodes = useMemo(() => {
    if (episodeSearch.trim()) {
      const q = episodeSearch.toLowerCase().trim();
      return episodes.filter(
        (ep) =>
          String(ep.number).includes(q) ||
          (ep.title || '').toLowerCase().includes(q) ||
          (ep.description || '').toLowerCase().includes(q)
      );
    }
    const safeChunk = activeChunkIndex >= totalChunks ? 0 : activeChunkIndex;
    const start = safeChunk * CHUNK_SIZE;
    return episodes.slice(start, start + CHUNK_SIZE);
  }, [episodes, activeChunkIndex, totalChunks, episodeSearch]);

  if (!anime) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-32 pb-20 text-center space-y-4">
        <p className="text-crafted-text-dim">No anime selected.</p>
        <button
          onClick={() => setActiveNavTab('home')}
          className="px-4 py-2 rounded-xl bg-crafted-brand-rust text-white text-xs font-semibold cursor-pointer"
        >
          Return Home
        </button>
      </div>
    );
  }

  const inWatchlist = isInWatchlist(anime.id);

  // Compute resume target episode from MAL / local history
  const resumeEpisodeNumber = useMemo(() => {
    // 1. Check first unwatched AIRED episode in store (highest priority)
    for (let i = 1; i <= episodes.length; i++) {
      const ep = episodes[i - 1];
      if (ep && ep.isAired !== false && !isEpisodeWatched(anime.id, i, anime.malId)) {
        return i;
      }
    }

    const continueList: any[] = JSON.parse(
      localStorage.getItem('craftnime_continue_watching_v1') || '[]'
    );
    const localItem = continueList.find((i) => i.id === anime.id || i.malId === anime.id);
    if (localItem?.lastWatchedEpisodeNumber) {
      return localItem.lastWatchedEpisodeNumber;
    }

    const malItem = syncedWatchingList.find(
      (i) => i.id === anime.id || (anime.malId && i.malId === anime.malId)
    );
    if (malItem?.description) {
      const match =
        malItem.description.match(/Watched:\s*(\d+)/i) ||
        malItem.description.match(/Progress:\s*(\d+)/i);
      if (match && match[1]) {
        const watched = parseInt(match[1], 10);
        return Math.min(watched + 1, episodes.length || 1);
      }
    }

    return 1;
  }, [anime.id, anime.malId, syncedWatchingList, episodes, isEpisodeWatched]);

  const bannerImg =
    anime.bannerImage ||
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    'https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-37yfQA3ym8PA.jpg';

  const coverImg =
    anime.coverImage?.large ||
    anime.coverImage?.extraLarge ||
    anime.coverImage?.medium ||
    bannerImg;

  const titleString =
    typeof anime.title === 'object'
      ? anime.title?.english || anime.title?.romaji || anime.title?.userPreferred || 'Anime'
      : String(anime.title || 'Anime');

  const genresList = Array.isArray(anime.genres) ? anime.genres : [];
  const studiosList = Array.isArray(anime.studios) ? anime.studios : [];
  const charactersList = Array.isArray(anime.characters) ? anime.characters : [];
  const relationsList =
    Array.isArray(anime.relations) && anime.relations.length > 0
      ? anime.relations
      : fallbackRelations;

  // Group relations for Watch Order Tree
  const prequels = relationsList.filter((r) => r.type === 'PREQUEL');
  const sequels = relationsList.filter((r) => r.type === 'SEQUEL');
  const sideStories = relationsList.filter(
    (r) => r.type === 'SIDE_STORY' || r.type === 'SPIN_OFF' || r.type === 'SUMMARY'
  );
  const otherRelations = relationsList.filter(
    (r) => r.type !== 'PREQUEL' && r.type !== 'SEQUEL' && r.type !== 'SIDE_STORY' && r.type !== 'SPIN_OFF' && r.type !== 'SUMMARY'
  );

  const handleJumpToEpisode = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpInput.trim(), 10);
    if (!isNaN(target) && target >= 1 && target <= episodes.length) {
      const chunk = Math.floor((target - 1) / CHUNK_SIZE);
      setActiveChunkIndex(chunk);
      setEpisodeSearch(String(target));
      setJumpInput('');
    }
  };

  const handleBack = () => {
    setSelectedAnime(null);
    setActiveNavTab('home');
  };

  const navigateToRelation = async (rel: AnimeRelation) => {
    const targetAnime: any = {
      id: rel.id,
      malId: (rel as any).malId || rel.id,
      title: rel.title,
      coverImage: rel.coverImage,
      format: rel.format || 'TV',
      status: rel.status || 'FINISHED',
      episodes: (rel as any).episodes || 12,
      genres: ['Animation'],
      description: `Franchise ${rel.type || 'Media'}: ${
        rel.title?.english || rel.title?.romaji || 'Anime'
      }`,
    };
    await setSelectedAnime(targetAnime);
  };

  return (
    <div className="min-h-screen bg-crafted-bg text-crafted-text pt-20 pb-24">
      {/* Hero Backdrop Header */}
      <div className="relative w-full h-80 sm:h-96 md:h-[460px] overflow-hidden bg-crafted-panel">
        <img
          src={bannerImg}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-50 filter saturate-125"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-crafted-bg via-crafted-bg/60 to-transparent" />

        {/* Fixed Floating Strict Back Navigation Bar across long scrolls */}
      <div className="fixed top-20 left-4 sm:left-8 z-40">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/80 hover:bg-crafted-brand-rust text-white text-xs font-mono font-bold backdrop-blur-xl border border-white/15 shadow-2xl transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Browse</span>
        </button>
      </div>

        {/* Hero Info Overlay */}
        <div className="absolute bottom-6 left-4 right-4 sm:left-8 sm:right-8 max-w-7xl mx-auto flex items-end gap-6">
          <img
            src={coverImg}
            alt=""
            referrerPolicy="no-referrer"
            className="w-28 sm:w-44 md:w-52 aspect-[2/3] object-cover rounded-2xl border-2 border-crafted-border shadow-2xl shrink-0 hidden xs:block"
          />

          <div className="space-y-3 max-w-3xl flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="rust" size="sm">
                {anime.format || 'TV'}
              </Badge>
              <Badge variant="violet" size="sm">
                {anime.status || 'RELEASING'}
              </Badge>
              <Badge variant="emerald" size="sm">
                SUB & DUB
              </Badge>
              <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-300 bg-black/60 px-2.5 py-1 rounded-lg border border-white/10">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{((anime.averageScore || 88) / 10).toFixed(1)} / 10</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold font-serif text-white leading-tight drop-shadow-2xl">
              {titleString}
            </h1>

            {anime.title?.native && (
              <p className="text-xs sm:text-sm text-crafted-text-dim">
                {anime.title.native} • {studiosList.join(', ') || 'Animation Studio'}
              </p>
            )}

            {/* Quick Actions with Smart Resume Label */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button
                onClick={() => {
                  const targetEp = episodes.find((e) => e.number === resumeEpisodeNumber) || episodes[0];
                  if (targetEp && targetEp.isAired !== false) {
                    openPlayer(anime, targetEp);
                  }
                }}
                className="px-6 py-3 rounded-xl bg-crafted-button text-white font-bold text-sm flex items-center gap-2 shadow-crafted-glow hover:brightness-110 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>
                  {resumeEpisodeNumber > 1 ? `Continue Ep ${resumeEpisodeNumber}` : 'Watch Episode 1'}
                </span>
              </button>

              <button
                onClick={() => {
                  const targetEp = episodes.find((e) => e.number === resumeEpisodeNumber) || episodes[0];
                  if (targetEp && targetEp.isAired !== false) {
                    openStreamSelector(anime, targetEp);
                  }
                }}
                className="px-4 py-3 rounded-xl bg-crafted-panel hover:bg-crafted-surface text-white text-xs font-mono font-bold flex items-center gap-2 border border-crafted-border hover:border-crafted-brand-rust transition-all cursor-pointer"
                title="Choose from all available torrent streams (sorted by seeders)"
              >
                <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                <span>Select Stream</span>
              </button>

              <button
                onClick={() => toggleWatchlist(anime)}
                className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  inWatchlist
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-black/60 hover:bg-black/80 text-white border-white/10'
                }`}
              >
                {inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-crafted-border overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('episodes')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'episodes'
                ? 'border-crafted-brand-rust text-crafted-brand-rustLight bg-crafted-surface/80'
                : 'border-transparent text-crafted-text-dim hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Episodes Matrix ({episodes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('relations')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'relations'
                ? 'border-crafted-brand-rust text-crafted-brand-rustLight bg-crafted-surface/80'
                : 'border-transparent text-crafted-text-dim hover:text-white'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>Franchise Chronology & Watch Order ({relationsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('characters')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'characters'
                ? 'border-crafted-brand-rust text-crafted-brand-rustLight bg-crafted-surface/80'
                : 'border-transparent text-crafted-text-dim hover:text-white'
            }`}
          >
            <span>Characters & Cast</span>
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-crafted-brand-rust text-crafted-brand-rustLight bg-crafted-surface/80'
                : 'border-transparent text-crafted-text-dim hover:text-white'
            }`}
          >
            <span>Overview & Media</span>
          </button>
        </div>

        {/* TAB 1: EPISODES MATRIX */}
        {activeTab === 'episodes' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap bg-crafted-panel/60 p-4 rounded-2xl border border-crafted-border">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-crafted-brand-rust absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={episodeSearch}
                  onChange={(e) => setEpisodeSearch(e.target.value)}
                  placeholder="Search episode title or number..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-crafted-bg border border-crafted-border text-crafted-text placeholder:text-crafted-text-dim focus:outline-none focus:border-crafted-brand-rust"
                />
              </div>

              {/* Mark Season Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => markSeasonWatched(anime.id, episodes.length, anime.malId)}
                  className="px-3 py-1.5 rounded-xl bg-crafted-surface hover:bg-crafted-surface-hover text-crafted-text text-xs font-mono border border-crafted-border flex items-center gap-1.5 cursor-pointer"
                  title="Mark all episodes as watched"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mark All Watched</span>
                </button>
                <button
                  onClick={() => unmarkSeasonWatched(anime.id, episodes.length, anime.malId)}
                  className="px-3 py-1.5 rounded-xl bg-crafted-surface hover:bg-crafted-surface-hover text-crafted-text-dim hover:text-white text-xs font-mono border border-crafted-border cursor-pointer"
                  title="Reset watched state for all episodes"
                >
                  Reset
                </button>
              </div>

              {/* Sub / Dub Preference */}
              <div className="flex items-center p-1 rounded-xl bg-crafted-bg border border-crafted-border">
                <button
                  onClick={() => setAudioPreference('sub')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    audioPreference === 'sub'
                      ? 'bg-crafted-brand-rust text-white shadow-crafted-glow'
                      : 'text-crafted-text-dim hover:text-white'
                  }`}
                >
                  SUB (JP)
                </button>
                <button
                  onClick={() => setAudioPreference('dub')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    audioPreference === 'dub'
                      ? 'bg-crafted-brand-lightViolet text-white shadow-crafted-glow'
                      : 'text-crafted-text-dim hover:text-white'
                  }`}
                >
                  DUB (EN)
                </button>
              </div>

              {/* Jump to Ep */}
              <form onSubmit={handleJumpToEpisode} className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={episodes.length || 1}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  placeholder={`Jump (1-${episodes.length})`}
                  className="w-28 px-3 py-2 text-xs rounded-xl bg-crafted-bg border border-crafted-border text-crafted-text font-mono placeholder:text-crafted-text-dim focus:outline-none focus:border-crafted-brand-rust"
                />
                <button
                  type="submit"
                  className="p-2 rounded-xl bg-crafted-surface hover:bg-crafted-surface-hover text-crafted-brand-rust border border-crafted-border cursor-pointer"
                  title="Jump to Episode"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Chunk Range Switcher for Long Anime */}
            {totalChunks > 1 && !episodeSearch && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                {Array.from({ length: totalChunks }).map((_, idx) => {
                  const startEp = idx * CHUNK_SIZE + 1;
                  const endEp = Math.min((idx + 1) * CHUNK_SIZE, episodes.length);
                  const isActive = activeChunkIndex === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveChunkIndex(idx)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'bg-crafted-brand-rust text-white shadow-crafted-glow'
                          : 'bg-crafted-surface hover:bg-crafted-surface-hover text-crafted-text-dim hover:text-white border border-crafted-border'
                      }`}
                    >
                      {startEp} - {endEp}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Episode Matrix Content or Smooth Loading Skeleton */}
            {isLoadingEpisodes ? (
              <div className="py-16 text-center space-y-3 bg-crafted-panel/40 rounded-2xl border border-crafted-border">
                <Loader2 className="w-8 h-8 text-crafted-brand-rustLight animate-spin mx-auto" />
                <p className="text-xs font-mono text-crafted-text-dim">
                  Synchronizing high-resolution episode titles & screencaps...
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedEpisodes.length === 0 ? (
                  <p className="text-center text-xs text-crafted-text-dim py-12">
                    No episodes found matching "{episodeSearch}"
                  </p>
                ) : (
                  displayedEpisodes.map((ep) => {
                    const isWatched = isEpisodeWatched(anime.id, ep.number, anime.malId);
                    const isAired = ep.isAired !== false;

                    return (
                      <div
                        key={ep.id}
                        onClick={() => {
                          if (isAired) openStreamSelector(anime, ep);
                        }}
                        className={`group flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-crafted-panel/50 border transition-all duration-200 shadow-crafted-card ${
                          !isAired
                            ? 'opacity-50 border-crafted-border/60 cursor-not-allowed'
                            : isWatched
                            ? 'border-emerald-500/30 opacity-100 hover:bg-crafted-surface cursor-pointer'
                            : 'border-crafted-border opacity-75 hover:opacity-100 hover:border-crafted-brand-rust hover:bg-crafted-surface cursor-pointer'
                        }`}
                      >
                        {/* Left Thumbnail */}
                        <div className="relative aspect-video w-32 sm:w-44 rounded-xl overflow-hidden shrink-0 bg-crafted-bg">
                          <img
                            src={ep.thumbnail || coverImg}
                            alt=""
                            referrerPolicy="no-referrer"
                            className={`w-full h-full object-cover transition-transform ${
                              isAired ? 'group-hover:scale-105' : 'filter grayscale contrast-75'
                            }`}
                          />
                          <div className="absolute inset-0 bg-black/25 group-hover:bg-transparent transition-colors" />
                          <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/80 font-mono text-[10px] text-white">
                            {ep.duration || '24m'}
                          </span>

                          {/* Quick Play Button (Plays top seeder stream directly) */}
                          {isAired ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openPlayer(anime, ep);
                              }}
                              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Instant Play with Top Seeders"
                            >
                              <div className="w-10 h-10 rounded-full bg-crafted-brand-rust flex items-center justify-center text-white shadow-crafted-glow hover:scale-110 transition-transform">
                                <Play className="w-4 h-4 fill-white ml-0.5" />
                              </div>
                            </button>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <div className="p-2 rounded-full bg-black/70 text-amber-400 border border-white/10">
                                <Lock className="w-4 h-4" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Center Details */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold border ${
                              !isAired
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : isWatched
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-crafted-brand-rust/25 text-crafted-brand-rustLight border-crafted-brand-rust/40'
                            }`}>
                              EPISODE {ep.number}
                            </span>

                            {isWatched && isAired && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                <span>WATCHED</span>
                              </span>
                            )}

                            {!isAired ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  {ep.releaseDateFormatted ? `Airs ${ep.releaseDateFormatted}` : 'Unreleased'}
                                </span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                {audioPreference.toUpperCase()} 1080p
                              </span>
                            )}
                          </div>

                          <h3 className={`text-sm sm:text-base font-semibold truncate transition-colors ${
                            isAired ? 'text-white group-hover:text-crafted-brand-rustLight' : 'text-crafted-text-dim'
                          }`}>
                            {(ep.title || `Episode ${ep.number}`).replace(/^Episode \d+:\s*/, '')}
                          </h3>

                          <p className="text-xs text-crafted-text-muted line-clamp-1 sm:line-clamp-2">
                            {!isAired
                              ? `This episode has not aired yet. Broadcast estimated: ${ep.releaseDateFormatted || 'Upcoming'}.`
                              : ep.description || 'Watch full episode in high-definition stream.'}
                          </p>
                        </div>

                        {/* Right Watch & Mark Watched Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isAired ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWatchedEpisode(anime.id, ep.number, anime.malId);
                                }}
                                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                  isWatched
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-crafted-surface hover:bg-crafted-surface-hover text-crafted-text-dim hover:text-white border-crafted-border'
                                }`}
                                title={isWatched ? 'Unmark as Watched' : 'Mark as Watched'}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openStreamSelector(anime, ep);
                                }}
                                className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-crafted-surface group-hover:bg-crafted-brand-rust text-crafted-text group-hover:text-white border border-crafted-border text-xs font-bold transition-all shadow-crafted-glow cursor-pointer"
                                title="Pick Stream (Torrentio)"
                              >
                                <Zap className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white fill-current" />
                                <span>Streams</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5" />
                              <span>Upcoming</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FRANCHISE CHRONOLOGY & WATCH ORDER FLOWCHART */}
        {activeTab === 'relations' && (
          <div className="space-y-8">
            <div className="bg-crafted-surface/50 p-6 rounded-2xl border border-crafted-border space-y-2">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-crafted-brand-rustLight" />
                <h3 className="text-base font-bold font-serif text-white">
                  Franchise Chronology & Complete Watch Order
                </h3>
              </div>
              <p className="text-xs text-crafted-text-dim">
                Interactive watch order tree. Click on any prequel, sequel, movie, or spin-off to instantly navigate to its dedicated episode matrix and stream it.
              </p>
            </div>

            {/* 3-Column Visual Flowchart Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: Prequels */}
              <div className="bg-crafted-surface/40 rounded-2xl border border-crafted-border p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-crafted-border">
                  <span className="text-xs font-mono font-bold uppercase text-crafted-brand-rustLight flex items-center gap-1.5">
                    <span>1. Prequels (Past)</span>
                  </span>
                  <Badge variant="rust" size="xs">
                    {prequels.length}
                  </Badge>
                </div>

                {prequels.length === 0 ? (
                  <p className="text-xs text-crafted-text-dim py-8 text-center">
                    No earlier prequels. This is the origin story.
                  </p>
                ) : (
                  prequels.map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => navigateToRelation(rel)}
                      className="group flex items-center gap-3 p-2.5 rounded-xl bg-crafted-panel hover:bg-crafted-surface border border-crafted-border hover:border-crafted-brand-rust transition-all cursor-pointer"
                    >
                      <img
                        src={rel.coverImage?.large || coverImg}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-12 aspect-[2/3] object-cover rounded-lg shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <span className="text-[10px] font-mono text-crafted-brand-rustLight font-bold block">
                          PREQUEL
                        </span>
                        <h4 className="text-xs font-semibold text-white truncate group-hover:text-crafted-brand-rustLight transition-colors">
                          {rel.title?.english || rel.title?.romaji || 'Prequel Anime'}
                        </h4>
                        <span className="text-[10px] font-mono text-crafted-text-dim">
                          {rel.format || 'TV'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Column 2: Current Season (Active) */}
              <div className="bg-crafted-surface/70 rounded-2xl border-2 border-crafted-brand-rust p-4 space-y-3 shadow-crafted-glow">
                <div className="flex items-center justify-between pb-2 border-b border-crafted-border">
                  <span className="text-xs font-mono font-bold uppercase text-white flex items-center gap-1.5">
                    <span>2. Currently Viewing</span>
                  </span>
                  <Badge variant="emerald" size="xs">
                    ACTIVE
                  </Badge>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-crafted-bg border border-crafted-border">
                  <img
                    src={coverImg}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-14 aspect-[2/3] object-cover rounded-lg shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                      CURRENT SEASON
                    </span>
                    <h4 className="text-xs font-bold text-white truncate">
                      {titleString}
                    </h4>
                    <span className="text-[10px] font-mono text-crafted-text-dim">
                      {anime.format || 'TV'} • {episodes.length} Episodes
                    </span>
                  </div>
                </div>
              </div>

              {/* Column 3: Sequels */}
              <div className="bg-crafted-surface/40 rounded-2xl border border-crafted-border p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-crafted-border">
                  <span className="text-xs font-mono font-bold uppercase text-crafted-brand-lightViolet flex items-center gap-1.5">
                    <span>3. Sequels (Future)</span>
                  </span>
                  <Badge variant="violet" size="xs">
                    {sequels.length}
                  </Badge>
                </div>

                {sequels.length === 0 ? (
                  <p className="text-xs text-crafted-text-dim py-8 text-center">
                    No direct sequels released yet.
                  </p>
                ) : (
                  sequels.map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => navigateToRelation(rel)}
                      className="group flex items-center gap-3 p-2.5 rounded-xl bg-crafted-panel hover:bg-crafted-surface border border-crafted-border hover:border-crafted-brand-lightViolet transition-all cursor-pointer"
                    >
                      <img
                        src={rel.coverImage?.large || coverImg}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-12 aspect-[2/3] object-cover rounded-lg shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <span className="text-[10px] font-mono text-crafted-brand-lightViolet font-bold block">
                          SEQUEL
                        </span>
                        <h4 className="text-xs font-semibold text-white truncate group-hover:text-crafted-brand-lightViolet transition-colors">
                          {rel.title?.english || rel.title?.romaji || 'Sequel Anime'}
                        </h4>
                        <span className="text-[10px] font-mono text-crafted-text-dim">
                          {rel.format || 'TV'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Side Stories, OVAs & Movies Grid */}
            {(sideStories.length > 0 || otherRelations.length > 0) && (
              <div className="bg-crafted-surface/30 p-6 rounded-2xl border border-crafted-border space-y-4">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold font-serif text-white">
                    Side Stories, Movies, OVAs & Specials ({sideStories.length + otherRelations.length})
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...sideStories, ...otherRelations].map((rel) => (
                    <div
                      key={rel.id}
                      onClick={() => navigateToRelation(rel)}
                      className="group flex items-center gap-3 p-2.5 rounded-xl bg-crafted-surface hover:bg-crafted-panel border border-crafted-border hover:border-amber-400/50 transition-all cursor-pointer"
                    >
                      <img
                        src={rel.coverImage?.large || coverImg}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-10 aspect-[2/3] object-cover rounded-md shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <span className="text-[9px] font-mono text-amber-400 font-bold uppercase block">
                          {rel.type || 'SIDE STORY'}
                        </span>
                        <h5 className="text-xs font-semibold text-white truncate group-hover:text-amber-300 transition-colors">
                          {rel.title?.english || rel.title?.romaji || 'Related Work'}
                        </h5>
                        <span className="text-[10px] font-mono text-crafted-text-dim">
                          {rel.format || 'OVA'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CHARACTERS & CAST */}
        {activeTab === 'characters' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {charactersList.length === 0 ? (
              <p className="text-center text-xs text-crafted-text-dim py-12 col-span-full">
                No character profiles available for this title.
              </p>
            ) : (
              charactersList.map((char) => (
                <div
                  key={char.id}
                  className="flex items-center gap-3.5 p-3 rounded-2xl bg-crafted-surface/50 border border-crafted-border"
                >
                  <img
                    src={typeof char.image === 'string' ? char.image : char.image?.large || coverImg}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-14 h-14 rounded-xl object-cover border border-crafted-border shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <h4 className="text-xs font-bold text-white truncate">
                      {typeof char.name === 'string' ? char.name : char.name?.full || 'Character'}
                    </h4>
                    <span className="text-[10px] font-mono text-crafted-brand-rustLight block">
                      {char.role}
                    </span>
                    {char.voiceActor && (
                      <p className="text-[10px] text-crafted-text-dim truncate">
                        VA: {char.voiceActor.name}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: OVERVIEW & MEDIA */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-crafted-surface/40 p-6 rounded-2xl border border-crafted-border space-y-3">
              <h3 className="text-sm font-bold font-serif text-white">Synopsis & Storyline</h3>
              <p className="text-xs text-crafted-text-muted leading-relaxed whitespace-pre-line">
                {anime.description || 'No description available.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-crafted-panel border border-crafted-border space-y-1">
                <span className="text-[10px] font-mono text-crafted-text-dim uppercase">Format</span>
                <p className="text-xs font-bold text-white">{anime.format || 'TV'}</p>
              </div>
              <div className="p-4 rounded-xl bg-crafted-panel border border-crafted-border space-y-1">
                <span className="text-[10px] font-mono text-crafted-text-dim uppercase">Episodes</span>
                <p className="text-xs font-bold text-white">{anime.episodes || 'Releasing'}</p>
              </div>
              <div className="p-4 rounded-xl bg-crafted-panel border border-crafted-border space-y-1">
                <span className="text-[10px] font-mono text-crafted-text-dim uppercase">Season</span>
                <p className="text-xs font-bold text-white">{anime.season} {anime.seasonYear}</p>
              </div>
              <div className="p-4 rounded-xl bg-crafted-panel border border-crafted-border space-y-1">
                <span className="text-[10px] font-mono text-crafted-text-dim uppercase">Genres</span>
                <p className="text-xs font-bold text-white truncate">{genresList.join(', ') || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
