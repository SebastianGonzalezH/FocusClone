# Kronos - Development Plan

## Phase 11: Windows Port

### Overview
Port Kronos to Windows while maintaining feature parity with macOS. Focus on UX and performance.

### Pre-Work
- [x] Commit all macOS changes to main branch
- [x] Create `windows-port` branch from main

### Completed Tasks

- [x] Create cross-platform `tracker.js` with PowerShell for Windows (no native modules needed)
- [x] Add Windows idle time detection via PowerShell + user32.dll
- [x] Update Electron main.js with platform-specific code
- [x] Update AccessibilityBanner to only show on macOS
- [x] Add Windows build targets to package.json (NSIS installer + portable)
- [x] Expose platform info via IPC

### Remaining Tasks
- [ ] Test on Windows (VM or real machine)
- [ ] Create Windows icon (icon.ico) in build folder
- [ ] Build and test Windows installer

### Implementation Details

#### Tracker (`daemon/tracker.js`)
Used PowerShell scripts instead of native modules for simplicity:
- **Active window**: PowerShell with user32.dll P/Invoke for `GetForegroundWindow`
- **Idle time**: PowerShell with user32.dll P/Invoke for `GetLastInputInfo`
- **Browser URLs**: Not available on Windows (window title used instead)

#### Platform Detection
- `process.platform` used throughout (`darwin` = macOS, `win32` = Windows)
- Accessibility banner only shows on macOS
- `titleBarStyle: 'hiddenInset'` only applied on macOS

#### Build Config
- NSIS installer (allows custom install directory)
- Portable version (no install needed)
- x64 architecture only

### Files Modified
| File | Changes |
|------|---------|
| `daemon/tracker.js` | Cross-platform with PowerShell for Windows |
| `app/electron/main.js` | Platform detection, conditional titlebar |
| `app/electron/preload.js` | Added `getPlatform()` IPC |
| `app/src/types/electron.d.ts` | Added platform type |
| `app/src/components/AccessibilityBanner.tsx` | macOS-only display |
| `app/package.json` | Windows build scripts + NSIS config |

---

## Phase 10: Launch Preparation (macOS) ✓

### Completed
- [x] Update UI colors from gold to emerald green (#22c55e) → Reverted to gold (#D4AF37)
- [x] Update landing page with $9/mo pricing
- [x] Update Paywall component with $9/mo pricing
- [x] Add trial expiration check to ProtectedRoute
- [x] Create SQL migration for 3-day trial setup
- [x] Update checkout function amount to S/35 (~$9)
- [x] Add Dashboard and Activity Log previews to landing page
- [x] Add Accessibility permission banner for macOS users
- [x] OAuth callback handling for Electron

### Manual Setup Required (Supabase Dashboard)
- [ ] Run `supabase/migrations/001_trial_setup.sql` in SQL Editor
- [ ] Configure Culqi environment variables if not already set
- [ ] Test full payment flow end-to-end

---

## Previous Phases (Completed)

<details>
<summary>Phase 1-9 (Click to expand)</summary>

## Phase 9: Fix Google OAuth & App Launch Issues
- [x] Updated `AuthContext.tsx` to handle `SIGNED_IN` events
- [x] Modified `app/package.json` to unset `ELECTRON_RUN_AS_NODE`
- [x] Restructured workspace for local electron install

## Phase 8: Critical Bug Fixes
- [x] Fix directory path in `main.js` - change `.focusclone` to `.kronos`
- [x] Fix pause mechanism in `main.js` - write `paused` flag to `user.json`
- [x] Fix daemon spawn in `main.js` - use `spawn` instead of `fork`

## Phase 1-7
- [x] Architecture & Database setup
- [x] Daemon tracker implementation
- [x] Electron + React frontend
- [x] Premium UI redesign
- [x] UI refinements

</details>
