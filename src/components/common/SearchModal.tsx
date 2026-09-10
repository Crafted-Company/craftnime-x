import React, { useEffect, useRef } from 'react';
import { Search, X, Star, Play, Sparkles, Film } from 'lucide-react';
import { useAnimeStore } from '../../store/useAnimeStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { Badge } from './Badge';

const GENRES = [
  'All',
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Mystery',
  'Sci-Fi',
  'Supernatural',
  'Romance',
];

export const SearchModal: React.FC = () => {
  const {
    isSearchModalOpen,
    setSearchModalOpen,
    searchQuery,
    setSearchQuery,
    selectedGenre,
    setSelectedGenre,
    searchResults,
    searchAnime,
    setSelectedAnime,
    isLoading,
  } = useAnimeStore();

  const { openPlayer } = usePlayerStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      searchAnime(searchQuery, selectedGenre);
    }
  }, [isSearchModalOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isSearchModalOpen) {
        searchAnime(searchQuery, selectedGenre);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedGenre]);

  if (!isSearchModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-3 sm:pt-16 px-2 sm:px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-crafted-surface border border-crafted-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[82vh]">
        {/* Search Header */}
        <div className="flex items-center px-3 sm:px-4 py-3 border-b border-crafted-border gap-2 sm:gap-3 bg-crafted-panel/80">
          <Search className="w-5 h-5 text-crafted-brand-rust shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anime by title, character, or keyword..."
            className="flex-1 min-w-0 bg-transparent text-crafted-text placeholder:text-crafted-text-dim text-sm sm:text-base focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-crafted-text-dim hover:text-crafted-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setSearchModalOpen(false)}
            className="px-2.5 py-1 text-xs font-mono rounded-md bg-crafted-border text-crafted-text-muted hover:text-white shrink-0 cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Genre Pill Filter */}
        <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-crafted-border/60 overflow-x-auto no-scrollbar bg-crafted-bg/40">
          <Sparkles className="w-3.5 h-3.5 text-crafted-brand-lightViolet shrink-0" />
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedGenre === genre
                  ? 'bg-crafted-brand-rust text-white shadow-crafted-glow'
                  : 'bg-crafted-surface hover:bg-crafted-surface-hover text-crafted-text-muted hover:text-white border border-crafted-border'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-crafted-text-dim">
              <div className="w-7 h-7 border-2 border-crafted-brand-rust border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-mono">Querying AniList Catalog...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-12 text-center text-crafted-text-dim">
              <Film className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No anime matches found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
              {searchResults.map((anime) => (
                <div
                  key={anime.id}
                  onClick={() => {
                    setSelectedAnime(anime);
                    setSearchModalOpen(false);
                  }}
                  className="flex items-center gap-3 p-2 sm:p-2.5 rounded-xl bg-crafted-bg/60 border border-crafted-border hover:border-crafted-brand-rust/60 hover:bg-crafted-surface-hover/80 transition-all cursor-pointer group"
                >
                  <img
                    src={anime.coverImage?.large || anime.coverImage?.extraLarge || ""}
                    alt={anime.title.english || anime.title.romaji}
                    className="w-12 h-16 sm:w-14 sm:h-20 object-cover rounded-lg shrink-0 group-hover:scale-105 transition-transform"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-semibold text-crafted-text truncate group-hover:text-crafted-brand-rustLight transition-colors">
                      {anime.title.english || anime.title.romaji}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-crafted-text-dim truncate mt-0.5">
                      {anime.genres.slice(0, 3).join(' • ')}
                    </p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
                      {anime.averageScore && (
                        <Badge variant="gold" size="xs" icon={<Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}>
                          {(anime.averageScore / 10).toFixed(1)}
                        </Badge>
                      )}
                      <Badge variant="surface" size="xs">
                        {anime.format}
                      </Badge>
                      {anime.episodes && (
                        <Badge variant="violet" size="xs">
                          {anime.episodes} EPS
                        </Badge>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchModalOpen(false);
                      openPlayer(anime);
                    }}
                    className="p-2 rounded-lg bg-crafted-brand-rust/20 text-crafted-brand-rust hover:bg-crafted-brand-rust hover:text-white transition-colors shrink-0 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
