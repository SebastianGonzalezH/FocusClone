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

## Review
_(To be completed after implementation)_
