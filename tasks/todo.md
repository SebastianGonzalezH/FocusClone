# FocusClone - Development Plan

## Phase 1: Architecture & Database
- [x] Initialize project structure (`/app`, `/daemon`, `/db`)
- [x] Create root package.json for monorepo
- [x] Create SQLite schema with `events`, `categories`, `rules` tables
- [x] Create `enriched_logs` SQL view
- [x] Seed default categories

## Phase 2: The Watcher (Daemon)
- [x] Setup daemon package.json with dependencies
- [x] Create `tracker.js` with 2-second polling loop
- [x] Integrate `active-win` for window tracking
- [x] Integrate `desktop-idle` for idle detection (5 min threshold)
- [x] Create `categorizer.js` for bulk rule application (1 min interval)

## Phase 3: The Frontend (Electron)
- [x] Setup Electron + Vite + React + TypeScript in `/app`
- [x] Configure Tailwind CSS with Zinc dark theme
- [x] Install recharts and tanstack-table
- [x] Create Dashboard page with Timeline and Donut chart
- [x] Create Event Log page with data table
- [x] Configure Electron main process for SQLite access

---

## Phase 6: Premium Luxury UI Redesign

### Design Direction
**Aesthetic**: "Quiet Luxury" - Sharp, clean, minimalist, high contrast. Think premium watch brands, luxury automotive interfaces, exclusive membership portals.

**Color Palette**:
- **Black**: Pure `#000000` base, deep `#080808` for cards
- **White**: `#FFFFFF` for primary text, `#666666` for muted
- **Gold**: Rich classic gold `#D4AF37`, highlight `#E8C547`

**Typography**:
- Display: "Instrument Serif" for brand/headings (editorial, refined)
- Body: "Inter" with tight tracking (clean, professional)

**Key Principles**:
- Ultra-thin 1px borders
- Zero border radius (sharp, precise corners)
- Generous whitespace with asymmetric layouts
- Subtle gold accents on interactive elements
- Minimalist iconography with thin strokes

### Implementation Tasks

#### Phase 6.1: Design Foundation
- [x] Update index.html - Add Instrument Serif + Inter fonts
- [x] Update tailwind.config.js - Premium color palette, typography, sharp borders
- [x] Update index.css - Refined design tokens, luxury component classes

#### Phase 6.2: Core Layout
- [x] Redesign App.tsx sidebar - Ultra-minimal with gold active states
- [x] Update page container and transitions

#### Phase 6.3: Dashboard Redesign
- [x] Redesign metric cards - Large numbers, uppercase labels, gold accents
- [x] Update date range selector - Minimal underline/text style
- [x] Refine charts - Dark theme with gold highlights
- [x] Update ranked lists - Elegant typography and spacing

#### Phase 6.4: Event Log Redesign
- [x] Redesign table - Refined headers, sharp corners
- [x] Update controls - Premium search and buttons
- [x] Refine pagination - Minimal, elegant

#### Phase 6.5: Categories Page
- [x] Update category management UI
- [x] Refine color picker with gold border

#### Phase 6.6: Auth Pages
- [x] Redesign Login - Premium entrance experience
- [x] Redesign Signup - Match login aesthetic

#### Phase 6.7: Polish
- [x] Onboarding Template Selection page updated
- [x] Build verified successful

---

## Phase 6 Review

### Summary
Implemented a complete premium luxury UI redesign with a "Quiet Luxury" aesthetic. The app now features a refined black, white, and gold color scheme with sharp corners, elegant typography, and subtle gold accents.

### Files Modified

| File | Changes |
|------|---------|
| `app/index.html` | Added Instrument Serif + Inter fonts from Google Fonts |
| `app/tailwind.config.js` | Premium color palette, zero border-radius, gold shadows, letterSpacing |
| `app/src/index.css` | Redesigned design system with premium component classes |
| `app/src/App.tsx` | Ultra-minimal sidebar with gold active indicator, refined page transitions |
| `app/src/pages/Dashboard.tsx` | Premium metric cards, refined charts, elegant typography |
| `app/src/pages/EventLog.tsx` | Sharp table design, premium controls, refined pagination |
| `app/src/pages/Categories.tsx` | Premium card layout, refined color picker |
| `app/src/pages/Login.tsx` | Luxury entrance experience with serif brand mark |
| `app/src/pages/Signup.tsx` | Matching premium auth design |
| `app/src/pages/onboarding/TemplateSelection.tsx` | Refined onboarding with gold accents |

### Key Design Elements

1. **Typography**: Instrument Serif for display/brand, Inter for body text
2. **Color System**:
   - Black `#000000` (base), `#080808` (cards)
   - White `#FFFFFF` (text), `#666666` (muted)
   - Gold `#D4AF37` (accent), `#E8C547` (hover)
3. **Borders**: Ultra-thin 1px, zero border-radius throughout
4. **Components**:
   - `.premium-card` - Sharp bordered cards
   - `.btn-primary` - Gold buttons with glow
   - `.input-premium` - Refined form inputs
   - `.metric-label` - 10px uppercase tracking
5. **Animations**: Subtle Framer Motion with spring physics
6. **Icons**: Lucide icons at 1.5 strokeWidth for thin aesthetic

### Build Status
- `npm run build` passes successfully
- Run `npm run dev` in `/app` to preview

---

## Phase 7: UI Refinements

### Tasks
- [x] Fix Dashboard date filtering - Changed from UTC to local time
- [x] Add Custom date range option with start/end date pickers
- [x] Move Categorize button from Dashboard to Activity Log
- [x] Rename "Events" page to "Activity Log"
- [x] Add Settings page with common options
- [x] Build verified successful

---

## Phase 7 Review

### Summary
Implemented user-requested refinements to improve usability and add a Settings page.

### Files Modified

| File | Changes |
|------|---------|
| `app/src/pages/Dashboard.tsx` | Fixed date filtering to use local time instead of UTC; Added Custom date range with date pickers; Removed Categorize button |
| `app/src/pages/EventLog.tsx` | Renamed header to "Activity Log"; Added Categorize button and functionality |
| `app/src/App.tsx` | Added Settings nav item and route |
| `app/src/pages/Settings.tsx` | New file - Settings page with theme, tracking, notifications, and data options |

### Key Changes

1. **Date Filtering Fix**: Dashboard now uses local time for date calculations instead of UTC, fixing the "Today" view showing wrong data
2. **Custom Date Range**: Added a "Custom" option in the date range selector with start/end date pickers
3. **Activity Log**: Renamed "Events" to "Activity Log" and moved the Categorize button there
4. **Settings Page**: New settings page with:
   - Light Mode toggle (coming soon)
   - Idle Detection timeout selector
   - Auto Sync toggle
   - Desktop Notifications toggle
   - Data Retention selector

### Build Status
- `npm run build` passes successfully
