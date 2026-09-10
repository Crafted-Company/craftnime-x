const { app, BrowserWindow, shell, session, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE' || err.message?.includes('EPIPE') || err.message?.includes('write')) {
    return; // Ignore pipe disconnect errors from media streaming
  }
  console.error('Unhandled Exception:', err);
});

// Enable GPU & Video Hardware Acceleration (Stremio & MPV standards)
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,PlatformHEVCDecoderSupport,CanvasOopRasterization');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-zero-copy');

let mainWindow = null;

function getExecutableScriptPath() {
  const tmpPath = path.join(app.getPath('temp'), 'craftnime_get_stream.sh');
  const sourcePath = path.join(__dirname, 'get_stream.sh');

  try {
    if (fs.existsSync(sourcePath)) {
      const content = fs.readFileSync(sourcePath, 'utf8');
      fs.writeFileSync(tmpPath, content, { mode: 0o755 });
      return tmpPath;
    }
  } catch (err) {
    console.warn('Failed to extract get_stream.sh to tmp', err);
  }
  return sourcePath;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 600,
    title: 'Craftnime',
    backgroundColor: '#120D0D',
    icon: path.join(__dirname, '../public/Craftnime.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
    autoHideMenuBar: true,
    show: true,
  });

  // Inject required Referer & Origin headers for HLS streaming servers
  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders };
    if (
      details.url.includes('anidb.app') ||
      details.url.includes('vidsrc') ||
      details.url.includes('2embed') ||
      details.url.includes('m3u8') ||
      details.url.includes('.ts')
    ) {
      requestHeaders['Referer'] = 'https://anidb.app/';
      requestHeaders['Origin'] = 'https://anidb.app';
      requestHeaders['User-Agent'] =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    }
    callback({ cancel: false, requestHeaders });
  });

  // Strip X-Frame-Options & CSP headers on stream domains
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    delete responseHeaders['content-security-policy-report-only'];
    callback({ cancel: false, responseHeaders });
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  const distPath = path.join(__dirname, '../dist/index.html');

  if (process.env.VITE_DEV) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow.loadFile(distPath);
    });
  } else {
    if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath);
    } else {
      mainWindow.loadURL('http://localhost:5173');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const torrentServer = require('./torrentServer.cjs');
const mpvBridge = require('./mpvBridge.cjs');
torrentServer.initHttpServer(8888);

// IPC Handlers for Sequential Torrent Streaming
ipcMain.handle('start-torrent-stream', async (event, { magnet, fileIdx }) => {
  try {
    const res = await torrentServer.startTorrent(magnet, fileIdx);
    return res;
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('stop-torrent-stream', async () => {
  torrentServer.stopTorrent();
  mpvBridge.stopMpvPlayer();
  return { success: true };
});

ipcMain.handle('get-torrent-stats', async () => {
  return torrentServer.getStats();
});

// IPC Handlers for Native MPV Player Engine (Stremio & Miru standard)
ipcMain.handle('launch-mpv-player', async (event, { streamUrl, animeTitle, episodeTitle }) => {
  return mpvBridge.startMpvPlayer(streamUrl, animeTitle, episodeTitle, (evt) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mpv-event', evt);
    }
  });
});

ipcMain.handle('stop-mpv-player', async () => {
  mpvBridge.stopMpvPlayer();
  return { success: true };
});

ipcMain.handle('send-mpv-command', async (event, { command }) => {
  mpvBridge.sendMpvCommand(command);
  return { success: true };
});

// Fallback IPC Handler to resolve live anime stream via script
ipcMain.handle('resolve-anime-stream', async (event, { title, episodeNumber, audioLanguage }) => {
  return new Promise((resolve) => {
    const scriptPath = getExecutableScriptPath();
    const lang = audioLanguage === 'dub' ? 'eng' : 'jpn';
    const cleanTitle = (title || '').replace(/['"]/g, '');
    const ep = parseInt(episodeNumber, 10) || 1;

    exec(`"${scriptPath}" "${cleanTitle}" ${ep} ${lang}`, { shell: '/bin/bash', timeout: 15000 }, (err, stdout) => {
      let streamUrl = null;
      let embedUrl = null;

      if (stdout) {
        const lines = stdout.split('\n');
        const streamLine = lines.find((l) => l.startsWith('STREAM_URL:'));
        const embedLine = lines.find((l) => l.startsWith('EMBED_URL:'));

        if (streamLine) streamUrl = streamLine.replace('STREAM_URL:', '').trim();
        if (embedLine) embedUrl = embedLine.replace('EMBED_URL:', '').trim();
      }

      resolve({
        streamUrl: streamUrl || null,
        embedUrl: embedUrl || null,
      });
    });
  });
});

// IPC Handler for MyAnimeList (MAL) Official Login
ipcMain.handle('open-mal-oauth', async () => {
  return new Promise((resolve) => {
    const malWindow = new BrowserWindow({
      width: 850,
      height: 720,
      parent: mainWindow,
      modal: true,
      title: 'Sign In to MyAnimeList',
      backgroundColor: '#120D0D',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    malWindow.loadURL('https://myanimelist.net/login.php');

    malWindow.webContents.on('did-navigate', async (event, url) => {
      if (url.includes('myanimelist.net') && !url.includes('login.php')) {
        try {
          const username = await malWindow.webContents.executeJavaScript(
            `document.querySelector('.header-profile-link')?.innerText?.trim() || document.querySelector('.username')?.innerText?.trim() || ''`
          );
          malWindow.close();
          resolve({ success: true, username: username || null });
        } catch {
          malWindow.close();
          resolve({ success: false, username: null });
        }
      }
    });

    malWindow.on('closed', () => {
      resolve({ success: false, username: null });
    });
  });
});

// IPC Handler for Two-Way MAL Cloud Scrobble Push
ipcMain.handle('update-mal-remote-status', async (event, { malAnimeId, numWatchedEpisodes, status }) => {
  try {
    const cookies = await session.defaultSession.cookies.get({ domain: 'myanimelist.net' });
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    const malStatusVal = status === 'completed' ? 2 : 1;
    const postBody = JSON.stringify({
      anime_id: malAnimeId,
      status: malStatusVal,
      num_watched_episodes: numWatchedEpisodes,
    });

    const response = await net.fetch('https://myanimelist.net/ownlist/anime/edit.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        Referer: `https://myanimelist.net/anime/${malAnimeId}`,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      body: postBody,
    });

    return { success: response.ok };
  } catch (err) {
    console.warn('Electron update-mal-remote-status error:', err);
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
