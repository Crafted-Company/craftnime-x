import React from 'react';
import { Play, Star, Plus, Check } from 'lucide-react';
import { AnimeItem } from '../../types/anime';
import { useAnimeStore } from '../../store/useAnimeStore';
import { usePlayerStore } from '../../store/usePlayerStore';

interface TopRankedCardProps {
  anime: AnimeItem;
  rank: number;
}

export const TopRankedCard: React.FC<TopRankedCardProps> = ({ anime, rank }) => {
  const { setSelectedAnime, toggleWatchlist, isInWatchlist } = useAnimeStore();
  const { openPlayer } = usePlayerStore();
  const inWatchlist = isInWatchlist(anime.id);

  const posterUrl =
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    anime.coverImage?.medium ||
    'https://media.kitsu.app/anime/poster_images/11469/large.jpg';

  return (
    <div
      onClick={() => setSelectedAnime(anime)}
      className="group relative flex-shrink-0 flex items-end h-64 sm:h-72 w-52 sm:w-60 cursor-pointer select-none"
    >
      {/* Big Stylized Rank Number in Instrument Serif */}
      <div className="absolute left-0 bottom-0 text-[100px] sm:text-[120px] font-bold font-serif leading-none tracking-tighter text-[#352c2c] group-hover:text-crafted-brand-rust/60 transition-colors duration-300 z-0">
        {rank}
      </div>

      {/* Overlapping Poster Card */}
      <div className="relative z-10 ml-16 sm:ml-20 w-36 sm:w-40 aspect-[2/3] rounded-2xl overflow-hidden bg-crafted-surface border border-crafted-border group-hover:border-crafted-brand-rust transition-all duration-300 group-hover:-translate-y-1.5 shadow-crafted-card">
        <img
          src={posterUrl}
          alt={anime.title.english || anime.title.romaji}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://media.kitsu.app/anime/poster_images/11469/large.jpg';
          }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top Badges */}
        <div className="absolute top-2 right-2">
          {anime.averageScore && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold text-amber-300">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span>{(anime.averageScore / 10).toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Hover Action Overlay (Desktop Only - Mobile taps open Details Page) */}
        <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex flex-col justify-end p-2.5 gap-1.5 backdrop-blur-[2px] pointer-events-none group-hover:pointer-events-auto">
          <p className="text-xs font-bold text-white line-clamp-1">
            {anime.title.english || anime.title.romaji}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openPlayer(anime);
              }}
              className="flex-1 py-1.5 rounded-lg bg-crafted-button text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-crafted-glow cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Play</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleWatchlist(anime);
              }}
              className="p-1.5 rounded-lg bg-black/60 text-white border border-white/20 hover:border-crafted-brand-rust cursor-pointer"
            >
              {inWatchlist ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
