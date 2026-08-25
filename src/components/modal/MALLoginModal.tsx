import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Lock,
  LogOut,
  RefreshCw,
  ExternalLink,
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
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleMALOAuth = async () => {
    setErrorMessage('');
    setIsAuthorizing(true);
    try {
      if (typeof window !== 'undefined' && (window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        const res = await ipcRenderer.invoke('open-mal-oauth');
        if (res?.success && res?.username) {
          const ok = await loginMAL(res.username);
          if (!ok) setErrorMessage('Failed to fetch MyAnimeList profile.');
        }
      } else {
        window.open('https://myanimelist.net/login.php', '_blank', 'width=650,height=720');
      }
    } catch (e) {
      console.warn('MAL OAuth failed', e);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleUsernameSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    setErrorMessage('');

    const ok = await loginMAL(usernameInput.trim());
    if (!ok) {
      setErrorMessage(`Could not connect MyAnimeList account for "${usernameInput}". Please verify your username on myanimelist.net`);
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
              {user.isLoggedIn ? 'MyAnimeList Account Sync' : 'Connect MyAnimeList Account'}
            </h3>
          </div>
          <p className="text-xs text-crafted-text-dim">
            Official MyAnimeList Direct Cloud Sync & Real-Time Scrobbling
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
                className="w-14 h-14 rounded-xl object-cover border-2 border-crafted-brand-rust shadow-crafted-glow"
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
          /* Sign In Form */
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleMALOAuth}
              disabled={isAuthorizing}
              className="w-full py-2.5 px-4 rounded-xl bg-crafted-button text-white font-bold text-xs flex items-center justify-between shadow-crafted-glow hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Sign In with MyAnimeList (Official Window)</span>
              </span>
              <span className="text-[10px] font-mono bg-black/30 px-2 py-0.5 rounded">MAL Auth</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-crafted-border" />
              <span className="flex-shrink mx-3 text-[10px] font-mono text-crafted-text-dim uppercase">
                Or Connect by Username
              </span>
              <div className="flex-grow border-t border-crafted-border" />
            </div>

            <form onSubmit={handleUsernameSync} className="space-y-3">
              <div className="space-y-1">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Enter your MyAnimeList username..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-crafted-bg border border-crafted-border text-crafted-text text-xs focus:outline-none focus:border-crafted-brand-rust"
                  required
                />
              </div>

              {errorMessage && (
                <p className="text-xs text-rose-400 font-mono bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSyncing}
                className="w-full py-2.5 rounded-xl bg-crafted-surface hover:bg-crafted-surface-hover text-white font-semibold text-xs flex items-center justify-center gap-2 border border-crafted-border disabled:opacity-50 cursor-pointer"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing MAL Watchlist...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-crafted-brand-rust" />
                    <span>Sync All 6 MAL Categories</span>
                  </>
                )}
              </button>
            </form>

            <div className="p-3 rounded-xl bg-crafted-panel/40 border border-crafted-border text-[11px] text-crafted-text-dim space-y-1">
              <div className="flex items-center gap-1.5 text-crafted-brand-rustLight font-semibold">
                <Lock className="w-3.5 h-3.5" />
                <span>Zero External Database Required</span>
              </div>
              <p>
                Your Currently Watching, Completed, On Hold, Dropped, and Plan to Watch lists sync directly from MyAnimeList and are cached in local storage.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
