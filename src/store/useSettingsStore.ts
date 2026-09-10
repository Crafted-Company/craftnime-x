import { create } from 'zustand';

export interface SettingsState {
  seekStep: number;
  audioPreference: 'sub' | 'dub';
  preferredQuality: '1080p' | '720p' | 'auto';
  playerEngine: 'web' | 'mpv';
  isSettingsModalOpen: boolean;
  isMALModalOpen: boolean;

  // Actions
  setSeekStep: (step: number) => void;
  setAudioPreference: (pref: 'sub' | 'dub') => void;
  setPreferredQuality: (quality: '1080p' | '720p' | 'auto') => void;
  setPlayerEngine: (engine: 'web' | 'mpv') => void;
  openSettings: () => void;
  closeSettings: () => void;
  openMALModal: () => void;
  closeMALModal: () => void;
}

const SETTINGS_STORAGE_KEY = 'craftnime_user_settings_v1';

const getInitialSettings = () => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(SETTINGS_STORAGE_KEY) : null;
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {
    seekStep: 10,
    audioPreference: 'sub',
    preferredQuality: '1080p',
    playerEngine: typeof window !== 'undefined' && (window as any).require ? 'mpv' : 'web',
  };
};

const initial = getInitialSettings();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  seekStep: initial.seekStep || 10,
  audioPreference: initial.audioPreference || 'sub',
  preferredQuality: initial.preferredQuality || '1080p',
  playerEngine: initial.playerEngine || 'web',
  isSettingsModalOpen: false,
  isMALModalOpen: false,

  setSeekStep: (step: number) => {
    set({ seekStep: step });
    const current = get();
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          seekStep: step,
          audioPreference: current.audioPreference,
          preferredQuality: current.preferredQuality,
          playerEngine: current.playerEngine,
        })
      );
    }
  },

  setAudioPreference: (pref: 'sub' | 'dub') => {
    set({ audioPreference: pref });
    const current = get();
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          seekStep: current.seekStep,
          audioPreference: pref,
          preferredQuality: current.preferredQuality,
          playerEngine: current.playerEngine,
        })
      );
    }
  },

  setPreferredQuality: (quality: '1080p' | '720p' | 'auto') => {
    set({ preferredQuality: quality });
    const current = get();
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          seekStep: current.seekStep,
          audioPreference: current.audioPreference,
          preferredQuality: quality,
          playerEngine: current.playerEngine,
        })
      );
    }
  },

  setPlayerEngine: (engine: 'web' | 'mpv') => {
    set({ playerEngine: engine });
    const current = get();
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          seekStep: current.seekStep,
          audioPreference: current.audioPreference,
          preferredQuality: current.preferredQuality,
          playerEngine: engine,
        })
      );
    }
  },

  openSettings: () => set({ isSettingsModalOpen: true }),
  closeSettings: () => set({ isSettingsModalOpen: false }),
  openMALModal: () => set({ isMALModalOpen: true }),
  closeMALModal: () => set({ isMALModalOpen: false }),
}));
