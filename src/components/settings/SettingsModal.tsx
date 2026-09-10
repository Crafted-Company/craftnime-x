import React, { useState } from 'react';
import {
  X,
  Settings,
  Sliders,
  Sparkles,
  RefreshCw,
  LogOut,
  Download,
  Upload,
  CheckCircle2,
  Tv,
  Film,
  Volume2,
  Clock,
  Trash2,
} from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useMALStore } from '../../store/useMALStore';
import { useWatchedStore } from '../../store/useWatchedStore';
import { useAnimeStore } from '../../store/useAnimeStore';
import { Badge } from '../common/Badge';

export const SettingsModal: React.FC = () => {
  const {
    seekStep,
    audioPreference,
    preferredQuality,
    playerEngine,
    isSettingsModalOpen,
    closeSettings,
    setSeekStep,
    setAudioPreference,
    setPreferredQuality,
    setPlayerEngine,
  } = useSettingsStore();

  const {
    user,
    loginMAL,
    logout,
    isSyncing,
    toggleAutoScrobble,
    isAutoScrobbleEnabled,
  } = useMALStore();

  const { exportBackupJSON, importBackupJSON } = useWatchedStore();
  const { continueWatchingList } = useAnimeStore();

  const [usernameInput, setUsernameInput] = useState('');
  const [malError, setMalError] = useState('');
  const [isSubmittingMal, setIsSubmittingMal] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isSettingsModalOpen) return null;

  const handleConnectMal = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = usernameInput.trim();
    if (!clean) return;
    setMalError('');
    setIsSubmittingMal(true);
    try {
      const ok = await loginMAL(clean);
      if (ok) {
        setUsernameInput('');
      } else {
        setMalError(`Could not find or load library for "${clean}".`);
      }
    } catch {
      setMalError('Connection failed.');
    } finally {
      setIsSubmittingMal(false);
    }
  };

  const handleExport = () => {
    const jsonStr = exportBackupJSON();
    navigator.clipboard.writeText(jsonStr);
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 3000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const ok = importBackupJSON(text);
        if (ok) {
          setImportStatus('Successfully restored library data!');
          setTimeout(() => setImportStatus(null), 4000);
        } else {
          setImportStatus('Failed to parse backup file.');
        }
      } catch {
        setImportStatus('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearHistory = () => {
    if (confirm('Clear all Continue Watching history?')) {
      localStorage.removeItem('craftnime_continue_watching_v1');
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-crafted-surface border border-crafted-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-crafted-border flex items-center justify-between bg-black/30 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-crafted-brand-rust/20 text-crafted-brand-rustLight border border-crafted-brand-rust/30">
              <Settings className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-serif text-white flex items-center gap-2">
                Settings & Preferences
              </h3>
              <p className="text-xs text-crafted-text-dim">
                Configure player playback, MyAnimeList sync & app defaults
              </p>
            </div>
          </div>

          <button
            onClick={closeSettings}
            className="p-2 rounded-xl text-crafted-text-dim hover:text-white hover:bg-crafted-panel border border-crafted-border transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scroll */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* SECTION 1: PLAYER PLAYBACK CONTROLS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1.5 border-b border-crafted-border">
              <Sliders className="w-4 h-4 text-crafted-brand-rustLight" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-crafted-text">
                Player & Seeking Controls
              </h4>
            </div>

            {/* Seek Interval Buttons */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-crafted-text font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-crafted-brand-rustLight" />
                  Quick Seek Step Duration
                </span>
                <span className="font-mono text-crafted-brand-rustLight font-bold">{seekStep} seconds</span>
              </div>
              <p className="text-[11px] text-crafted-text-dim">
                Controls the time skipped when pressing arrow keys or player skip buttons.
              </p>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[5, 10, 15, 30].map((step) => (
                  <button
                    key={step}
                    onClick={() => setSeekStep(step)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      seekStep === step
                        ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust shadow-md'
                        : 'bg-crafted-panel text-crafted-text border-crafted-border hover:border-white/20'
                    }`}
                  >
                    ±{step}s
                  </button>
                ))}
              </div>
            </div>

            {/* Default Audio Language */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-crafted-text font-medium flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-crafted-brand-rustLight" />
                  Default Audio Track
                </span>
                <span className="font-mono text-crafted-brand-rustLight font-bold uppercase">{audioPreference}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setAudioPreference('sub')}
                  className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    audioPreference === 'sub'
                      ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust shadow-md'
                      : 'bg-crafted-panel text-crafted-text border-crafted-border hover:border-white/20'
                  }`}
                >
                  Japanese (Subbed)
                </button>
                <button
                  onClick={() => setAudioPreference('dub')}
                  className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    audioPreference === 'dub'
                      ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust shadow-md'
                      : 'bg-crafted-panel text-crafted-text border-crafted-border hover:border-white/20'
                  }`}
                >
                  English (Dubbed)
                </button>
              </div>
            </div>

            {/* Preferred Video Quality */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-crafted-text font-medium flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-crafted-brand-rustLight" />
                  Preferred Video Quality
                </span>
                <span className="font-mono text-crafted-brand-rustLight font-bold">{preferredQuality}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(['1080p', '720p', 'auto'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => setPreferredQuality(q)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                      preferredQuality === q
                        ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust shadow-md'
                        : 'bg-crafted-panel text-crafted-text border-crafted-border hover:border-white/20'
                    }`}
                  >
                    {q === 'auto' ? 'Auto Adapt' : `${q} Master`}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Player Engine */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-crafted-text font-medium flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-crafted-brand-rustLight" />
                  Player Engine
                </span>
                <span className="font-mono text-crafted-brand-rustLight font-bold uppercase">{playerEngine}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setPlayerEngine('web')}
                  className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    playerEngine === 'web'
                      ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust shadow-md'
                      : 'bg-crafted-panel text-crafted-text border-crafted-border hover:border-white/20'
                  }`}
                >
                  Web Decoder (Default)
                </button>
                <button
                  onClick={() => setPlayerEngine('mpv')}
                  className={`py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    playerEngine === 'mpv'
                      ? 'bg-crafted-brand-rust text-white border-crafted-brand-rust shadow-md'
                      : 'bg-crafted-panel text-crafted-text border-crafted-border hover:border-white/20'
                  }`}
                >
                  External MPV Player
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2: MYANIMELIST CLOUD SYNC */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-crafted-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-crafted-brand-rustLight" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-crafted-text">
                  MyAnimeList Sync
                </h4>
              </div>
              {user.isLoggedIn && (
                <Badge variant="emerald" size="xs">
                  Connected
                </Badge>
              )}
            </div>

            {user.isLoggedIn ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-crafted-panel border border-crafted-border">
                  <img
                    src={user.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-xl object-cover border-2 border-crafted-brand-rust shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <h5 className="text-sm font-bold text-white truncate">{user.username}</h5>
                    <p className="text-xs font-mono text-crafted-text-dim">
                      {user.episodesWatched} episodes watched • {user.meanScore || '0'} score
                    </p>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
                    title="Disconnect MAL"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loginMAL(user.username)}
                    disabled={isSyncing}
                    className="flex-1 py-2.5 rounded-xl bg-crafted-brand-rust hover:bg-crafted-brand-rust/90 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing Library...' : 'Sync Now with MAL'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-crafted-bg/60 border border-crafted-border text-xs">
                  <span className="text-crafted-text">Auto-Scrobble watched episodes (80% threshold)</span>
                  <input
                    type="checkbox"
                    checked={isAutoScrobbleEnabled}
                    onChange={toggleAutoScrobble}
                    className="w-4 h-4 accent-crafted-brand-rust cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnectMal} className="space-y-3">
                <p className="text-xs text-crafted-text-dim">
                  Connect your public MyAnimeList username to automatically sync your Watching, Completed, and Plan to Watch lists across all devices.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="Enter MyAnimeList username..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-crafted-bg border border-crafted-border text-white text-xs font-mono placeholder:text-crafted-text-dim focus:border-crafted-brand-rust outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingMal || !usernameInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-crafted-brand-rust hover:bg-crafted-brand-rust/90 text-white text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingMal ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
                {malError && <p className="text-xs text-rose-400">{malError}</p>}
              </form>
            )}
          </div>

          {/* SECTION 3: DATA BACKUP & RESTORE */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 pb-1.5 border-b border-crafted-border">
              <Download className="w-4 h-4 text-crafted-brand-rustLight" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-crafted-text">
                Library Backup & Data
              </h4>
            </div>

            <p className="text-[11px] text-crafted-text-dim">
              Export your watch history, watchlist, and episode progress into a JSON file or restore on another machine.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExport}
                className="py-2.5 px-3 rounded-xl bg-crafted-panel hover:bg-crafted-surface border border-crafted-border text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copiedBackup ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
                <span>{copiedBackup ? 'Copied to Clipboard!' : 'Export to Clipboard'}</span>
              </button>

              <label className="py-2.5 px-3 rounded-xl bg-crafted-panel hover:bg-crafted-surface border border-crafted-border text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Restore Backup</span>
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>

            {importStatus && <p className="text-xs font-mono text-emerald-400">{importStatus}</p>}

            {continueWatchingList.length > 0 && (
              <div className="pt-2">
                <button
                  onClick={handleClearHistory}
                  className="text-xs font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Continue Watching History ({continueWatchingList.length} items)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
