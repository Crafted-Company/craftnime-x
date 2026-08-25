const { app, BrowserWindow, shell, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 600,
    title: 'Craftnime — Next-Gen Anime Streaming',
    backgroundColor: '#1B1515',
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

  const loadApp = () => {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow.loadURL('http://localhost:5174').catch(() => {
        if (fs.existsSync(distPath)) {
          mainWindow.loadFile(distPath);
        }
      });
    });
  };

  loadApp();

  mainWindow.webContents.on('did-fail-load', () => {
    setTimeout(() => loadApp(), 1000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handler to resolve live anime stream using get_stream.sh
ipcMain.handle('resolve-anime-stream', async (event, { title, episodeNumber, audioLanguage }) => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'get_stream.sh');
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
      backgroundColor: '#1B1515',
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
