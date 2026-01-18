const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

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
const { fork, spawn } = require('child_process');
let daemonProcess = null;

function startDaemon() {
  const isDev = !app.isPackaged;

  let daemonPath, daemonCwd;

  if (isDev) {
    // Development: daemon is in ../daemon relative to app folder
    daemonPath = path.join(__dirname, '../../daemon/tracker.js');
    daemonCwd = path.join(__dirname, '../../daemon');
  } else {
    // Production: daemon is in Resources/daemon
    daemonPath = path.join(process.resourcesPath, 'daemon/tracker.js');
    daemonCwd = path.join(process.resourcesPath, 'daemon');
  }

  console.log('Starting daemon from:', daemonPath);
  console.log('Daemon CWD:', daemonCwd);

  // Check if daemon exists
  if (!fs.existsSync(daemonPath)) {
    console.error('Daemon not found at:', daemonPath);
    return;
  }

  try {
    daemonProcess = fork(daemonPath, [], {
      cwd: daemonCwd,
      stdio: 'pipe'
    });

    daemonProcess.stdout.on('data', (data) => {
      console.log(`Daemon: ${data}`);
    });

    daemonProcess.stderr.on('data', (data) => {
      console.error(`Daemon Error: ${data}`);
    });

    daemonProcess.on('error', (err) => {
      console.error('Daemon process error:', err);
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

// IPC Handlers
const focusCloneDir = path.join(os.homedir(), '.focusclone');
const userFilePath = path.join(focusCloneDir, 'user.json');
const pauseFilePath = path.join(focusCloneDir, 'paused');

// Ensure .focusclone directory exists
if (!fs.existsSync(focusCloneDir)) {
  fs.mkdirSync(focusCloneDir, { recursive: true });
}

ipcMain.handle('write-user-file', async (event, userData) => {
  try {
    fs.writeFileSync(userFilePath, JSON.stringify(userData, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error writing user file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-user-file', async () => {
  try {
    if (fs.existsSync(userFilePath)) {
      fs.unlinkSync(userFilePath);
    }
    return { success: true };
  } catch (error) {
    console.error('Error clearing user file:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-tracking-paused', async () => {
  return fs.existsSync(pauseFilePath);
});

ipcMain.handle('set-tracking-paused', async (event, paused) => {
  try {
    if (paused) {
      fs.writeFileSync(pauseFilePath, '');
    } else if (fs.existsSync(pauseFilePath)) {
      fs.unlinkSync(pauseFilePath);
    }
    return { success: true };
  } catch (error) {
    console.error('Error setting tracking paused:', error);
    return { success: false, error: error.message };
  }
});
