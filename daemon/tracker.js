import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import 'dotenv/config';

const execAsync = promisify(exec);

// Platform detection
const IS_WINDOWS = platform() === 'win32';
const IS_MACOS = platform() === 'darwin';

// Supabase configuration - only ANON_KEY needed (safe to distribute)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Configuration
const POLL_INTERVAL_MS = 2000;        // 2 seconds
const IDLE_THRESHOLD_MS = 300000;     // 5 minutes
const TITLE_CHANGE_DEBOUNCE_MS = 10000; // 10 seconds - ignore rapid title changes within same app

// User ID from file (set by Electron app on login)
let currentUserId = null;

function loadUserId() {
  const userFilePath = join(homedir(), '.kronos', 'user.json');
  try {
    if (existsSync(userFilePath)) {
      const data = JSON.parse(readFileSync(userFilePath, 'utf-8'));
      currentUserId = data.userId;
      console.log('Loaded user ID:', currentUserId);
    } else {
      console.log('No user file found, tracking disabled');
      currentUserId = null;
    }
  } catch (error) {
    console.error('Error loading user file:', error.message);
    currentUserId = null;
  }
}

// State
let lastWindow = null;
let lastTimestamp = null;
let lastTitleChangeTime = null;
let isPaused = false;

function loadPauseState() {
  const userFilePath = join(homedir(), '.kronos', 'user.json');
  try {
    if (existsSync(userFilePath)) {
      const data = JSON.parse(readFileSync(userFilePath, 'utf-8'));
      isPaused = data.paused === true;
    }
  } catch (error) {
    // Ignore errors, default to not paused
  }
}

// ============================================================================
// macOS: AppleScript-based window detection
// ============================================================================

const APPLESCRIPT = `
tell application "System Events"
  set frontApp to first application process whose frontmost is true
  set appName to name of frontApp
  try
    set windowTitle to name of front window of frontApp
  on error
    set windowTitle to ""
  end try
  return appName & "|||" & windowTitle
end tell
`;

const CHROME_URL_SCRIPT = `
tell application "Google Chrome"
  if (count of windows) > 0 then
    return URL of active tab of front window
  end if
end tell
return ""
`;

const SAFARI_URL_SCRIPT = `
tell application "Safari"
  if (count of windows) > 0 then
    return URL of current tab of front window
  end if
end tell
return ""
`;

async function getActiveWindowMac() {
  try {
    const { stdout } = await execAsync(`osascript -e '${APPLESCRIPT.replace(/'/g, "'\"'\"'")}'`);
    const [appName, windowTitle] = stdout.trim().split('|||');
    return {
      owner: { name: appName || 'Unknown' },
      title: windowTitle || ''
    };
  } catch (error) {
    return null;
  }
}

async function getBrowserUrlMac(appName) {
  try {
    let script = null;
    if (appName === 'Google Chrome') {
      script = CHROME_URL_SCRIPT;
    } else if (appName === 'Safari') {
      script = SAFARI_URL_SCRIPT;
    }

    if (!script) return null;

    const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);
    const url = stdout.trim();
    return url || null;
  } catch (error) {
    return null;
  }
}

async function getSystemIdleTimeMac() {
  try {
    const { stdout } = await execAsync("ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print $NF/1000000000; exit}'");
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error('Error getting idle time:', error.message);
    return 0;
  }
}

// ============================================================================
// Windows: PowerShell-based window detection
// ============================================================================

// PowerShell script to get active window info
const POWERSHELL_ACTIVE_WINDOW = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@
$hwnd = [Win32]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 256
[Win32]::GetWindowText($hwnd, $sb, 256) | Out-Null
$title = $sb.ToString()
$processId = 0
[Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
$process = Get-Process -Id $processId -ErrorAction SilentlyContinue
$appName = "Unknown"
if ($process) {
    $appName = $process.ProcessName
    try {
        $desc = $process.MainModule.FileVersionInfo.FileDescription
        if ($desc -and $desc.Trim()) { $appName = $desc }
    } catch {}
}
Write-Output "$appName|||$title"
`;

// PowerShell script to get system idle time in seconds
const POWERSHELL_IDLE_TIME = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class IdleTime {
    [StructLayout(LayoutKind.Sequential)]
    public struct LASTINPUTINFO {
        public uint cbSize;
        public uint dwTime;
    }
    [DllImport("user32.dll")]
    public static extern bool GetLastInputInfo(ref LASTINPUTINFO plii);
}
"@
$lii = New-Object IdleTime+LASTINPUTINFO
$lii.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf($lii)
[IdleTime]::GetLastInputInfo([ref]$lii) | Out-Null
$idle = ([Environment]::TickCount - $lii.dwTime) / 1000
Write-Output $idle
`;

async function getActiveWindowWindows() {
  try {
    // Escape the PowerShell script for command line
    const script = POWERSHELL_ACTIVE_WINDOW.replace(/\r?\n/g, ' ').replace(/"/g, '\\"');
    const { stdout } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${script}"`, {
      windowsHide: true
    });
    const [appName, windowTitle] = stdout.trim().split('|||');
    return {
      owner: { name: appName || 'Unknown' },
      title: windowTitle || ''
    };
  } catch (error) {
    console.error('Error getting active window:', error.message);
    return null;
  }
}

