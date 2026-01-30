# Windows Setup Guide for Kronos

## Environment Setup

### Prerequisites
- Node.js 18+ (tested with v24.13.0)
- npm 11+ (tested with v11.6.2)
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/SebastianGonzalezH/Kronos.git
cd Kronos
git checkout windows-port
```

2. Install app dependencies:
```bash
cd app
npm install
```

3. Install daemon dependencies:
```bash
cd ../daemon
npm install
```

### Environment Variables

Create `.env` files in both `app` and `daemon` directories:

**app/.env:**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**daemon/.env:**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Windows-Specific Issues & Fixes

### ELECTRON_RUN_AS_NODE Environment Variable

**Problem:** If the `ELECTRON_RUN_AS_NODE` environment variable is set (even to `0` or empty string), Electron will run in Node.js mode instead of Electron mode, causing the app to fail with:
```
TypeError: Cannot read properties of undefined (reading 'setAsDefaultProtocolClient')
```

**Solution:** We created a wrapper script (`start-electron.js`) that explicitly unsets this variable before launching Electron:

```javascript
// start-electron.js
delete process.env.ELECTRON_RUN_AS_NODE;

const { spawn } = require('child_process');
const electron = require('electron');
const electronPath = typeof electron === 'string' ? electron : electron.toString();

const child = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: undefined
  }
});

child.on('close', (code) => {
  process.exit(code);
});
```

The `package.json` script was updated to use this wrapper:
```json
"electron:dev": "concurrently \"vite\" \"wait-on http://localhost:5173 && node start-electron.js\""
```

### HashRouter for Windows Compatibility

The app uses `HashRouter` instead of `BrowserRouter` for routing because:
- Windows Electron apps use the `file://` protocol
- `BrowserRouter` doesn't work with `file://` URLs
- `HashRouter` uses `#` in URLs, which is compatible with file-based loading

This fix was already implemented in the windows-port branch (commit 97ea715).

## Running the App

### Development Mode
```bash
cd app
npm run electron:dev
```

This will:
1. Start Vite dev server on http://localhost:5173 (or next available port)
2. Launch Electron window
3. Start the tracking daemon automatically

### Building for Windows
```bash
cd app
npm run electron:build:win
```

This will:
1. Generate `icon.ico` from source image (if needed)
2. Build the TypeScript code
3. Create Windows installers in `app/release/`:
   - NSIS installer (customizable installation)
   - Portable executable (no installation required)

## Troubleshooting

### Daemon shows "No user file found"
This is normal - log in through the Electron UI first. The daemon waits for authentication before tracking.

### Port already in use
Vite will automatically find the next available port if 5173 is in use.

### Missing icon.ico error
Run `npm run generate-ico` in the app directory to create the Windows icon.

## Windows-Specific Features

### Window Tracking
- Uses PowerShell with P/Invoke to call Win32 APIs
- Tracks active window title and process name
- **Note:** Browser URL tracking is not available on Windows (shows window title only)

### Idle Detection
- Uses `GetLastInputInfo` Win32 API
- Detects when user is away from keyboard/mouse

### No Accessibility Permissions Required
Unlike macOS, Windows doesn't require special accessibility permissions for window tracking.

## Known Limitations

1. **Browser URL tracking:** Not available on Windows without native modules
2. **Linux support:** Not yet implemented
3. **Security vulnerabilities:** npm audit shows 8 vulnerabilities (3 moderate, 5 high) - review before production use
