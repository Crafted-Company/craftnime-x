import React, { useState } from 'react';
import {
  X,
  Sparkles,
  LogOut,
  RefreshCw,
  User,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { useMALStore } from '../../store/useMALStore';
import { Badge } from '../common/Badge';

export const MALLoginModal: React.FC = () => {
  const {
    user,
    isLoginModalOpen,
    toggleLoginModal,
    loginMAL,
    logout,
    isAutoScrobbleEnabled,
    isAutoCompleteEnabled,
    toggleAutoScrobble,
    toggleAutoComplete,
    isSyncing,
  } = useMALStore();

  const [usernameInput, setUsernameInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = usernameInput.trim();
    if (!cleanUser) {
      setErrorMessage('Please enter your MyAnimeList username.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const ok = await loginMAL(cleanUser);
      if (ok) {
        setUsernameInput('');
        toggleLoginModal(false);
      } else {
        setErrorMessage(`Could not find or load MyAnimeList public library for "${cleanUser}". Please ensure the username is spelled correctly.`);
      }
    } catch (e) {
      setErrorMessage('Connection error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md bg-crafted-surface border border-crafted-border rounded-2xl shadow-2xl p-6 space-y-6">
        {/* Close Button */}
        <button
          onClick={() => toggleLoginModal(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-crafted-text-dim hover:text-white hover:bg-crafted-bg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-crafted-brand-rust/20 text-crafted-brand-rustLight">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold font-serif text-white">
              {user.isLoggedIn ? 'MyAnimeList Account Sync' : 'Connect MyAnimeList'}
            </h3>
          </div>
          <p className="text-xs text-crafted-text-dim">
            Direct Cloud Sync across Watching, Completed, Dropped & Plan to Watch
          </p>
        </div>

        {user.isLoggedIn ? (
          /* Logged In Profile View */
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-crafted-bg border border-crafted-border">
              <img
                src={user.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover border-2 border-crafted-brand-rust"
              />
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white truncate">{user.username}</h4>
                  <Badge variant="emerald" size="xs">
                    Connected
                  </Badge>
                </div>
                <p className="text-[11px] font-mono text-crafted-text-dim uppercase">
                  MyAnimeList Cloud Sync Active
                </p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-crafted-brand-rustLight pt-0.5">
                  <span>{user.episodesWatched} Eps</span>
                  <span>•</span>
                  <span>{user.totalAnime} Anime</span>
                  <span>•</span>
                  <span>★ {user.meanScore}</span>
                </div>
              </div>
            </div>

            {/* Sync Preferences Toggles */}
            <div className="space-y-2 p-3.5 rounded-xl bg-crafted-panel/50 border border-crafted-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-crafted-text font-medium">80% Mark Auto-Scrobble to MAL</span>
                <input
                  type="checkbox"
                  checked={isAutoScrobbleEnabled}
                  onChange={toggleAutoScrobble}
                  className="w-4 h-4 accent-crafted-brand-rust cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-crafted-text font-medium">Final Episode Series Auto-Completion</span>
                <input
                  type="checkbox"
                  checked={isAutoCompleteEnabled}
                  onChange={toggleAutoComplete}
                  className="w-4 h-4 accent-crafted-brand-rust cursor-pointer"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => loginMAL(user.username)}
                disabled={isSyncing}
                className="flex-1 py-2 rounded-xl bg-crafted-button text-white font-bold text-xs flex items-center justify-center gap-2 shadow-crafted-glow hover:brightness-110 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync MAL List'}</span>
              </button>

              <button
                onClick={logout}
                className="px-4 py-2 rounded-xl bg-crafted-surface hover:bg-rose-500/10 text-rose-400 border border-crafted-border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
        ) : (
          /* Direct Universal Username Form */
          <form onSubmit={handleConnect} className="space-y-4">
            <p className="text-xs text-crafted-text-muted leading-relaxed">
              Enter your MyAnimeList username to synchronize all your completed anime, watching progress, and categories without needing external popups.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-crafted-text-dim block">
                MyAnimeList Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-crafted-brand-rust absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="e.g. Aditya0973"
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-crafted-bg border border-crafted-border text-crafted-text placeholder:text-crafted-text-dim focus:outline-none focus:border-crafted-brand-rust font-mono"
                  autoFocus
                />
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-400 font-mono bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isSyncing}
              className="w-full py-3 px-4 rounded-xl bg-crafted-button text-white font-bold text-xs flex items-center justify-center gap-2 shadow-crafted-glow hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSubmitting || isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSubmitting || isSyncing ? 'Connecting & Syncing...' : 'Connect & Import Library'}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <div className="p-3.5 rounded-xl bg-crafted-panel/40 border border-crafted-border text-[11px] text-crafted-text-dim space-y-1.5">
              <div className="flex items-center gap-1.5 text-crafted-brand-rustLight font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>Instant Two-Way Cloud Synchronization</span>
              </div>
              <p>
                Compatible with all Android, Linux, and Windows platforms. Pulls all 390+ library entries directly.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
