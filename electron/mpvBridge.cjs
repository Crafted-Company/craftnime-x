const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const os = require('os');
const fs = require('fs');

let mpvProcess = null;
let ipcClient = null;
let eventCallback = null;
const socketPath = path.join(os.tmpdir(), 'craftnime_mpv.sock');

function startMpvPlayer(streamUrl, animeTitle, episodeTitle, onEvent) {
  stopMpvPlayer();
  eventCallback = onEvent;

  if (fs.existsSync(socketPath)) {
    try { fs.unlinkSync(socketPath); } catch (e) {}
  }

  const mpvArgs = [
    `--input-ipc-server=${socketPath}`,
    `--title=Craftnime - ${animeTitle} - ${episodeTitle}`,
    '--hwdec=auto',
    '--sub-auto=all',
    '--audio-pitch-correction=yes',
    '--keep-open=yes',
    '--force-window=immediate',
    streamUrl,
  ];

  mpvProcess = spawn('mpv', mpvArgs);

  mpvProcess.on('close', () => {
    stopMpvPlayer();
    if (eventCallback) {
      eventCallback({ event: 'close' });
    }
  });

  // Connect to IPC after short startup delay
  setTimeout(() => {
    connectIpc();
  }, 600);

  return { success: true };
}

function connectIpc() {
  if (!fs.existsSync(socketPath)) return;

  ipcClient = net.connect(socketPath, () => {
    console.log('[MPV Bridge] Connected to MPV IPC socket');
    
    // Observe properties
    sendMpvCommand(['observe_property', 1, 'time-pos']);
    sendMpvCommand(['observe_property', 2, 'duration']);
    sendMpvCommand(['observe_property', 3, 'pause']);
    sendMpvCommand(['observe_property', 4, 'eof-reached']);
    sendMpvCommand(['observe_property', 5, 'track-list']);
  });

  let buffer = '';
  ipcClient.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        if (msg.event === 'property-change') {
          if (eventCallback) {
            eventCallback({
              event: 'property-change',
              name: msg.name,
              value: msg.data,
            });
          }
        }
      } catch (e) {}
    }
  });

  ipcClient.on('error', () => {});
}

function sendMpvCommand(command) {
  if (ipcClient && !ipcClient.destroyed) {
    try {
      ipcClient.write(JSON.stringify({ command }) + '\n');
    } catch (e) {}
  }
}

function stopMpvPlayer() {
  if (ipcClient) {
    try { ipcClient.destroy(); } catch (e) {}
    ipcClient = null;
  }
  if (mpvProcess) {
    try { mpvProcess.kill('SIGTERM'); } catch (e) {}
    mpvProcess = null;
  }
  if (fs.existsSync(socketPath)) {
    try { fs.unlinkSync(socketPath); } catch (e) {}
  }
}

module.exports = {
  startMpvPlayer,
  stopMpvPlayer,
  sendMpvCommand,
};
