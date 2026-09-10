import React, { useState } from 'react';
import { Play, Info, X } from 'lucide-react';
import { AnimeItem } from '../../types/anime';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useAnimeStore } from '../../store/useAnimeStore';

interface ContinueWatchingCardProps {
  item: any;
}

export const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({ item }) => {
  const { openPlayer } = usePlayerStore();
  const { setSelectedAnime, removeFromContinueWatching } = useAnimeStore();
  const [imgFailed, setImgFailed] = useState(false);

  if (!item) return null;

  const anime: AnimeItem = item.anime || item;
  if (!anime) return null;

  const thumbUrl =
    anime.bannerImage ||
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    anime.coverImage?.medium ||
    'https://s4.anilist.co/file/anilistcdn/media/anime/banner/151807-3bJznx5Bhp8w.jpg';

  const titleString =
    typeof anime.title === 'object'
      ? anime.title?.english || anime.title?.romaji || anime.title?.userPreferred || 'Anime'
      : String(anime.title || 'Anime');

  const epNum = item.episodeNumber || (anime as any).lastWatchedEpisodeNumber || 1;
  const audioLang = item.audioLanguage || 'SUB';

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromContinueWatching(anime.id);
  };

  return (
    <div className="group relative flex-shrink-0 w-72 sm:w-80 rounded-2xl overflow-hidden bg-crafted-surface border border-crafted-border hover:border-crafted-brand-rust transition-all duration-300 hover:-translate-y-1 shadow-crafted-card flex flex-col justify-between">
      {/* 16:9 Thumbnail Container -> Opens Details Page */}
      <div
        onClick={() => setSelectedAnime(anime)}
        className="relative aspect-video w-full overflow-hidden bg-crafted-panel cursor-pointer"
        title="View Anime Details"
      >
        {!imgFailed ? (
          <img
            src={thumbUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-crafted-panel via-crafted-surface to-crafted-brand-rust/20 flex items-center justify-center">
            <span className="text-xs font-serif font-bold text-crafted-brand-rustLight opacity-60">
              {titleString}
            </span>
          </div>
        )}

        {/* Center Play Button */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors pointer-events-none">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openPlayer(anime);
            }}
            className="w-11 h-11 rounded-full bg-crafted-brand-rust/95 border border-crafted-brand-rustLight flex items-center justify-center text-white shadow-crafted-glow hover:scale-110 active:scale-95 transition-transform pointer-events-auto cursor-pointer"
            title={`Play Episode ${epNum}`}
          >
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </button>
        </div>

        {/* Top Left Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
          <span className="px-2 py-0.5 rounded-md bg-crafted-brand-rust text-white text-[10px] font-mono font-bold">
            EP {epNum}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-white text-[10px] font-mono">
            {String(audioLang).toUpperCase()}
          </span>
        </div>

        {/* Top Right Quick Remove Cross Button on Hover */}
        <button
          onClick={handleRemove}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/80 hover:bg-rose-600 text-white/70 hover:text-white backdrop-blur-md border border-white/15 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer shadow-lg hover:scale-110 active:scale-90 z-20"
          title="Remove from Continue Watching"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Bottom Crafted Co Release Schedule Badge */}
        {anime.nextAiringEpisode ? (
          <div className="absolute bottom-2 left-2 flex items-center pointer-events-none z-10">
            <div className="inline-flex items-center text-[9px] font-bold overflow-hidden rounded-lg shadow-xl border border-crafted-border tracking-tight backdrop-blur-md">
              <span className="bg-crafted-brand-rust px-1.5 py-0.5 text-white font-sans">Next Episode</span>
              <span className="bg-crafted-surface/90 px-1.5 py-0.5 text-crafted-text font-sans border-l border-crafted-border">
                {new Date(anime.nextAiringEpisode.airingAt * 1000).toLocaleDateString('en-US', { weekday: 'long' })}
              </span>
            </div>
          </div>
        ) : anime.status === 'RELEASING' ? (
          <div className="absolute bottom-2 left-2 flex items-center pointer-events-none z-10">
            <div className="inline-flex items-center text-[9px] font-bold overflow-hidden rounded-lg shadow-xl border border-crafted-border tracking-tight backdrop-blur-md">
              <span className="bg-crafted-brand-rust px-1.5 py-0.5 text-white font-sans">New Episode</span>
              <span className="bg-crafted-surface/90 px-1.5 py-0.5 text-crafted-text font-sans border-l border-crafted-border">Watch Now</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Info Bottom Bar -> Navigates to Anime Details Page */}
      <div
        onClick={() => setSelectedAnime(anime)}
        className="p-3 bg-crafted-surface hover:bg-crafted-surface-hover transition-colors cursor-pointer border-t border-crafted-border flex items-center justify-between gap-2"
        title="View Anime Details, Cast & Matrix"
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <h4 className="text-xs sm:text-sm font-semibold text-crafted-text truncate group-hover:text-crafted-brand-rustLight transition-colors">
            {titleString}
          </h4>
          <p className="text-[11px] text-crafted-text-dim truncate font-mono">
            Episode {epNum}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedAnime(anime);
          }}
          className="p-1.5 rounded-lg bg-crafted-panel hover:bg-crafted-brand-rust text-crafted-text-dim hover:text-white border border-crafted-border transition-colors shrink-0"
          title="Anime Details & Matrix"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
