import React, { useState, useMemo } from 'react';
import {
  X,
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
import { AniListService } from '../../services/anilist';
import { Badge } from '../common/Badge';
import { AnimeEpisode } from '../../types/anime';

type TabType = 'episodes' | 'characters' | 'relations' | 'overview';

export const AnimeDetailModal: React.FC = () => {
  const { selectedAnime, detailedAnimeInfo, setSelectedAnime, toggleWatchlist, isInWatchlist } =
    useAnimeStore();
  const { openPlayer } = usePlayerStore();

  const [activeTab, setActiveTab] = useState<TabType>('episodes');
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [audioPreference, setAudioPreference] = useState<'sub' | 'dub'>('sub');
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);
  const [jumpInput, setJumpInput] = useState('');

  const anime = detailedAnimeInfo || selectedAnime;
  if (!anime) return null;

  const inWatchlist = isInWatchlist(anime.id);
  const episodes: AnimeEpisode[] = useMemo(() => {
    try {
      return AniListService.generateEpisodes(anime);
    } catch {
      return [];
    }
  }, [anime]);

  const CHUNK_SIZE = 50;
  const totalChunks = Math.max(1, Math.ceil(episodes.length / CHUNK_SIZE));

  // Filtered episodes based on search and range chunk
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
    anime.title?.english || anime.title?.romaji || anime.title?.userPreferred || 'Anime Details';
  const genresList = Array.isArray(anime.genres) ? anime.genres : [];
  const studiosList = Array.isArray(anime.studios) ? anime.studios : [];
  const charactersList = Array.isArray(anime.characters) ? anime.characters : [];
  const relationsList = Array.isArray(anime.relations) ? anime.relations : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-crafted-surface border border-crafted-border rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={() => setSelectedAnime(null)}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/60 hover:bg-crafted-brand-rust text-white/80 hover:text-white backdrop-blur-md border border-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Banner Header */}
        <div className="relative h-56 sm:h-72 w-full overflow-hidden shrink-0 bg-crafted-panel">
          <img
            src={bannerImg}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-crafted-surface via-crafted-surface/50 to-transparent" />
          <div className="absolute inset-0 hero-vignette-left" />

          {/* Info Container inside Banner */}
          <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 flex items-end gap-5">
            <img
              src={coverImg}
              alt=""
              referrerPolicy="no-referrer"
              className="w-24 sm:w-32 aspect-[2/3] object-cover rounded-xl border-2 border-crafted-border shadow-2xl shrink-0 hidden xs:block"
            />
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="rust" size="xs">
                  {anime.format || 'TV'}
                </Badge>
                <Badge variant="violet" size="xs">
                  {anime.status || 'RELEASING'}
                </Badge>
                <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-300 bg-black/60 px-2 py-0.5 rounded border border-white/10">
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span>{((anime.averageScore || 88) / 10).toFixed(1)} / 10</span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white leading-tight">
                {titleString}
              </h2>
              {anime.title?.native && (
                <p className="text-xs text-crafted-text-dim">
                  {anime.title.native} • {studiosList.join(', ') || 'Animation Studio'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="px-4 sm:px-6 pt-3 border-b border-crafted-border bg-crafted-panel/60 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('episodes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'episodes'
                  ? 'border-crafted-brand-rust text-crafted-brand-rustLight bg-crafted-surface'
                  : 'border-transparent text-crafted-text-muted hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Episodes ({episodes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('characters')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'characters'
                  ? 'border-crafted-brand-rust text-crafted-brand-rustLight bg-crafted-surface'
                  : 'border-transparent text-crafted-text-muted hover:text-white'
              }`}
            >
              <span>Characters & Cast</span>
            </button>
            <button
              onClick={() => setActiveTab('relations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'relations'
                  ? 'border-crafted-brand-rust text-crafted-brand-rustLight bg-crafted-surface'
                  : 'border-transparent text-crafted-text-muted hover:text-white'
              }`}
            >
              <span>Relations & Franchise</span>
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-crafted-brand-rust text-crafted-brand-rustLight bg-crafted-surface'
                  : 'border-transparent text-crafted-text-muted hover:text-white'
              }`}
            >
              <span>Overview & Media</span>
            </button>
          </div>

          {/* Quick Play & Watchlist Action */}
          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={() => {
                openPlayer(anime, episodes[0]);
                setSelectedAnime(null);
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-crafted-button text-white font-bold text-xs shadow-crafted-glow hover:brightness-110 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Play Ep 1</span>
            </button>

            <button
              onClick={() => toggleWatchlist(anime)}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                inWatchlist
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-crafted-surface text-crafted-text border-crafted-border hover:text-white'
              }`}
              title="Watchlist"
            >
              {inWatchlist ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: EPISODE LIST VIEW */}
          {activeTab === 'episodes' && (
            <div className="space-y-4">
              {/* Filter Controls Row */}
              <div className="flex items-center justify-between gap-3 flex-wrap bg-crafted-panel/60 p-3 rounded-xl border border-crafted-border">
                {/* Search in episodes */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-crafted-brand-rust absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={episodeSearch}
                    onChange={(e) => setEpisodeSearch(e.target.value)}
                    placeholder="Search episode title or number..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-crafted-bg border border-crafted-border text-crafted-text placeholder:text-crafted-text-dim focus:outline-none focus:border-crafted-brand-rust"
                  />
                </div>

                {/* Sub / Dub Audio Preference */}
                <div className="flex items-center p-1 rounded-lg bg-crafted-bg border border-crafted-border">
                  <button
                    onClick={() => setAudioPreference('sub')}
                    className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                      audioPreference === 'sub'
                        ? 'bg-crafted-brand-rust text-white'
                        : 'text-crafted-text-dim hover:text-white'
                    }`}
                  >
                    SUB (JP)
                  </button>
                  <button
                    onClick={() => setAudioPreference('dub')}
                    className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-all ${
                      audioPreference === 'dub'
                        ? 'bg-crafted-brand-lightViolet text-white'
                        : 'text-crafted-text-dim hover:text-white'
                    }`}
                  >
                    DUB (EN)
                  </button>
                </div>

                {/* Jump to Episode Form */}
                <form onSubmit={handleJumpToEpisode} className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={episodes.length || 1}
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    placeholder={`Jump (1-${episodes.length})`}
                    className="w-28 px-2.5 py-1.5 text-xs rounded-lg bg-crafted-bg border border-crafted-border text-crafted-text font-mono placeholder:text-crafted-text-dim focus:outline-none focus:border-crafted-brand-rust"
                  />
                  <button
                    type="submit"
                    className="p-1.5 rounded-lg bg-crafted-surface hover:bg-crafted-surface-hover text-crafted-brand-rust border border-crafted-border cursor-pointer"
                    title="Jump to Episode"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Chunk Range Switcher for Long Anime */}
              {totalChunks > 1 && !episodeSearch && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {Array.from({ length: totalChunks }).map((_, idx) => {
                    const startEp = idx * CHUNK_SIZE + 1;
                    const endEp = Math.min((idx + 1) * CHUNK_SIZE, episodes.length);
                    const isActive = activeChunkIndex === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActiveChunkIndex(idx)}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold whitespace-nowrap transition-all cursor-pointer ${
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

              {/* Episode List Rows */}
              <div className="space-y-2.5">
                {displayedEpisodes.length === 0 ? (
                  <p className="text-center text-xs text-crafted-text-dim py-8">
                    No episodes found matching "{episodeSearch}"
                  </p>
                ) : (
                  displayedEpisodes.map((ep) => (
                    <div
                      key={ep.id}
                      onClick={() => {
                        openPlayer(anime, ep);
                        setSelectedAnime(null);
                      }}
                      className="group flex items-center justify-between gap-4 p-3 rounded-xl bg-crafted-panel/50 hover:bg-crafted-surface border border-crafted-border hover:border-crafted-brand-rust transition-all duration-200 cursor-pointer shadow-crafted-card"
                    >
                      {/* Left Thumbnail & Duration */}
                      <div className="relative aspect-video w-28 sm:w-36 rounded-lg overflow-hidden shrink-0 bg-crafted-bg">
                        <img
                          src={ep.thumbnail || coverImg}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[10px] text-white">
                          {ep.duration || '24m'}
                        </span>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-crafted-brand-rust flex items-center justify-center text-white shadow-crafted-glow">
                            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>

                      {/* Center Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-crafted-brand-rust/25 text-crafted-brand-rustLight border border-crafted-brand-rust/40">
                            EPISODE {ep.number}
                          </span>
                          {ep.airDate && (
                            <span className="text-[11px] font-mono text-crafted-text-dim">
                              {ep.airDate}
                            </span>
                          )}
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                            {audioPreference.toUpperCase()}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-crafted-brand-rustLight transition-colors">
                          {(ep.title || `Episode ${ep.number}`).replace(/^Episode \d+:\s*/, '')}
                        </h4>

                        <p className="text-[11px] text-crafted-text-muted line-clamp-1">
                          {ep.description || 'Watch full episode in 1080p stream.'}
                        </p>
                      </div>

                      {/* Right Quick Play Button */}
                      <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crafted-surface group-hover:bg-crafted-brand-rust text-crafted-text group-hover:text-white border border-crafted-border text-xs font-semibold transition-colors shrink-0">
                        <Play className="w-3 h-3 fill-current" />
                        <span>Watch</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CHARACTERS & VOICE ACTORS */}
          {activeTab === 'characters' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold font-serif text-white">
                Main Cast & Seiyuu Voice Actors
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {charactersList.length === 0 ? (
                  <p className="text-xs text-crafted-text-dim col-span-3">
                    Cast information available on live AniList broadcast chart.
                  </p>
                ) : (
                  charactersList.map((char) => (
                    <div
                      key={char.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-crafted-panel/50 border border-crafted-border"
                    >
                      <img
                        src={char.image?.large || coverImg}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-xl object-cover border border-crafted-border shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">
                          {char.name?.full || char.name?.native || 'Character'}
                        </h4>
                        <p className="text-[10px] text-crafted-text-dim">Role: {char.role || 'Main'}</p>
                        {char.voiceActor && (
                          <p className="text-[10px] text-crafted-brand-lightViolet truncate">
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

          {/* TAB 3: RELATIONS & FRANCHISE TREE */}
          {activeTab === 'relations' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold font-serif text-white">Franchise Relations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {relationsList.length === 0 ? (
                  <p className="text-xs text-crafted-text-dim col-span-2">
                    Standalone broadcast or no prequel/sequel registered.
                  </p>
                ) : (
                  relationsList.map((rel) => (
                    <div
                      key={rel.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-crafted-panel/50 border border-crafted-border hover:border-crafted-brand-violet transition-colors"
                    >
                      <img
                        src={rel.coverImage?.large || coverImg}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-12 aspect-[2/3] object-cover rounded-lg border border-crafted-border shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-crafted-brand-violet/30 text-crafted-brand-lightViolet font-bold">
                          {rel.type || 'FRANCHISE'}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate mt-1">
                          {rel.title?.english || rel.title?.romaji || 'Related Media'}
                        </h4>
                        <p className="text-[10px] text-crafted-text-dim">
                          Format: {rel.format || 'TV'} • Status: {rel.status || 'FINISHED'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: OVERVIEW & DETAILS */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-bold font-serif text-white">Synopsis</h3>
                <p className="text-xs text-crafted-text-muted leading-relaxed">
                  {anime.description || 'No description available.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-crafted-border">
                <div className="p-3 rounded-xl bg-crafted-panel/40 border border-crafted-border">
                  <span className="text-[10px] font-mono text-crafted-text-dim block">SEASON</span>
                  <span className="text-xs font-bold text-white">
                    {anime.season || 'WINTER'} {anime.seasonYear || 2024}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-crafted-panel/40 border border-crafted-border">
                  <span className="text-[10px] font-mono text-crafted-text-dim block">STUDIO</span>
                  <span className="text-xs font-bold text-white truncate block">
                    {studiosList.join(', ') || 'Animation Studio'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-crafted-panel/40 border border-crafted-border">
                  <span className="text-[10px] font-mono text-crafted-text-dim block">TOTAL EPISODES</span>
                  <span className="text-xs font-bold text-white">{episodes.length} Episodes</span>
                </div>
                <div className="p-3 rounded-xl bg-crafted-panel/40 border border-crafted-border">
                  <span className="text-[10px] font-mono text-crafted-text-dim block">GENRES</span>
                  <span className="text-xs font-bold text-white truncate block">
                    {genresList.join(', ') || 'Animation'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
