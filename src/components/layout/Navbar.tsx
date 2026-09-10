import React, { useState, useEffect } from 'react';
import {
  Search,
  Bookmark,
  User,
  Layers,
  Tv,
  Menu,
  X,
  Flame,
  Settings,
  Sparkles,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { useAnimeStore } from '../../store/useAnimeStore';
import { useMALStore } from '../../store/useMALStore';
import { useSettingsStore } from '../../store/useSettingsStore';

interface NavItem {
  id: 'home' | 'trending' | 'seasonal' | 'browse' | 'watchlist';
  label: string;
  icon: React.ReactNode;
  count?: number;
}

export const Navbar: React.FC = () => {
  const { activeNavTab, setActiveNavTab, setSearchModalOpen, watchlist } = useAnimeStore();
  const { user, toggleLoginModal, logout, syncedWatchingList, syncedPlanList } = useMALStore();
  const { openSettings } = useSettingsStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const displayWatchlistCount = user.isLoggedIn
    ? (syncedWatchingList.length + syncedPlanList.length)
    : watchlist.length;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Global keyboard shortcut: Ctrl+K or '/' opens search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && (e.target as HTMLElement).tagName !== 'INPUT')) {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: <Tv className="w-4 h-4" /> },
    { id: 'trending', label: 'Trending', icon: <Flame className="w-4 h-4" /> },
    { id: 'seasonal', label: 'Seasonal', icon: <Layers className="w-4 h-4" /> },
    { id: 'browse', label: 'Browse', icon: <Search className="w-4 h-4" /> },
    { id: 'watchlist', label: 'Watchlist', icon: <Bookmark className="w-4 h-4" />, count: displayWatchlistCount },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-crafted-bg/95 backdrop-blur-xl border-b border-crafted-border shadow-2xl py-2.5'
            : 'bg-gradient-to-b from-crafted-bg via-crafted-bg/85 to-transparent py-3.5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
          {/* Left: Brand Logo & Desktop Nav Links */}
          <div className="flex items-center gap-6">
            <div onClick={() => setActiveNavTab('home')}>
              <Logo size="sm" />
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 bg-crafted-surface/70 p-1 rounded-xl border border-crafted-border/60 backdrop-blur-md">
              {navItems.map((item) => {
                const isActive = activeNavTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveNavTab(item.id)}
                    className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'text-white bg-crafted-brand-rust shadow-crafted-glow'
                        : 'text-crafted-text-muted hover:text-crafted-text hover:bg-crafted-surface-hover/80'
                    }`}
                  >
                    {item.label}
                    {item.count !== undefined && item.count > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          isActive
                            ? 'bg-white/25 text-white'
                            : 'bg-crafted-brand-rust/25 text-crafted-brand-rustLight'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Search, Account & Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Spotlight Search Button */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-crafted-surface/80 hover:bg-crafted-surface border border-crafted-border text-crafted-text-muted text-xs transition-all shadow-crafted-card cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-crafted-brand-rust" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono text-crafted-text-dim bg-crafted-bg border border-crafted-border rounded">
                Ctrl K
              </kbd>
            </button>

            {/* Account & Profile Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-crafted-panel hover:bg-crafted-surface border border-crafted-border text-xs font-mono transition-all cursor-pointer"
              >
                {user.isLoggedIn ? (
                  <>
                    <div className="relative">
                      <img
                        src={user.avatarUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 rounded-md object-cover border border-crafted-brand-rust"
                      />
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-crafted-bg animate-pulse" />
                    </div>
                    <span className="hidden sm:inline text-crafted-text font-medium truncate max-w-[90px]">
                      {user.username}
                    </span>
                    <span className="text-[10px] px-1 rounded bg-crafted-brand-violet/30 text-crafted-brand-lightViolet font-mono uppercase">
                      MAL
                    </span>
                    <ChevronDown className="w-3 h-3 text-crafted-text-dim" />
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5 text-crafted-brand-rust" />
                    <span className="text-crafted-text-muted hover:text-white">
                      Profile
                    </span>
                    <ChevronDown className="w-3 h-3 text-crafted-text-dim" />
                  </>
                )}
              </button>

              {/* Profile Dropdown Popup */}
              {isProfileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-11 w-56 bg-crafted-surface/95 border border-crafted-border rounded-2xl shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 space-y-1">
                    <div className="px-3 py-2 border-b border-crafted-border/60">
                      <p className="text-xs font-bold text-white truncate">
                        {user.isLoggedIn ? user.username : 'Craftnime User'}
                      </p>
                      <p className="text-[10px] font-mono text-crafted-brand-rustLight">
                        {user.isLoggedIn ? `${user.episodesWatched} episodes synced` : 'Guest Mode'}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        openSettings();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-crafted-text hover:text-white hover:bg-crafted-panel transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-crafted-brand-rustLight" />
                      <span>Player Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        toggleLoginModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-crafted-text hover:text-white hover:bg-crafted-panel transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-crafted-brand-lightViolet" />
                      <span>MyAnimeList Sync</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsProfileDropdownOpen(false);
                        setActiveNavTab('watchlist');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-crafted-text hover:text-white hover:bg-crafted-panel transition-colors cursor-pointer"
                    >
                      <Bookmark className="w-4 h-4 text-amber-400" />
                      <span>Watchlist ({displayWatchlistCount})</span>
                    </button>

                    {user.isLoggedIn && (
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer pt-1 border-t border-crafted-border/60"
                      >
                        <X className="w-4 h-4" />
                        <span>Disconnect Account</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-crafted-surface hover:bg-crafted-surface-hover border border-crafted-border text-crafted-text md:hidden transition-colors cursor-pointer"
              title="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer Navigation */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-crafted-surface border-l border-crafted-border p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-crafted-border">
                <Logo size="sm" />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-crafted-text-dim hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Account Strip */}
              <div
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  toggleLoginModal(true);
                }}
                className="flex items-center gap-3 p-3 rounded-xl bg-crafted-bg border border-crafted-border cursor-pointer hover:border-crafted-brand-rust transition-colors"
              >
                {user.isLoggedIn ? (
                  <>
                    <img
                      src={user.avatarUrl}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-xl object-cover border border-crafted-brand-rust"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">{user.username}</h4>
                      <p className="text-[10px] text-emerald-400 font-mono">
                        Synced • {user.episodesWatched} Eps
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-crafted-brand-rust font-semibold">
                    <User className="w-4 h-4" />
                    <span>Connect AniList / MAL</span>
                  </div>
                )}
              </div>

              {/* Navigation Items */}
              <div className="space-y-1">
                {navItems.map((item) => {
                  const isActive = activeNavTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveNavTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-crafted-brand-rust text-white shadow-crafted-glow'
                          : 'text-crafted-text-muted hover:bg-crafted-bg hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      {item.count !== undefined && item.count > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/20 text-white">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openSettings();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-crafted-text-muted hover:bg-crafted-bg hover:text-white transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-crafted-brand-rustLight" />
                    <span>Settings & Preferences</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Logout / Switch Account */}
            {user.isLoggedIn && (
              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-rose-400 border border-crafted-border hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect Account</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar for quick 1-thumb switching */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-crafted-bg/95 backdrop-blur-xl border-t border-crafted-border px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeNavTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNavTab(item.id)}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium transition-all ${
                isActive
                  ? 'text-crafted-brand-rustLight font-bold scale-105'
                  : 'text-crafted-text-dim hover:text-crafted-text'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
