import React, { useState } from 'react';
import { Play, Info } from 'lucide-react';
import { AnimeItem } from '../../types/anime';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useAnimeStore } from '../../store/useAnimeStore';

interface ContinueWatchingCardProps {
  item: any;
}

export const ContinueWatchingCard: React.FC<ContinueWatchingCardProps> = ({ item }) => {
  const { openPlayer } = usePlayerStore();
  const { setSelectedAnime } = useAnimeStore();
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

  return (
    <div className="group relative flex-shrink-0 w-72 sm:w-80 rounded-2xl overflow-hidden bg-crafted-surface border border-crafted-border hover:border-crafted-brand-rust transition-all duration-300 hover:-translate-y-1 shadow-crafted-card flex flex-col justify-between">
      {/* 16:9 Thumbnail Container -> Direct Play Action */}
      <div
        onClick={() => openPlayer(anime)}
        className="relative aspect-video w-full overflow-hidden bg-crafted-panel cursor-pointer"
        title={`Play Episode ${epNum}`}
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
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
          <div className="w-11 h-11 rounded-full bg-crafted-brand-rust/95 border border-crafted-brand-rustLight flex items-center justify-center text-white shadow-crafted-glow group-hover:scale-110 transition-transform">
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </div>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
          <span className="px-2 py-0.5 rounded-md bg-crafted-brand-rust text-white text-[10px] font-mono font-bold">
            EP {epNum}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-white text-[10px] font-mono">
            {String(audioLang).toUpperCase()}
          </span>
        </div>
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
            Resume Episode {epNum}
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
