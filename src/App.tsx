import React, { useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroBillboard } from './components/hero/HeroBillboard';
import { AnimeCarousel } from './components/carousel/AnimeCarousel';
import { AnimeDetailPage } from './components/details/AnimeDetailPage';
import { VideoPlayerModal } from './components/player/VideoPlayerModal';
import { StreamSelectModal } from './components/player/StreamSelectModal';
import { SearchModal } from './components/common/SearchModal';
import { MALLoginModal } from './components/modal/MALLoginModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { MALWatchlistHub } from './components/mal/MALWatchlistHub';
import { AnimeCard } from './components/carousel/AnimeCard';
import { useAnimeStore } from './store/useAnimeStore';
import { useMALStore } from './store/useMALStore';
import { useWatchedStore } from './store/useWatchedStore';
import { usePlayerStore } from './store/usePlayerStore';
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
    newEpisodesList,
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

  const { user, loginMAL, syncedCompletedList, syncedWatchingList } = useMALStore();
  const { syncFromMALList } = useWatchedStore();

  useEffect(() => {
    fetchInitialCatalog();

    // Auto-refresh MAL list and watched sync on launch if logged in
    if (user?.isLoggedIn && user?.username) {
      loginMAL(user.username);
    } else if (syncedCompletedList.length > 0 || syncedWatchingList.length > 0) {
      syncFromMALList(syncedCompletedList, syncedWatchingList);
    }
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
  const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
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

              {/* New Episodes */}
              {newEpisodesList.length > 0 && (
                <AnimeCarousel
                  title="New Episodes"
                  subtitle="Latest broadcast anime episodes just released"
                  icon={<Sparkles className="w-5 h-5 text-crafted-brand-rust" />}
                  badge="NEW"
                  items={newEpisodesList}
                  variant="standard"
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
                <p className="text-xs sm:text-sm text-crafted-text-dim">
                  Real-time global popularity rankings updated every hour
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {trendingList.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} isGrid />
              ))}
            </div>
          </div>
        )}

        {/* Seasonal Anime Tab */}
        {activeNavTab === 'seasonal' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-crafted-border">
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-bold font-serif text-white flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-crafted-brand-lightViolet" />
                  Seasonal Anime
                </h1>
                <p className="text-xs sm:text-sm text-crafted-text-dim">
                  Explore premiere broadcasts by season and broadcast year
                </p>
              </div>

              {/* Season / Year Filter Selectors */}
              <div className="flex items-center gap-3">
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value, selectedSeasonYear)}
                  className="bg-crafted-surface text-crafted-text text-xs font-mono px-3 py-2 rounded-xl border border-crafted-border focus:outline-none cursor-pointer"
                >
                  {seasons.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedSeasonYear}
                  onChange={(e) => setSelectedSeason(selectedSeason, parseInt(e.target.value, 10))}
                  className="bg-crafted-surface text-crafted-text text-xs font-mono px-3 py-2 rounded-xl border border-crafted-border focus:outline-none cursor-pointer"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {popularSeasonList.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} isGrid />
              ))}
            </div>
          </div>
        )}

        {/* Browse & Filter Catalog Tab */}
        {activeNavTab === 'browse' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-crafted-border">
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-bold font-serif text-white flex items-center gap-3">
                  <Layers className="w-8 h-8 text-crafted-brand-rust" />
                  Explore Catalog
                </h1>
                <p className="text-xs sm:text-sm text-crafted-text-dim">
                  Filter across 10,000+ anime titles by format, genre, and score
                </p>
              </div>
            </div>

            {/* Filter Bar Controls */}
            <div className="bg-crafted-surface p-4 sm:p-5 rounded-2xl border border-crafted-border space-y-4 shadow-crafted-card">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search Term */}
                <div className="relative">
                  <Search className="w-4 h-4 text-crafted-brand-rust absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && applyBrowseFilters()}
                    placeholder="Search by title..."
                    className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-crafted-bg border border-crafted-border text-crafted-text placeholder:text-crafted-text-dim focus:outline-none focus:border-crafted-brand-rust"
                  />
                </div>

                {/* Genre Selector */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-crafted-brand-rust shrink-0" />
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="w-full bg-crafted-bg text-crafted-text text-xs px-3 py-2 rounded-xl border border-crafted-border focus:outline-none cursor-pointer"
                  >
                    {genres.map((g) => (
                      <option key={g} value={g}>
                        {g === 'All' ? 'All Genres' : g}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Format Selector */}
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-crafted-brand-lightViolet shrink-0" />
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    className="w-full bg-crafted-bg text-crafted-text text-xs px-3 py-2 rounded-xl border border-crafted-border focus:outline-none cursor-pointer"
                  >
                    {formats.map((f) => (
                      <option key={f} value={f}>
                        {f === 'ALL' ? 'All Formats' : f}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Order */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-amber-400 shrink-0" />
                  <select
                    value={selectedSort}
                    onChange={(e) => setSelectedSort(e.target.value as any)}
                    className="w-full bg-crafted-bg text-crafted-text text-xs px-3 py-2 rounded-xl border border-crafted-border focus:outline-none cursor-pointer"
                  >
                    <option value="POPULARITY_DESC">Most Popular</option>
                    <option value="TRENDING_DESC">Trending</option>
                    <option value="SCORE_DESC">Highest Rated</option>
                    <option value="START_DATE_DESC">Newest Added</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Grid */}
            {isLoading ? (
              <div className="py-24 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-crafted-brand-rust border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-mono text-crafted-text-dim">Filtering AniList Catalog...</p>
              </div>
            ) : browseList.length === 0 ? (
              <div className="py-24 text-center space-y-3">
                <Sparkles className="w-8 h-8 text-crafted-brand-rustLight mx-auto" />
                <p className="text-sm font-semibold text-white">No results found</p>
                <p className="text-xs text-crafted-text-dim">Try broadening your search or genre filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {browseList.map((anime) => (
                  <AnimeCard key={anime.id} anime={anime} isGrid />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Watchlist & MAL Hub Tab */}
        {activeNavTab === 'watchlist' && <MALWatchlistHub />}
      </main>

      {/* Global Footer */}
      <Footer />

      {/* Persistent Video Player Modal */}
      <VideoPlayerModal />

      {/* Stremio / Torrentio Stream Selection Modal */}
      <StreamSelectModal
        isOpen={usePlayerStore((s) => s.isStreamSelectOpen)}
        onClose={usePlayerStore((s) => s.closeStreamSelector)}
        anime={usePlayerStore((s) => s.activeAnime)}
        episode={usePlayerStore((s) => s.activeEpisode)}
        onSelectStream={(torrent) => usePlayerStore.getState().playWithTorrent(torrent)}
      />

      {/* Search Modal */}
      <SearchModal />

      {/* MyAnimeList OAuth Authentication Modal */}
      <MALLoginModal />

      {/* Settings & Preferences Modal */}
      <SettingsModal />
    </div>
  );
};
