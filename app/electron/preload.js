const { contextBridge, ipcRenderer } = require('electron');

// Expose Electron API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  writeUserFile: (data) => ipcRenderer.invoke('write-user-file', data),
  clearUserFile: () => ipcRenderer.invoke('clear-user-file'),
  setTrackingPaused: (paused) => ipcRenderer.invoke('set-tracking-paused', paused),
  getTrackingPaused: () => ipcRenderer.invoke('get-tracking-paused'),
  // Auth session persistence
  saveAuthSession: (session) => ipcRenderer.invoke('save-auth-session', session),
  getAuthSession: () => ipcRenderer.invoke('get-auth-session'),
  clearAuthSession: () => ipcRenderer.invoke('clear-auth-session'),
  // OAuth - open URL in external browser
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  // OAuth callback listener
  onOAuthCallback: (callback) => {
    ipcRenderer.on('oauth-callback', (event, data) => callback(data));
  },
  // Accessibility permission check (macOS only)
  checkAccessibilityPermission: () => ipcRenderer.invoke('check-accessibility-permission'),
  openAccessibilitySettings: () => ipcRenderer.invoke('open-accessibility-settings'),
  // Platform info
  getPlatform: () => ipcRenderer.invoke('get-platform')
});
