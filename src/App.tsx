import React, { useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroBillboard } from './components/hero/HeroBillboard';
import { AnimeCarousel } from './components/carousel/AnimeCarousel';
import { AnimeDetailPage } from './components/details/AnimeDetailPage';
import { VideoPlayerModal } from './components/player/VideoPlayerModal';
import { SearchModal } from './components/common/SearchModal';
import { MALLoginModal } from './components/modal/MALLoginModal';
import { MALWatchlistHub } from './components/mal/MALWatchlistHub';
import { AnimeCard } from './components/carousel/AnimeCard';
import { useAnimeStore } from './store/useAnimeStore';
import {
  Flame,
  Clock,
  Award,
  Calendar,
  Layers,
  Filter,
  ArrowUpDown,
  Search,
  Sparkles,
} from 'lucide-react';

export const App: React.FC = () => {
  const {
    activeNavTab,
    fetchInitialCatalog,
    trendingList,
    topAiringList,
    popularSeasonList,
    continueWatchingList,
    selectedGenre,
    setSelectedGenre,
    selectedSeason,
    selectedSeasonYear,
    setSelectedSeason,
    selectedFormat,
    setSelectedFormat,
    selectedSort,
    setSelectedSort,
    browseList,
    searchQuery,
    setSearchQuery,
    applyBrowseFilters,
    isLoading,
  } = useAnimeStore();

  useEffect(() => {
    fetchInitialCatalog();
  }, []);

  const genres = [
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
    'Horror',
  ];

  const seasons = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
  const years = [2025, 2024, 2023, 2022];
  const formats = ['ALL', 'TV', 'MOVIE', 'OVA', 'SPECIAL'];

  return (
    <div className="min-h-screen bg-crafted-bg text-crafted-text flex flex-col selection:bg-crafted-brand-rust selection:text-white">
      {/* Top Sticky Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* Dedicated Full Details Page */}
        {activeNavTab === 'details' && <AnimeDetailPage />}

        {/* Home Tab */}
        {activeNavTab === 'home' && (
          <>
            {/* Netflix-Style Hero Billboard */}
            <HeroBillboard />

            {/* Carousels Container with Clean Pacing */}
            <div className="space-y-6 mt-4 relative z-20 pb-16">
              {/* Continue Watching Carousel */}
              {continueWatchingList.length > 0 && (
                <AnimeCarousel
                  title="Continue Watching"
                  subtitle="Jump right back where you left off"
                  icon={<Clock className="w-5 h-5 text-crafted-brand-rust" />}
                  items={continueWatchingList}
                  variant="continue"
                />
              )}

              {/* Trending Now */}
              <AnimeCarousel
                title="Trending Now"
                subtitle="Most watched anime across the globe right now"
                icon={<Flame className="w-5 h-5 text-crafted-brand-rust" />}
                badge="HOT"
                items={trendingList}
                variant="standard"
              />

              {/* Top 10 This Week */}
              <AnimeCarousel
                title="Top 10 This Week"
                subtitle="Highest rated weekly anime rankings"
                icon={<Award className="w-5 h-5 text-amber-400" />}
                badge="TOP 10"
                items={topAiringList}
                variant="ranked"
              />

              {/* Popular This Season */}
              <AnimeCarousel
                title="Popular This Season"
                subtitle="Top picks from the current broadcast season"
                icon={<Calendar className="w-5 h-5 text-crafted-brand-lightViolet" />}
                items={popularSeasonList}
                variant="standard"
              />
            </div>
          </>
        )}

        {/* Trending Tab View */}
        {activeNavTab === 'trending' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-crafted-border">
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-bold font-serif text-white flex items-center gap-3">
                  <Flame className="w-8 h-8 text-crafted-brand-rust" />
                  Trending Anime
                </h1>
                <p className="text-xs text-crafted-text-dim">
                  Real-time broadcast chart updated live via AniList GraphQL V2
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {trendingList.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} isGrid={true} />
              ))}
            </div>
          </div>
        )}

        {/* Seasonal Tab View */}
        {activeNavTab === 'seasonal' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-crafted-border flex-wrap gap-4">
                <div className="space-y-1">
                  <h1 className="text-3xl sm:text-4xl font-bold font-serif text-white flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-crafted-brand-lightViolet" />
                    Seasonal Anime Schedule
                  </h1>
                  <p className="text-xs text-crafted-text-dim">
                    Showing {selectedSeason} {selectedSeasonYear} broadcast charts
                  </p>
                </div>

                {/* Season & Year Switcher */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center p-1 rounded-xl bg-crafted-surface border border-crafted-border">
                    {seasons.map((season) => (
                      <button
                        key={season}
                        onClick={() => setSelectedSeason(season, selectedSeasonYear)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                          selectedSeason === season
                            ? 'bg-crafted-brand-rust text-white shadow-crafted-glow'
                            : 'text-crafted-text-dim hover:text-white'
                        }`}
                      >
                        {season}
                      </button>
                    ))}
                  </div>

                  <select
                    value={selectedSeasonYear}
                    onChange={(e) => setSelectedSeason(selectedSeason, Number(e.target.value))}
                    className="px-3 py-1.5 rounded-xl bg-crafted-surface border border-crafted-border text-crafted-text text-xs font-mono focus:outline-none cursor-pointer"
                  >
                    {years.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid */}
              {isLoading ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-crafted-brand-rust border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-mono text-crafted-text-dim">Loading seasonal anime...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                  {popularSeasonList.map((anime) => (
                    <AnimeCard key={anime.id} anime={anime} isGrid={true} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Browse Tab View */}
        {activeNavTab === 'browse' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
            <div className="space-y-6">
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-bold font-serif text-white flex items-center gap-3">
                  <Layers className="w-8 h-8 text-crafted-brand-rust" />
                  Browse Anime Catalog
                </h1>
                <p className="text-xs text-crafted-text-dim">
                  Multi-filter discovery across genres, format, and popularity ranking
                </p>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex items-center gap-3 flex-wrap bg-crafted-panel/60 p-4 rounded-2xl border border-crafted-border">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-crafted-brand-rust absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      applyBrowseFilters();
                    }}
                    placeholder="Search by title, keywords..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-crafted-bg border border-crafted-border text-crafted-text placeholder:text-crafted-text-dim focus:outline-none focus:border-crafted-brand-rust"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-crafted-text-dim hidden sm:inline">Format:</span>
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-crafted-bg border border-crafted-border text-crafted-text text-xs font-mono focus:outline-none cursor-pointer"
                  >
                    {formats.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-crafted-brand-lightViolet" />
                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value as any)}
                    className="px-3 py-2 rounded-xl bg-crafted-bg border border-crafted-border text-crafted-text text-xs font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="POPULARITY_DESC">Most Popular</option>
                    <option value="SCORE_DESC">Highest Rated</option>
                    <option value="TRENDING_DESC">Trending</option>
                    <option value="START_DATE_DESC">Newest First</option>
                  </select>
                </div>
              </div>

              {/* Genre Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <Filter className="w-4 h-4 text-crafted-brand-rust shrink-0" />
                {genres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedGenre === genre
                        ? 'bg-crafted-brand-rust text-white shadow-crafted-glow'
                        : 'bg-crafted-surface hover:bg-crafted-surface-hover text-crafted-text-muted hover:text-white border border-crafted-border'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>

              {/* Grid */}
              {isLoading ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-crafted-brand-rust border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-mono text-crafted-text-dim">Filtering anime catalog...</p>
                </div>
              ) : browseList.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <Sparkles className="w-10 h-10 text-crafted-text-dim opacity-40 mx-auto" />
                  <p className="text-sm text-crafted-text">No anime found matching selected filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                  {browseList.map((anime) => (
                    <AnimeCard key={anime.id} anime={anime} isGrid={true} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MyAnimeList Watchlist & Scrobble Hub View (Phase 5) */}
        {activeNavTab === 'watchlist' && <MALWatchlistHub />}
      </main>

      {/* Crafted Co. Branded Footer */}
      <Footer />

      {/* Player, Search, and Account Modals */}
      <VideoPlayerModal />
      <SearchModal />
      <MALLoginModal />
    </div>
  );
};
