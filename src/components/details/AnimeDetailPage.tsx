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
} from 'lucide-react';
import { useAnimeStore } from '../../store/useAnimeStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useMALStore } from '../../store/useMALStore';
import { AniListService } from '../../services/anilist';
import { Badge } from '../common/Badge';
import { AnimeEpisode } from '../../types/anime';

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
  const { openPlayer } = usePlayerStore();
  const { syncedWatchingList } = useMALStore();

  const [activeTab, setActiveTab] = useState<TabType>('episodes');
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [audioPreference, setAudioPreference] = useState<'sub' | 'dub'>('sub');
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [jumpInput, setJumpInput] = useState('');

  const anime = detailedAnimeInfo || selectedAnime;

  // Always scroll to top when page opens or anime changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [anime?.id]);

  const episodes: AnimeEpisode[] = useMemo(() => {
    if (!anime) return [];
    try {
      return AniListService.generateEpisodes(anime);
    } catch {
      return [];
    }
  }, [anime]);

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
    const start = activeChunkIndex * CHUNK_SIZE;
    return episodes.slice(start, start + CHUNK_SIZE);
  }, [episodes, activeChunkIndex, episodeSearch]);

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
      const match = malItem.description.match(/Watched (\d+)/i) || malItem.description.match(/Progress:\s*(\d+)/i);
      if (match && match[1]) {
        const watched = parseInt(match[1], 10);
        return Math.min(watched + 1, episodes.length || 1);
      }
    }
    return 1;
  }, [anime.id, anime.malId, syncedWatchingList, episodes.length]);

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
      : anime.title || 'Anime';

  const genresList = Array.isArray(anime.genres) ? anime.genres : [];
  const studiosList = Array.isArray(anime.studios) ? anime.studios : [];
  const charactersList = Array.isArray(anime.characters) ? anime.characters : [];
  const relationsList = Array.isArray(anime.relations) ? anime.relations : [];

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
        <div className="absolute inset-0 hero-vignette-left" />

        {/* Back Navigation Bar */}
        <div className="absolute top-4 left-4 sm:left-8 z-30">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/60 hover:bg-crafted-brand-rust text-white text-xs font-mono font-semibold backdrop-blur-md border border-white/10 shadow-2xl transition-all cursor-pointer"
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
                  openPlayer(anime, targetEp);
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-crafted-button text-white font-bold text-xs sm:text-sm shadow-crafted-glow hover:brightness-110 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>
                  {resumeEpisodeNumber > 1 ? `Resume Episode ${resumeEpisodeNumber}` : 'Watch Episode 1'}
                </span>
              </button>

              <button
                onClick={() => toggleWatchlist(anime)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  inWatchlist
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-crafted-surface text-crafted-text border-crafted-border hover:text-white'
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
            </div>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-crafted-border pb-px overflow-x-auto no-scrollbar">
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
            onClick={() => setActiveTab('relations')}
            className={`flex items-center gap-2 px-5 py-3 rounded-t-xl text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'relations'
                ? 'border-crafted-brand-rust text-crafted-brand-rustLight bg-crafted-surface/80'
                : 'border-transparent text-crafted-text-dim hover:text-white'
            }`}
          >
            <span>Franchise Relations</span>
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

            {/* Episode Rows List */}
            <div className="space-y-3">
              {displayedEpisodes.length === 0 ? (
                <p className="text-center text-xs text-crafted-text-dim py-12">
                  No episodes found matching "{episodeSearch}"
                </p>
              ) : (
                displayedEpisodes.map((ep) => (
                  <div
                    key={ep.id}
                    onClick={() => openPlayer(anime, ep)}
                    className="group flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-crafted-panel/50 hover:bg-crafted-surface border border-crafted-border hover:border-crafted-brand-rust transition-all duration-200 cursor-pointer shadow-crafted-card"
                  >
                    {/* Left Thumbnail */}
                    <div className="relative aspect-video w-32 sm:w-44 rounded-xl overflow-hidden shrink-0 bg-crafted-bg">
                      <img
                        src={ep.thumbnail || coverImg}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/80 font-mono text-[10px] text-white">
                        {ep.duration || '24m'}
                      </span>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-crafted-brand-rust flex items-center justify-center text-white shadow-crafted-glow">
                          <Play className="w-4 h-4 fill-white ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Center Details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-crafted-brand-rust/25 text-crafted-brand-rustLight border border-crafted-brand-rust/40">
                          EPISODE {ep.number}
                        </span>
                        {ep.airDate && (
                          <span className="text-xs font-mono text-crafted-text-dim">
                            {ep.airDate}
                          </span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          {audioPreference.toUpperCase()} 1080p
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-semibold text-white truncate group-hover:text-crafted-brand-rustLight transition-colors">
                        {(ep.title || `Episode ${ep.number}`).replace(/^Episode \d+:\s*/, '')}
                      </h3>

                      <p className="text-xs text-crafted-text-muted line-clamp-1 sm:line-clamp-2">
                        {ep.description || 'Watch full episode in high-definition stream.'}
                      </p>
                    </div>

                    {/* Right Watch Action */}
                    <button className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-crafted-surface group-hover:bg-crafted-brand-rust text-crafted-text group-hover:text-white border border-crafted-border text-xs font-bold transition-all shadow-crafted-glow shrink-0">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Stream</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CHARACTERS & SEIYUU */}
        {activeTab === 'characters' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold font-serif text-white">Main Characters & Cast</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {charactersList.length === 0 ? (
                <p className="text-xs text-crafted-text-dim col-span-3">
                  Cast list registered on AniList broadcast chart.
                </p>
              ) : (
                charactersList.map((char) => (
                  <div
                    key={char.id}
                    className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-crafted-panel/50 border border-crafted-border"
                  >
                    <img
                      src={char.image?.large || coverImg}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-xl object-cover border border-crafted-border shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                        {char.name?.full || char.name?.native || 'Character'}
                      </h4>
                      <p className="text-[11px] text-crafted-text-dim">Role: {char.role || 'Main'}</p>
                      {char.voiceActor && (
                        <p className="text-[11px] text-crafted-brand-lightViolet truncate">
                          VA: {char.voiceActor.name || 'Seiyuu'} ({char.voiceActor.language || 'JP'})
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RELATIONS */}
        {activeTab === 'relations' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold font-serif text-white">Franchise Relations & Sequel Tree</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relationsList.length === 0 ? (
                <p className="text-xs text-crafted-text-dim col-span-2">
                  Standalone anime or no prequels/sequels registered.
                </p>
              ) : (
                relationsList.map((rel) => (
                  <div
                    key={rel.id}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-crafted-panel/50 border border-crafted-border hover:border-crafted-brand-violet transition-colors"
                  >
                    <img
                      src={rel.coverImage?.large || coverImg}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-14 aspect-[2/3] object-cover rounded-xl border border-crafted-border shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-crafted-brand-violet/30 text-crafted-brand-lightViolet font-bold">
                        {rel.type || 'FRANCHISE'}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                        {rel.title?.english || rel.title?.romaji || 'Related Media'}
                      </h4>
                      <p className="text-xs text-crafted-text-dim">
                        Format: {rel.format || 'TV'} • Status: {rel.status || 'FINISHED'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="space-y-2 p-6 rounded-2xl bg-crafted-panel/40 border border-crafted-border">
              <h3 className="text-base font-bold font-serif text-white">Official Synopsis</h3>
              <p className="text-xs sm:text-sm text-crafted-text-muted leading-relaxed">
                {anime.description || 'No description available for this series.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-crafted-panel/40 border border-crafted-border space-y-1">
                <span className="text-[11px] font-mono text-crafted-text-dim block">SEASON</span>
                <span className="text-xs sm:text-sm font-bold text-white">
                  {anime.season || 'WINTER'} {anime.seasonYear || 2024}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-crafted-panel/40 border border-crafted-border space-y-1">
                <span className="text-[11px] font-mono text-crafted-text-dim block">STUDIO</span>
                <span className="text-xs sm:text-sm font-bold text-white truncate block">
                  {studiosList.join(', ') || 'Animation Studio'}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-crafted-panel/40 border border-crafted-border space-y-1">
                <span className="text-[11px] font-mono text-crafted-text-dim block">EPISODES</span>
                <span className="text-xs sm:text-sm font-bold text-white">{episodes.length} Episodes</span>
              </div>
              <div className="p-4 rounded-2xl bg-crafted-panel/40 border border-crafted-border space-y-1">
                <span className="text-[11px] font-mono text-crafted-text-dim block">GENRES</span>
                <span className="text-xs sm:text-sm font-bold text-white truncate block">
                  {genresList.join(', ') || 'Animation'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
