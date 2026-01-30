# Kronos - Development Plan

## Phase 11: Windows Port

### Overview
Port Kronos to Windows while maintaining feature parity with macOS. Focus on UX and performance.

### Pre-Work
- [x] Commit all macOS changes to main branch
- [ ] Create `windows-port` branch from main

### Windows-Specific Changes Needed

#### 1. Daemon Tracker (`daemon/tracker.js`)
macOS uses AppleScript which doesn't exist on Windows. Need to replace:

| Feature | macOS | Windows Approach |
|---------|-------|------------------|
| Get active window | AppleScript + System Events | PowerShell or `active-win` npm package |
| Get browser URL | AppleScript to Chrome/Safari | Likely not possible without extension (accept limitation) |
| Get system idle time | `ioreg -c IOHIDSystem` | PowerShell or `user32.dll` via native addon |

**Approach**: Use `active-win` npm package (cross-platform native module) instead of AppleScript

#### 2. Electron Main Process (`app/electron/main.js`)
| Feature | macOS | Windows Approach |
|---------|-------|------------------|
| Accessibility permission check | AppleScript test | Not needed on Windows |
| Open Settings | `x-apple.systempreferences:` URL | Windows doesn't need this |
| Custom protocol | `kronos://` | Works on Windows (registry-based) |
| `titleBarStyle: 'hiddenInset'` | macOS-specific | Use `frame: false` + custom titlebar OR standard frame |

#### 3. Build Configuration (`app/package.json`)
- Add Windows targets to electron-builder config
- Configure Windows installer (NSIS or portable)

#### 4. Permission Banner (`app/src/components/AccessibilityBanner.tsx`)
- Only show on macOS (Windows doesn't need Accessibility permission)

### Task List

- [ ] Install `active-win` package in daemon
- [ ] Create cross-platform `tracker.js` with platform detection
- [ ] Add Windows idle time detection
- [ ] Update Electron main.js with platform-specific code
- [ ] Update AccessibilityBanner to only show on macOS
- [ ] Add Windows build targets to package.json
- [ ] Test on Windows (VM or real machine)
- [ ] Build Windows installer

### Files to Modify
| File | Changes |
|------|---------|
| `daemon/package.json` | Add `active-win` dependency |
| `daemon/tracker.js` | Platform detection, Windows tracking |
| `app/electron/main.js` | Platform-specific permission handling |
| `app/electron/preload.js` | Expose platform info |
| `app/src/components/AccessibilityBanner.tsx` | macOS-only display |
| `app/package.json` | Windows build config |

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
