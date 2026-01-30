const { app, BrowserWindow, session, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow;

// Register custom protocol for OAuth callback
const PROTOCOL = 'kronos';
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// Handle OAuth callback URL (macOS)
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleOAuthCallback(url);
});

// Handle OAuth callback for single instance (Windows/Linux)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // Find the URL in command line args
    const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (url) {
      handleOAuthCallback(url);
    }
    // Focus the main window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Process OAuth callback URL and send to renderer
function handleOAuthCallback(url) {
  console.log('OAuth callback received:', url);

  // Extract the fragment (everything after #)
  // URL format: kronos://auth-callback#access_token=xxx&refresh_token=xxx&...
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) {
    console.error('No hash fragment in OAuth callback');
    return;
  }

  const fragment = url.substring(hashIndex + 1);
  const params = new URLSearchParams(fragment);

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && mainWindow) {
    mainWindow.webContents.send('oauth-callback', {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: params.get('expires_in'),
      token_type: params.get('token_type')
    });
    mainWindow.focus();
  }
}

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
    // Use Electron's Node.js in production (users don't have Node installed)
    // ELECTRON_RUN_AS_NODE makes Electron behave as Node.js
    const nodeExecutable = isDev ? 'node' : process.execPath;
    const spawnEnv = isDev ? process.env : { ...process.env, ELECTRON_RUN_AS_NODE: '1' };

    daemonProcess = spawn(nodeExecutable, [daemonPath], {
      cwd: daemonCwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: spawnEnv
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

// Open URL in external browser (for OAuth)
ipcMain.handle('open-external-url', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Error opening external URL:', error);
    return { success: false, error: error.message };
  }
});

// Check if Accessibility permission is granted (test AppleScript)
ipcMain.handle('check-accessibility-permission', async () => {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);

  try {
    // Simple AppleScript that requires Accessibility permission
    await execAsync(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`);
    return { granted: true };
  } catch (error) {
    // If this fails, we likely don't have permission
    console.log('Accessibility permission check failed:', error.message);
    return { granted: false };
  }
});

// Open System Settings to Accessibility pane
ipcMain.handle('open-accessibility-settings', async () => {
  try {
    await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
    return { success: true };
  } catch (error) {
    console.error('Error opening settings:', error);
    return { success: false, error: error.message };
  }
});