async function getSystemIdleTimeWindows() {
  try {
    const script = POWERSHELL_IDLE_TIME.replace(/\r?\n/g, ' ').replace(/"/g, '\\"');
    const { stdout } = await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${script}"`, {
      windowsHide: true
    });
    return parseFloat(stdout.trim()) || 0;
  } catch (error) {
    console.error('Error getting idle time:', error.message);
    return 0;
  }
}

// Browser URL detection not available on Windows without native modules
async function getBrowserUrlWindows() {
  // On Windows, we can't easily get browser URLs without native modules or browser extensions
  return null;
}

// ============================================================================
// Cross-platform wrappers
// ============================================================================

async function getActiveWindow() {
  if (IS_MACOS) {
    return getActiveWindowMac();
  } else if (IS_WINDOWS) {
    return getActiveWindowWindows();
  }
  return null;
}

async function getBrowserUrl(appName) {
  if (IS_MACOS) {
    return getBrowserUrlMac(appName);
  } else if (IS_WINDOWS) {
    return getBrowserUrlWindows();
  }
  return null;
}

async function getSystemIdleTime() {
  if (IS_MACOS) {
    return getSystemIdleTimeMac();
  } else if (IS_WINDOWS) {
    return getSystemIdleTimeWindows();
  }
  return 0;
}

// Check if app is a browser (cross-platform)
function isBrowser(appName) {
  const browsers = [
    'Google Chrome', 'chrome',
    'Safari',
    'Firefox', 'firefox',
    'Microsoft Edge', 'msedge',
    'Opera', 'opera',
    'Brave', 'brave'
  ];
  const lowerName = appName.toLowerCase();
  return browsers.some(b => lowerName.includes(b.toLowerCase()));
}

// ============================================================================
// Common logic
// ============================================================================

function formatTimestamp(date) {
  return date.toISOString();
}

