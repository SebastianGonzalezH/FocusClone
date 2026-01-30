import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import 'dotenv/config';

const execAsync = promisify(exec);

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
let lastTitleChangeTime = null;       // Track when title last changed (for debouncing)
let isPaused = false;                 // Tracking pause state

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

// AppleScript to get active window info on macOS
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

// AppleScript to get URL from Chrome
const CHROME_URL_SCRIPT = `
tell application "Google Chrome"
  if (count of windows) > 0 then
    return URL of active tab of front window
  end if
end tell
return ""
`;

// AppleScript to get URL from Safari
const SAFARI_URL_SCRIPT = `
tell application "Safari"
  if (count of windows) > 0 then
    return URL of current tab of front window
  end if
end tell
return ""
`;

async function getActiveWindow() {
  try {
    const { stdout } = await execAsync(`osascript -e '${APPLESCRIPT.replace(/'/g, "'\"'\"'")}'`);
    const [appName, windowTitle] = stdout.trim().split('|||');
    return {
      owner: { name: appName || 'Unknown' },
      title: windowTitle || ''
    };
  } catch (error) {
    // Screen might be locked or no window focused
    return null;
  }
}

// Get URL from browser (Chrome or Safari)
async function getBrowserUrl(appName) {
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
    // Browser might not be running or accessible
    return null;
  }
}

function formatTimestamp(date) {
  return date.toISOString();
}

// Normalize title for comparison - strips dynamic content like timers, counters, notifications
function normalizeTitle(title) {
  if (!title) return '';
  return title
    // Remove time patterns like "10:30", "5:23 PM", "00:45"
    .replace(/\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?/gi, '')
    // Remove notification counts like "(42)", "[3]"
    .replace(/[\(\[]\d+[\)\]]/g, '')
    // Remove standalone numbers that might be counters/timers
    .replace(/\b\d+\b/g, '')
    // Remove common dynamic suffixes
    .replace(/\s*[-–|]\s*(Audio playing|Playing|Paused).*$/i, '')
    // Remove chess/game turn indicators (chess pieces, "Your turn", etc.)
    .replace(/[♔♕♖♗♘♙♚♛♜♝♞♟]/g, '')
    .replace(/\b(your turn|their turn|white|black|check|checkmate)\b/gi, '')
    // Remove sound/speaker indicators
    .replace(/🔊|🔇|🔈|🔉|♪|♫|🎵|🎶/g, '')
    // Collapse multiple spaces
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

// Helper to get true system idle time using ioreg
async function getSystemIdleTime() {
  try {
    const { stdout } = await execAsync("ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print $NF/1000000000; exit}'");
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error('Error getting idle time:', error.message);
    return 0;
  }
}

async function track() {
  // If no user, try to load user file (user may have just logged in)
  if (!currentUserId) {
    loadUserId();
    if (!currentUserId) return; // Still no user, skip this cycle
    console.log('User logged in, starting tracking...');
  }

  // Check if tracking is paused
  loadPauseState();
  if (isPaused) return;

  try {
    const now = new Date();

    // Get active window
    const window = await getActiveWindow();

    let appName = 'Unknown';
    let windowTitle = '';
    let url = null;
    let isIdle = false;

    // Check true system idle time
    const idleSeconds = await getSystemIdleTime();

    if (idleSeconds >= (IDLE_THRESHOLD_MS / 1000)) {
      isIdle = true;
      appName = 'System';
      windowTitle = 'Away';
    } else if (window) {
      appName = window.owner?.name || 'Unknown';
      windowTitle = window.title || '';

      // Fix Electron name
      if (appName === 'Electron') {
        if (windowTitle.startsWith('Kronos')) {
          appName = 'Kronos';
        } else {
          appName = 'Antigravity';
        }
      }

      // Get URL for browsers - this is our stable identifier
      if (appName === 'Google Chrome' || appName === 'Safari') {
        url = await getBrowserUrl(appName);
      }
    }

    // Determine if we should log a new event
    // Logic:
    // 1. App changed - always log
    // 2. Idle state changed - always log
    // 3. For browsers: URL changed - always log (URL is stable, title changes with sounds)
    // 4. For non-browsers: Title changed - apply debouncing

    const appChanged = !lastWindow || lastWindow.appName !== appName;
    const idleChanged = lastWindow && lastWindow.isIdle !== isIdle;
    const isBrowser = appName === 'Google Chrome' || appName === 'Safari';

    // For browsers, compare by URL (stable). For others, compare by normalized title.
    const urlChanged = isBrowser && lastWindow && lastWindow.url !== url;
    const titleChanged = !isBrowser && lastWindow && normalizeTitle(lastWindow.windowTitle) !== normalizeTitle(windowTitle);

    let windowChanged = false;
    if (appChanged || idleChanged) {
      // App or idle state changed - always log
      windowChanged = true;
      lastTitleChangeTime = now;
    } else if (urlChanged) {
      // Browser URL changed - always log immediately (URL is stable identifier)
      windowChanged = true;
      lastTitleChangeTime = now;
    } else if (titleChanged) {
      // Non-browser title changed - apply debouncing
      const timeSinceLastTitleChange = lastTitleChangeTime ? (now - lastTitleChangeTime) : TITLE_CHANGE_DEBOUNCE_MS;
      if (timeSinceLastTitleChange >= TITLE_CHANGE_DEBOUNCE_MS) {
        windowChanged = true;
        lastTitleChangeTime = now;
      }
    }

    // Calculate duration from last event
    let durationSeconds = 0;
    if (lastTimestamp) {
      durationSeconds = Math.round((now - lastTimestamp) / 1000);
    }

    if (windowChanged && lastWindow && lastTimestamp) {
      // Log the previous window to Supabase
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

    // Update state
    if (!lastWindow) {
      // First run - initialize everything
      lastWindow = { appName, windowTitle, url, isIdle };
      lastTimestamp = now;
      lastTitleChangeTime = now;
    } else if (windowChanged) {
      // We logged an event, update timestamp
      lastWindow = { appName, windowTitle, url, isIdle };
      lastTimestamp = now;
    } else if (isBrowser) {
      // Browser with same URL - just update title (for display purposes)
      // but don't update timestamp (duration keeps accumulating)
      lastWindow = { appName, windowTitle, url, isIdle };
    } else if (titleChanged) {
      // Non-browser title changed but debounced - still update the window info
      // but don't update timestamp (duration keeps accumulating from original timestamp)
      lastWindow = { appName, windowTitle, url, isIdle };
    }

  } catch (error) {
    console.error('Error tracking:', error.message);
  }
}

async function shutdown() {
  console.log('\nShutting down tracker...');

  try {
    // Save final event
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

// Handle graceful shutdown
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Safety: Exit if parent process dies (prevents orphaned daemons)
const parentPid = process.ppid;
function checkParentAlive() {
  try {
    // Sending signal 0 checks if process exists without killing it
    process.kill(parentPid, 0);
  } catch (err) {
    console.log('Parent process died, shutting down daemon...');
    shutdown();
  }
}

// Main
async function main() {
  console.log('Initializing tracker...');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
    process.exit(1);
  }

  // Load user ID from file
  loadUserId();

  if (!currentUserId) {
    console.log('No user logged in. Tracker will poll until user logs in...');
  } else {
    console.log('User found, tracking active.');
  }

  console.log('Tracker started. Polling every 2 seconds...');
  console.log('Press Ctrl+C to stop.\n');

  // Check if parent (Electron) is still alive every 5 seconds
  setInterval(checkParentAlive, 5000);

  // Start polling
  setInterval(track, POLL_INTERVAL_MS);

  // Run immediately
  track();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
