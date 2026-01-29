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
    daemonProcess = spawn('node', [daemonPath], {
      cwd: daemonCwd,
      stdio: ['ignore', 'pipe', 'pipe']
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
const kronosDir = path.join(os.homedir(), '.kronos');
const userFilePath = path.join(kronosDir, 'user.json');

// Ensure .kronos directory exists
if (!fs.existsSync(kronosDir)) {
  fs.mkdirSync(kronosDir, { recursive: true });
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
  try {
    if (fs.existsSync(userFilePath)) {
      const data = JSON.parse(fs.readFileSync(userFilePath, 'utf-8'));
      return data.paused === true;
    }
    return false;
  } catch (error) {
    return false;
  }
});

ipcMain.handle('set-tracking-paused', async (event, paused) => {
  try {
    let userData = {};
    if (fs.existsSync(userFilePath)) {
      userData = JSON.parse(fs.readFileSync(userFilePath, 'utf-8'));
    }
    userData.paused = paused;
    fs.writeFileSync(userFilePath, JSON.stringify(userData, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error setting tracking paused:', error);
    return { success: false, error: error.message };
  }
});

// Auth session persistence (stores to file for reliability)
const authSessionPath = path.join(kronosDir, 'auth-session.json');

ipcMain.handle('save-auth-session', async (event, session) => {
  try {
    fs.writeFileSync(authSessionPath, JSON.stringify(session, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving auth session:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-auth-session', async () => {
  try {
    if (fs.existsSync(authSessionPath)) {
      const data = fs.readFileSync(authSessionPath, 'utf-8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error reading auth session:', error);
    return null;
  }
});

ipcMain.handle('clear-auth-session', async () => {
  try {
    if (fs.existsSync(authSessionPath)) {
      fs.unlinkSync(authSessionPath);
    }
    return { success: true };
  } catch (error) {
    console.error('Error clearing auth session:', error);
    return { success: false, error: error.message };
  }
});