// Normalize title for comparison - strips dynamic content like timers, counters, notifications
function normalizeTitle(title) {
  if (!title) return '';
  return title
    .replace(/\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?/gi, '')
    .replace(/[\(\[]\d+[\)\]]/g, '')
    .replace(/\b\d+\b/g, '')
    .replace(/\s*[-–|]\s*(Audio playing|Playing|Paused).*$/i, '')
    .replace(/[♔♕♖♗♘♙♚♛♜♝♞♟]/g, '')
    .replace(/\b(your turn|their turn|white|black|check|checkmate)\b/gi, '')
    .replace(/🔊|🔇|🔈|🔉|♪|♫|🎵|🎶/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function saveEvent(timestamp, appName, windowTitle, url, durationSeconds, isIdle) {
  if (!currentUserId) {
    console.log('No user logged in, skipping event save');
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase not configured');
    return;
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/track-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        user_id: currentUserId,
        timestamp: formatTimestamp(timestamp),
        app_name: appName,
        window_title: windowTitle,
        url: url,
        duration_seconds: durationSeconds,
        is_idle: isIdle
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Error saving event:', error.error || response.statusText);
    }
  } catch (error) {
    console.error('Error saving event to Supabase:', error.message);
  }
}

async function track() {
  if (!currentUserId) {
    loadUserId();
    if (!currentUserId) return;
    console.log('User logged in, starting tracking...');
  }

  loadPauseState();
  if (isPaused) return;

  try {
    const now = new Date();
    const window = await getActiveWindow();

    let appName = 'Unknown';
    let windowTitle = '';
    let url = null;
    let isIdle = false;

    const idleSeconds = await getSystemIdleTime();

    if (idleSeconds >= (IDLE_THRESHOLD_MS / 1000)) {
      isIdle = true;
      appName = 'System';
      windowTitle = 'Away';
    } else if (window) {
      appName = window.owner?.name || 'Unknown';
      windowTitle = window.title || '';

      // Fix Electron name
      if (appName === 'Electron' || appName === 'electron') {
        if (windowTitle.startsWith('Kronos')) {
          appName = 'Kronos';
        } else {
          appName = 'Antigravity';
        }
      }

      // Get URL for browsers (macOS only currently)
      if (isBrowser(appName)) {
        url = await getBrowserUrl(appName);
      }
    }

    const appChanged = !lastWindow || lastWindow.appName !== appName;
    const idleChanged = lastWindow && lastWindow.isIdle !== isIdle;
    const browserApp = isBrowser(appName);

    const urlChanged = browserApp && lastWindow && lastWindow.url !== url;
    const titleChanged = !browserApp && lastWindow && normalizeTitle(lastWindow.windowTitle) !== normalizeTitle(windowTitle);

    let windowChanged = false;
    if (appChanged || idleChanged) {
      windowChanged = true;
      lastTitleChangeTime = now;
    } else if (urlChanged) {
      windowChanged = true;
      lastTitleChangeTime = now;
    } else if (titleChanged) {
      const timeSinceLastTitleChange = lastTitleChangeTime ? (now - lastTitleChangeTime) : TITLE_CHANGE_DEBOUNCE_MS;
      if (timeSinceLastTitleChange >= TITLE_CHANGE_DEBOUNCE_MS) {
        windowChanged = true;
        lastTitleChangeTime = now;
      }
    }

    let durationSeconds = 0;
    if (lastTimestamp) {
      durationSeconds = Math.round((now - lastTimestamp) / 1000);
    }

    if (windowChanged && lastWindow && lastTimestamp) {
      await saveEvent(
        lastTimestamp,
        lastWindow.appName,
        lastWindow.windowTitle,
        lastWindow.url,
        durationSeconds,
        lastWindow.isIdle
      );

      const titlePreview = lastWindow.windowTitle.substring(0, 40);
      console.log(
        `[${formatTimestamp(lastTimestamp)}] ${lastWindow.appName} - "${titlePreview}${titlePreview.length < lastWindow.windowTitle.length ? '...' : ''}" (${durationSeconds}s)${lastWindow.isIdle ? ' [IDLE]' : ''}`
      );
    }

    if (!lastWindow) {
      lastWindow = { appName, windowTitle, url, isIdle };
      lastTimestamp = now;
      lastTitleChangeTime = now;
    } else if (windowChanged) {
      lastWindow = { appName, windowTitle, url, isIdle };
      lastTimestamp = now;
    } else if (browserApp || titleChanged) {
      lastWindow = { appName, windowTitle, url, isIdle };
    }

  } catch (error) {
    console.error('Error tracking:', error.message);
  }
}

async function shutdown() {
  console.log('\nShutting down tracker...');

  try {
    if (lastWindow && lastTimestamp) {
      const now = new Date();
      const durationSeconds = Math.round((now - lastTimestamp) / 1000);

      await saveEvent(
        lastTimestamp,
        lastWindow.appName,
        lastWindow.windowTitle,
        lastWindow.url,
        durationSeconds,
        lastWindow.isIdle
      );

      console.log(`Final event saved: ${lastWindow.appName} (${durationSeconds}s)`);
    }
  } catch (error) {
    console.error('Error during shutdown:', error.message);
  }

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const parentPid = process.ppid;
function checkParentAlive() {
  try {
    process.kill(parentPid, 0);
  } catch (err) {
    console.log('Parent process died, shutting down daemon...');
    shutdown();
  }
}

async function main() {
  console.log(`Initializing tracker on ${platform()}...`);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
    process.exit(1);
  }

  loadUserId();

  if (!currentUserId) {
    console.log('No user logged in. Tracker will poll until user logs in...');
  } else {
    console.log('User found, tracking active.');
  }

  console.log('Tracker started. Polling every 2 seconds...');
  console.log('Press Ctrl+C to stop.\n');

  setInterval(checkParentAlive, 5000);
  setInterval(track, POLL_INTERVAL_MS);
  track();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
