import React from 'react';
import { Play, Plus, Check, Star } from 'lucide-react';
import { AnimeItem } from '../../types/anime';
import { useAnimeStore } from '../../store/useAnimeStore';
import { usePlayerStore } from '../../store/usePlayerStore';

interface AnimeCardProps {
  anime: AnimeItem;
  isGrid?: boolean;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({ anime, isGrid = false }) => {
  const { setSelectedAnime, toggleWatchlist, isInWatchlist } = useAnimeStore();
  const { openPlayer } = usePlayerStore();

  if (!anime) return null;

  const inWatchlist = isInWatchlist(anime.id);

  const posterUrl =
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    anime.coverImage?.medium ||
    anime.bannerImage ||
    'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-33nNwsEadAiT.jpg';

  const titleString =
    typeof anime.title === 'object'
      ? anime.title?.english || anime.title?.romaji || anime.title?.userPreferred || 'Anime'
      : anime.title || 'Anime';

  const genresList = Array.isArray(anime.genres) ? anime.genres : [];

  return (
    <div
      onClick={() => setSelectedAnime(anime)}
      className={`group relative flex flex-col rounded-2xl overflow-hidden bg-crafted-surface border border-crafted-border hover:border-crafted-brand-rust transition-all duration-300 hover:-translate-y-1.5 shadow-crafted-card cursor-pointer ${
        isGrid ? 'w-full' : 'w-44 sm:w-48 md:w-52 flex-shrink-0'
      }`}
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-crafted-panel">
        <img
          src={posterUrl}
          alt={titleString}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-33nNwsEadAiT.jpg';
          }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Subtle Top Gradient for Badge Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/20 pointer-events-none" />

        {/* Top Floating Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          {anime.averageScore ? (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[11px] font-mono font-bold text-amber-300">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{(anime.averageScore / 10).toFixed(1)}</span>
            </div>
          ) : (
            <div />
          )}
          <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono font-semibold text-crafted-text-muted">
            {anime.format || 'TV'}
          </span>
        </div>

        {/* Hover Quick Action Overlay */}
        <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-3 gap-2.5 backdrop-blur-[2px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openPlayer(anime);
            }}
            className="p-3 rounded-full bg-crafted-button text-white shadow-crafted-glow hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title="Play Now"
          >
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWatchlist(anime);
            }}
            className={`p-3 rounded-full border transition-all cursor-pointer ${
              inWatchlist
                ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/50'
                : 'bg-black/60 text-white border-white/20 hover:border-crafted-brand-rust hover:bg-crafted-brand-rust'
            }`}
            title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            {inWatchlist ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Card Info Box */}
      <div className="p-3 flex flex-col justify-between flex-1 gap-1.5 bg-crafted-surface">
        <h4 className="text-xs sm:text-sm font-semibold text-crafted-text truncate group-hover:text-crafted-brand-rustLight transition-colors">
          {titleString}
        </h4>

        <div className="flex items-center justify-between text-[11px] text-crafted-text-dim font-mono">
          <span className="truncate max-w-[65%]">
            {genresList[0] || 'Anime'}
          </span>
          <span className="text-crafted-brand-lightViolet font-semibold shrink-0">
            {anime.episodes ? `${anime.episodes} EPS` : 'SUB/DUB'}
          </span>
        </div>
      </div>
    </div>
  );
};
