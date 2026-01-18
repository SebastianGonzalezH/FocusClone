const { contextBridge, ipcRenderer } = require('electron');

// Expose Electron API to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  writeUserFile: (data) => ipcRenderer.invoke('write-user-file', data),
  clearUserFile: () => ipcRenderer.invoke('clear-user-file'),
  setTrackingPaused: (paused) => ipcRenderer.invoke('set-tracking-paused', paused),
  getTrackingPaused: () => ipcRenderer.invoke('get-tracking-paused')
});
