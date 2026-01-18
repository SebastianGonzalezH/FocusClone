export interface ElectronAPI {
  writeUserFile: (data: { userId: string; email: string }) => Promise<void>;
  clearUserFile: () => Promise<void>;
  setTrackingPaused: (paused: boolean) => Promise<{ success: boolean; error?: string }>;
  getTrackingPaused: () => Promise<{ paused: boolean }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
