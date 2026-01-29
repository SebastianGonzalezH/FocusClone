# Kronos - Development Plan

## Phase 10: Launch Preparation

### Completed
- [x] Update UI colors from gold to emerald green (#22c55e) → Reverted to gold (#D4AF37)
- [x] Update landing page with $9/mo pricing
- [x] Update Paywall component with $9/mo pricing
- [x] Add trial expiration check to ProtectedRoute
- [x] Create SQL migration for 3-day trial setup
- [x] Update checkout function amount to S/35 (~$9)
- [x] Add Dashboard and Activity Log previews to landing page

### Manual Setup Required (Supabase Dashboard)
- [ ] Run `supabase/migrations/001_trial_setup.sql` in SQL Editor
- [ ] Configure Culqi environment variables if not already set
- [ ] Test full payment flow end-to-end

### Files Changed
| File | Change |
|------|--------|
| `app/tailwind.config.js` | Emerald green color palette |
| `app/src/index.css` | Updated CSS variables and classes |
| `app/src/pages/Landing.tsx` | $9/mo pricing |
| `app/src/components/Paywall.tsx` | $9/mo pricing |
| `app/src/components/ProtectedRoute.tsx` | Shows Paywall when trial expires |
| `supabase/migrations/001_trial_setup.sql` | 3-day trial trigger |
| `supabase/functions/create-checkout/index.ts` | Updated to S/35 |

---

## Phase 9: Fix Google OAuth & App Launch Issues

### Issues Identified
1. **Google OAuth black screen**: After login, app shows black screen because `onAuthStateChange` only handled `SIGNED_OUT` events
2. **Electron won't launch**: `ELECTRON_RUN_AS_NODE=1` environment variable (set by Claude Code) was forcing Electron to run as plain Node.js

### Fixes Applied

- [x] Updated `AuthContext.tsx` to handle `SIGNED_IN` events in `onAuthStateChange`
- [x] Modified `app/package.json` to unset `ELECTRON_RUN_AS_NODE` before launching Electron
- [x] Restructured workspace to install electron locally in app folder

### Key Changes

| File | Change |
|------|--------|
| `app/src/contexts/AuthContext.tsx` | Added `SIGNED_IN` event handler to update user/session state |
| `app/package.json` | Changed script: `ELECTRON_RUN_AS_NODE= electron .` |
| `package.json` | Removed electron from root, moved to app-only install |

### Root Cause Analysis

**ELECTRON_RUN_AS_NODE=1** - This environment variable is set by Electron-based tools (like Claude Code) and tells any child Electron process to run as Node.js instead of as an Electron app. This caused:
- `process.type` to be `undefined` instead of `'browser'`
- `require('electron')` to resolve to the npm package (path string) instead of Electron's internal API

---

## Previous Phases (Completed)

<details>
<summary>Phase 1-8 (Click to expand)</summary>

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
