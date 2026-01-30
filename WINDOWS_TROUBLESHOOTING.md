# Kronos Windows Troubleshooting Guide

## How Kronos Works on Windows

Kronos tracks your active windows and applications using PowerShell scripts that call Windows APIs:
- `GetForegroundWindow()` - Detects which window is active
- `GetWindowText()` - Gets the window title
- `GetWindowThreadProcessId()` - Gets the process information
- `GetLastInputInfo()` - Detects when you're idle

**No special permissions required** - Windows allows applications to query this information by default.

## First Launch Checklist

1. ✓ Complete signup and verify your email
2. ✓ Choose a tracking template (Founder, Creative, or Business Professional)
3. ✓ The daemon will automatically start tracking in the background
4. ✓ Wait 30-60 seconds for first events to appear
5. ✓ Visit the Activity Log to see tracked events

## Troubleshooting

### No Events Appearing?

#### Step 1: Check if daemon is running

1. **Open DevTools:**
   - Launch Kronos
   - Press `F12` or `Ctrl + Shift + I`
   - Click the "Console" tab

2. **Look for daemon logs:**
   - You should see: `"============================================================"`
   - Followed by: `"STARTING KRONOS DAEMON"`
   - And: `"✓ Daemon spawned successfully with PID: ..."`
   - Then: `"============================================================"`
   - Followed by: `"KRONOS DAEMON STARTING"`
   - And: `"Platform: win32"`

3. **Look for tracking logs:**
   - Every 2 seconds, you should see: `"[TRACK] Got window: AppName - \"Window Title\""`
   - Example: `"[TRACK] Got window: Google Chrome - \"Kronos Troubleshooting - Chrome\""`

**If you DON'T see these logs, continue to Step 2.**

#### Step 2: Check user file exists

The daemon needs a user file to know who is logged in.

1. Open File Explorer
2. Navigate to: `C:\Users\YOUR_USERNAME\.kronos\`
3. Check if `user.json` exists

**If the file doesn't exist:**
- Log out of Kronos (power button in sidebar)
- Log back in
- Wait 10 seconds
- Check if the file was created

**If the file exists, open it and verify it contains:**
```json
{
  "userId": "some-uuid-here",
  "email": "your-email@example.com"
}
```

#### Step 3: Restart the app

Sometimes the daemon fails to start properly on first launch.

1. Close Kronos completely (right-click system tray icon → Quit)
2. Reopen Kronos
3. Open DevTools immediately (F12)
4. Check for daemon logs again

#### Step 4: Check antivirus/Windows Defender

Some security software blocks PowerShell scripts, even when executed by legitimate applications.

**Test if PowerShell works:**

1. Open PowerShell (Windows Start → Type "PowerShell")
2. Run this command:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -Command "Write-Output 'Test successful'"
   ```
3. You should see: `"Test successful"`

**If blocked:**
- Open Windows Security → Virus & threat protection → Manage settings
- Temporarily disable "Real-time protection"
- Launch Kronos and check if daemon starts
- If it works, add Kronos to your antivirus whitelist
- Re-enable real-time protection

**Common antivirus software that may block:**
- Norton Security
- McAfee
- Kaspersky
- Bitdefender
- Avast/AVG

**To whitelist Kronos:**
- Add `Kronos.exe` to your antivirus exceptions/exclusions list
- Location: `C:\Users\YOUR_USERNAME\...\Kronos\win-unpacked\Kronos.exe`

#### Step 5: Check Task Manager

1. Open Task Manager (`Ctrl + Shift + Esc`)
2. Click "More details" if needed
3. Look for "Kronos.exe" processes
4. You should see **2 processes**:
   - Main Kronos app
   - Daemon (child process)

**If you only see 1 Kronos process:**
- The daemon is not starting
- Check DevTools console for error messages
- Look for `"Daemon Error:"` or `"Daemon process error:"` messages

### Common Error Messages

#### "No events found. Start the tracker daemon to begin collecting data."

**Meaning**: The daemon is either not running or not saving events to the database.

**Solutions:**
1. Check DevTools console for daemon logs (Step 1 above)
2. Verify user is logged in (check `.kronos/user.json`)
3. Restart the app
4. Wait 60 seconds - events may be buffering

#### "✗ getActiveWindow() returned NULL" in console

**Meaning**: PowerShell failed to get the active window.

**Possible causes:**
1. **Antivirus blocking PowerShell** - Add Kronos to whitelist
2. **PowerShell execution policy** - Should be bypassed automatically
3. **Windows API access denied** - Rare, check if running as admin helps
4. **System locked or on login screen** - Normal, will resume when unlocked

