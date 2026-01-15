const { app, BrowserWindow, session } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#020617',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // In production, load the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Remove CSP headers entirely to allow all connections in development
app.on('ready', () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    // Remove any CSP headers
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    callback({ responseHeaders });
  });
});

// Daemon management
const { fork } = require('child_process');
let daemonProcess = null;

function startDaemon() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  // In dev, daemon is in ../daemon. In prod (if packaged), path logic would need to adjust.
  // Assuming dev environment given the context.
  const daemonPath = path.join(__dirname, '../../daemon/tracker.js');
  const daemonCwd = path.join(__dirname, '../../daemon');

  console.log('Starting daemon from:', daemonPath);

  try {
    daemonProcess = fork(daemonPath, [], {
      cwd: daemonCwd,
      stdio: 'pipe' // Capture output
    });

    daemonProcess.stdout.on('data', (data) => {
      console.log(`Daemon: ${data}`);
    });

    daemonProcess.stderr.on('data', (data) => {
      console.error(`Daemon Error: ${data}`);
    });

    console.log('Daemon started with PID:', daemonProcess.pid);
  } catch (err) {
    console.error('Failed to start daemon:', err);
  }
}

function stopDaemon() {
  if (daemonProcess) {
    console.log('Stopping daemon...');
    daemonProcess.kill();
    daemonProcess = null;
  }
}

app.whenReady().then(() => {
  createWindow();
  startDaemon();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', stopDaemon);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
