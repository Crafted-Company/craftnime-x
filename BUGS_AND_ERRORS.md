# 🐛 Craftnime - Known Bugs, Error Logs & Roadmap

This document logs all ongoing bugs, backend authentication limitations, platform quirks, and pending tasks for upcoming releases.

---

## 1. 🔐 MyAnimeList (MAL) Authentication & Cloud Sync on Mobile
* **Status**: In Investigation / Documented for Future REST OAuth Implementation.
* **Observed Behavior**:
  - Direct loading from `myanimelist.net/animelist/{username}/load.json` is restricted by CORS and Cloudflare protection inside Android WebViews.
  - Writing progress back to MAL requires full OAuth2 PKCE token authorization with custom redirect scheme (`craftnime://auth/mal`).
* **Planned Solution**:
  - Implement full MAL REST v2 OAuth PKCE authorization with custom URI scheme callback.
  - In the meantime, local watchlist and watch history are backed up via **1-Click Local Backup (`Export Backup` / `Import Backup`)** in JSON format.

---

## 2. 📱 Android APK Native Video Stream Engine
* **Status**: Implemented with native Java stream resolution bridge (`NativeStreamBridge` in `MainActivity.java`).
* **Architecture**:
  - Electron uses `get_stream.sh` with custom TLS/ciphers.
  - Android APK uses background multi-threaded `NativeStreamBridge` to parse AniDB / VidSrc m3u8 masters, bypassing WebView TLS restrictions.
  - Enabled unrestricted DOM storage, media playback permissions, and network security cleartext traffic (`usesCleartextTraffic="true"`).

---

## 3. 🖥️ Windows Portable Executable
* **Status**: Working (`release/Craftnime 1.0.0.exe` ~95 MB).
* **Notes**: Single portable executable with embedded Chromium runtime and HLS engine.

---

## 4. 🐧 Linux Packaging
* **Status**: Working (`release/Craftnime-1.0.0.AppImage` ~140 MB & installed to `~/.local/bin/craftnime`).

---

## 5. 📚 Future Manga Reader Integration
* **Planned Feature**: Manga reader engine supporting vertical webtoon scroll, right-to-left paging, and chapter tracking.

---

## 6. ⏱️ Mid-Stream Resume Timestamp Seeking
* **Status**: Logged for Future Fine-Tuning.
* **Observed Behavior**:
  - Automatically seeking an HLS stream to a mid-point timestamp (e.g. 5:20) on initial load before the player has finished buffering its initial segment playlist can stall the HTML5 `<video>` demuxer on both desktop and mobile.
* **Temporary Safe Behavior**:
  - All episodes cleanly start from 0:00 immediately upon opening with 0 stall and instant buffering.
  - Anime entries remain in the **Currently Watching / Continue Watching** carousel as expected so users can easily re-access their series.
* **Planned Solution**:
  - Add an optional user prompt toast ("Resume from 05:20? [Resume] [Restart]") that performs seeking only after `HLS.Events.BUFFER_APPENDED` and `HLS.Events.FRAG_BUFFERED` have fully stabilized.