**Solutions:**
1. Check antivirus settings (Step 4 above)
2. Try running Kronos as Administrator (right-click → Run as administrator)
3. Update Windows to latest version

#### "Daemon not found at: ..." in console

**Meaning**: The daemon files are missing from the installation.

**Solutions:**
1. Reinstall Kronos from a fresh download
2. Extract the full zip file (don't move individual files)
3. Ensure `resources/daemon/tracker.js` exists in the Kronos folder

#### "Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment"

**Meaning**: The daemon configuration is missing.

**Solutions:**
1. Check if `.env` file exists in `resources/daemon/.env`
2. Reinstall Kronos from official source
3. Don't modify the `.env` file unless instructed

### Events Appear But Wrong App Names

**This is expected behavior.** Windows provides limited process information:

- Some apps show as "Unknown" or generic names
- Browser tabs don't show URLs (technical limitation on Windows)
- System apps might show as "Explorer" or "ShellExperienceHost"

**Examples:**
- Chrome shows as "Google Chrome" ✓
- VS Code shows as "Visual Studio Code" ✓
- Steam games might show as "ApplicationFrameHost" ✗

**This is a Windows API limitation**, not a bug.

### Daemon Starts But Events Are Filtered

Kronos filters out certain events to keep your data clean:

**Filtered events (won't appear in Activity Log):**
- Events shorter than 3 seconds (quick window switches)
- Windows system UI elements (Task Switcher, Start Menu)
- Empty or untitled windows

You can see filtered events in DevTools console:
- `"[Filtered: too short] AppName - WindowTitle (1s)"`
- `"[Filtered: system window] Explorer - Task Switching"`

**This is normal behavior** to prevent clutter.

## Privacy & Security

- ✓ All tracking happens **locally on your PC**
- ✓ Data syncs to **your private Supabase database** (not shared)
- ✓ PowerShell scripts are **embedded in the app** (not external files)
- ✓ `ExecutionPolicy Bypass` only applies to Kronos scripts (doesn't affect system policy)
- ✓ You can **pause tracking anytime** (Power button in sidebar)
- ✓ No screenshots or keylogging - only window titles and app names

## Advanced Debugging

### View Full Console Output

To see all daemon logs from startup:

1. Close Kronos
2. Open Command Prompt or PowerShell
3. Navigate to Kronos directory:
   ```
   cd "C:\Users\YOUR_USERNAME\...\Kronos\win-unpacked"
   ```
4. Run Kronos from command line:
   ```
   .\Kronos.exe
   ```
5. Keep the console open to see all logs
6. Share logs when reporting issues

### Enable Verbose Logging

If you need to report an issue, capture full logs:

1. Open Kronos
2. Press F12 (DevTools)
3. Click "Console" tab
4. Right-click in console → "Save as..." → Save logs
5. Share the log file when reporting the issue

### Check Database Connectivity

If daemon is running but no events in Activity Log:

1. Open DevTools Console
2. Look for errors containing "Supabase" or "fetch"
3. Check your internet connection
4. Verify firewall isn't blocking Supabase (https://byoonzouucfwyxisencw.supabase.co)

## Still Having Issues?

1. **Check the logs** - DevTools Console (F12) shows detailed error messages
2. **Wait 60 seconds** - Events are buffered before appearing
3. **Try a fresh restart** - Close completely and reopen
4. **Update Windows** - Ensure Windows 10/11 is fully updated
5. **Report the issue**:
   - Open an issue on GitHub: https://github.com/SebastianGonzalezH/Kronos/issues
   - Include your OS version (Windows 10/11)
   - Include DevTools console logs
   - Describe what you see vs what you expect

## FAQ

**Q: Does Kronos track browser history/URLs?**
A: No, not on Windows. Browser URLs are only tracked on macOS. Windows version shows app name and window title only.

**Q: Can I use Kronos without internet?**
A: No, Kronos requires internet to sync data to Supabase. Tracking works offline but events won't save.

**Q: Does Kronos slow down my PC?**
A: No, the daemon uses minimal CPU (<1%) and memory (~50MB). PowerShell queries run every 2 seconds briefly.

**Q: Can I change the tracking interval?**
A: Not currently. The 2-second interval is hardcoded for accuracy.

**Q: Will Kronos work with multiple monitors?**
A: Yes, it tracks the active window regardless of which monitor it's on.

**Q: Can I export my data?**
A: Yes, from the Activity Log page you can view and analyze your tracking data. Export features may be added in future versions.

**Q: Is my data private?**
A: Yes, data is stored in your personal Supabase account. Only you have access (Kronos uses your login credentials).
