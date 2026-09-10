const http = require('http');
const torrentStream = require('torrent-stream');
const path = require('path');
const os = require('os');
const fs = require('fs');

let activeEngine = null;
let activeFile = null;
let activeMagnet = null;
let activeFfmpeg = null;
let activeFileStream = null;
let serverInstance = null;

const DEFAULT_PORT = 8888;
const CACHE_DIR = path.join(os.tmpdir(), 'craftnime_torrent_cache');

if (!fs.existsSync(CACHE_DIR)) {
  try { fs.mkdirSync(CACHE_DIR, { recursive: true }); } catch (e) {}
}

const TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.tracker.cl:1337/announce',
  'udp://tracker.openbittorrent.com:80/announce',
  'udp://opentracker.i2p.rocks:6969/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://open.stealth.si:80/announce',
  'http://nyaa.tracker.wf:7777/announce',
  'udp://explodie.org:6969/announce',
  'udp://tracker.filemail.com:6969/announce',
  'udp://tracker.coppersurfer.tk:6969/announce',
  'udp://tracker.internetwarriors.net:1337/announce',
];

function startTorrent(magnetUri, fileIdx) {
  return new Promise((resolve, reject) => {
    stopTorrent();

    activeMagnet = magnetUri;

    // Parse all trackers from magnet URI and merge with defaults
    const magnetTrackers = [];
    try {
      const params = magnetUri.split('&').filter(p => p.startsWith('tr=')).map(p => decodeURIComponent(p.replace('tr=', '')));
      magnetTrackers.push(...params);
    } catch (e) {}

    const allTrackers = Array.from(new Set([...TRACKERS, ...magnetTrackers]));

    const engine = torrentStream(magnetUri, {
      path: CACHE_DIR,
      trackers: allTrackers,
      connections: 120,
    });

    activeEngine = engine;

    const timeout = setTimeout(() => {
      if (!activeFile) {
        reject(new Error('Torrent metadata timeout'));
      }
    }, 15000);

    engine.on('ready', () => {
      clearTimeout(timeout);
      
      // If exact file index is specified from Stremio stream object, select it
      if (typeof fileIdx === 'number' && engine.files[fileIdx]) {
        activeFile = engine.files[fileIdx];
      } else {
        // Find main video file (largest .mkv, .mp4, etc.)
        const videoFiles = engine.files.filter(f => 
          f.name.endsWith('.mkv') || f.name.endsWith('.mp4') || f.name.endsWith('.webm') || f.name.endsWith('.avi')
        );

        if (videoFiles.length === 0) {
          activeFile = engine.files.reduce((prev, curr) => (curr.length > prev.length ? curr : prev), engine.files[0]);
        } else {
          activeFile = videoFiles.reduce((prev, curr) => (curr.length > prev.length ? curr : prev), videoFiles[0]);
        }
      }

      if (activeFile) {
        activeFile.select();

        // Immediately request and prioritize the first 15 pieces (video header / moov atom / EBML) and index
        try {
          if (engine.torrent && engine.torrent.pieceLength) {
            const pieceLength = engine.torrent.pieceLength;
            const startPiece = Math.floor(activeFile.offset / pieceLength);
            const endPiece = Math.floor((activeFile.offset + activeFile.length) / pieceLength);

            for (let p = startPiece; p < Math.min(startPiece + 20, endPiece); p++) {
              if (typeof engine.critical === 'function') {
                engine.critical(p, 1);
              }
            }
            if (endPiece > startPiece && typeof engine.critical === 'function') {
              engine.critical(endPiece, 1);
            }
          }
        } catch (pErr) {}

        resolve({
          fileName: activeFile.name,
          length: activeFile.length,
          streamUrl: `http://127.0.0.1:${DEFAULT_PORT}/stream?t=${Date.now()}`,
        });
      } else {
        reject(new Error('No video file found in torrent'));
      }
    });

    engine.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function stopTorrent() {
  if (activeFfmpeg) {
    try { activeFfmpeg.kill('SIGKILL'); } catch (e) {}
    activeFfmpeg = null;
  }
  if (activeFileStream) {
    try { activeFileStream.destroy(); } catch (e) {}
    activeFileStream = null;
  }
  if (activeEngine) {
    try {
      activeEngine.destroy();
    } catch (e) {}
    activeEngine = null;
    activeFile = null;
    activeMagnet = null;
  }
}

function getStats() {
  if (!activeEngine || !activeFile) {
    return { isReady: false, downloadSpeed: 0, uploadSpeed: 0, numPeers: 0, progress: 0 };
  }

  const swarm = activeEngine.swarm;
  return {
    isReady: true,
    fileName: activeFile.name,
    length: activeFile.length,
    downloadSpeed: swarm ? swarm.downloadSpeed() : 0,
    uploadSpeed: swarm ? swarm.uploadSpeed() : 0,
    numPeers: swarm ? swarm.wires.length : 0,
    downloaded: activeEngine.downloaded || 0,
  };
}

function getCachedFilePath(file) {
  if (!file) return null;
  try {
    const directPath = path.join(CACHE_DIR, file.path);
    if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) return directPath;

    if (activeEngine && activeEngine.torrent && activeEngine.torrent.name) {
      const folderPath = path.join(CACHE_DIR, activeEngine.torrent.name, file.path);
      if (fs.existsSync(folderPath) && fs.statSync(folderPath).isFile()) return folderPath;
    }

    const findFile = (dir) => {
      if (!fs.existsSync(dir)) return null;
      const items = fs.readdirSync(dir);
      for (const it of items) {
        const full = path.join(dir, it);
        try {
          const st = fs.statSync(full);
          if (st.isDirectory()) {
            const res = findFile(full);
            if (res) return res;
          } else if (st.isFile() && (it === file.name || it.includes(file.name) || file.name.includes(it))) {
            return full;
          }
        } catch (e) {}
      }
      return null;
    };
    const found = findFile(CACHE_DIR);
    if (found) return found;
  } catch (e) {}

  return path.join(CACHE_DIR, file.path);
}

function initHttpServer(port = DEFAULT_PORT) {
  if (serverInstance) return;

  const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url.startsWith('/stats')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getStats()));
      return;
    }

    if (req.url.startsWith('/subtitles/list')) {
      if (!activeFile) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([]));
        return;
      }

      const filePath = getCachedFilePath(activeFile);
      if (filePath && fs.existsSync(filePath)) {
        const { spawn } = require('child_process');
        const probe = spawn('ffprobe', [
          '-v', 'error',
          '-show_entries', 'stream=index,codec_type:stream_tags=language,title',
          '-of', 'json',
          filePath
        ]);

        let probeData = '';
        probe.stdout.on('data', d => probeData += d.toString());
        probe.on('close', () => {
          try {
            const parsed = JSON.parse(probeData);
            const subStreams = (parsed.streams || []).filter(s => s.codec_type === 'subtitle');
            if (subStreams.length > 0) {
              const tracks = subStreams.map((s, idx) => {
                const lang = s.tags?.language || 'en';
                const title = s.tags?.title ? ` (${s.tags.title})` : '';
                return {
                  id: idx,
                  label: `${lang.toUpperCase()}${title}`,
                  lang,
                  isDefault: !s.tags?.title?.toLowerCase().includes('forced') && !s.tags?.title?.toLowerCase().includes('sign'),
                };
              });
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(tracks));
              return;
            }
          } catch (e) {}

          // Fallback default tracks
          const fallback = [
            { id: 0, label: 'English (Default)', lang: 'en' },
            { id: 1, label: 'English (Full Dialogue)', lang: 'en' },
            { id: 2, label: 'English (Signs & Songs)', lang: 'en' },
          ];
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(fallback));
        });
        return;
      }

      const tracks = [
        { id: 0, label: 'English (Default)', lang: 'en' },
        { id: 1, label: 'English (Full Dialogue)', lang: 'en' },
        { id: 2, label: 'English (Signs & Songs)', lang: 'en' },
      ];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(tracks));
      return;
    }

    if (req.url.startsWith('/subtitles/text')) {
      if (!activeFile) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('No active torrent file');
        return;
      }

      const reqUrl = new URL(req.url, 'http://127.0.0.1');
      const trackIdx = parseInt(reqUrl.searchParams.get('track') || '0', 10);
      const filePath = getCachedFilePath(activeFile);

      const { spawn } = require('child_process');
      let ffmpeg;
      let fileStream = null;

      if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).size > 100000) {
        // Fast direct file extraction (instant, no pipe latency)
        ffmpeg = spawn('ffmpeg', [
          '-loglevel', 'error',
          '-i', filePath,
          '-map', `0:s:${trackIdx}`,
          '-f', 'webvtt',
          'pipe:1',
        ]);
      } else {
        fileStream = activeFile.createReadStream();
        ffmpeg = spawn('ffmpeg', [
          '-loglevel', 'error',
          '-i', 'pipe:0',
          '-map', `0:s:${trackIdx}`,
          '-f', 'webvtt',
          'pipe:1',
        ]);
        fileStream.pipe(ffmpeg.stdin);
      }

      let vttOutput = '';
      ffmpeg.stdout.on('data', (chunk) => {
        vttOutput += chunk.toString('utf-8');
      });

      const finish = () => {
        if (!res.writableEnded) {
          res.writeHead(200, {
            'Content-Type': 'text/vtt; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(vttOutput);
        }
      };

      ffmpeg.on('close', finish);
      ffmpeg.on('error', finish);

      const timeout = setTimeout(() => {
        if (fileStream) { try { fileStream.destroy(); } catch (e) {} }
        try { ffmpeg.kill('SIGKILL'); } catch (e) {}
        finish();
      }, 6000);

      req.on('close', () => {
        clearTimeout(timeout);
        if (fileStream) { try { fileStream.destroy(); } catch (e) {} }
        try { ffmpeg.kill('SIGKILL'); } catch (e) {}
      });
      return;
    }

    if (req.url.startsWith('/subtitles.vtt')) {
      if (!activeFile) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('No active torrent file');
        return;
      }

      const reqUrl = new URL(req.url, 'http://127.0.0.1');
      const trackIdx = parseInt(reqUrl.searchParams.get('track') || '0', 10);

      res.writeHead(200, {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      });

      const { spawn } = require('child_process');
      const fileStream = activeFile.createReadStream();
      const ffmpeg = spawn('ffmpeg', [
        '-loglevel', 'error',
        '-i', 'pipe:0',
        '-map', `0:s:${trackIdx}`,
        '-f', 'webvtt',
        'pipe:1',
      ]);

      fileStream.on('error', () => {});
      if (ffmpeg.stdin) ffmpeg.stdin.on('error', () => {});
      if (ffmpeg.stdout) ffmpeg.stdout.on('error', () => {});
      res.on('error', () => {});

      fileStream.pipe(ffmpeg.stdin);
      ffmpeg.stdout.pipe(res);

      req.on('close', () => {
        try { fileStream.destroy(); } catch (e) {}
        try { ffmpeg.kill('SIGKILL'); } catch (e) {}
      });
      return;
    }

    if (req.url.startsWith('/stream')) {
      if (!activeFile) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('No active torrent file');
        return;
      }

      const total = activeFile.length;
      const fn = activeFile.name.toLowerCase();
      const isMkv = fn.endsWith('.mkv');
      const isWebm = fn.endsWith('.webm');
      const mimeType = isMkv ? 'video/x-matroska' : isWebm ? 'video/webm' : 'video/mp4';

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
        const chunksize = (end - start) + 1;

        // Proactively prioritize sliding buffer window of 40 pieces ahead (40-80MB ahead)
        if (activeEngine && activeEngine.torrent && activeEngine.torrent.pieceLength) {
          const pieceLen = activeEngine.torrent.pieceLength;
          const pieceStart = Math.floor((activeFile.offset + start) / pieceLen);
          const totalPieces = activeEngine.torrent.pieces.length;
          for (let p = pieceStart; p < Math.min(pieceStart + 45, totalPieces); p++) {
            if (typeof activeEngine.critical === 'function') {
              activeEngine.critical(p, 1);
            }
          }
        }

        const stream = activeFile.createReadStream({ start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mimeType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        });

        stream.on('error', () => {});
        res.on('error', () => {});
        stream.pipe(res);

        req.on('close', () => {
          try { stream.destroy(); } catch (e) {}
        });
      } else {
        res.writeHead(200, {
          'Content-Length': total,
          'Content-Type': mimeType,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
        });

        const stream = activeFile.createReadStream();
        stream.on('error', () => {});
        res.on('error', () => {});
        stream.pipe(res);

        req.on('close', () => {
          try { stream.destroy(); } catch (e) {}
        });
      }
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`Craftnime Torrent Stream Server running on http://127.0.0.1:${port}`);
  });

  serverInstance = server;
}

module.exports = {
  startTorrent,
  stopTorrent,
  getStats,
  initHttpServer,
};
