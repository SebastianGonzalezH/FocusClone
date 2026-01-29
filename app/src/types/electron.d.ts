export interface ElectronAPI {
  writeUserFile: (data: { userId: string; email: string }) => Promise<void>;
  clearUserFile: () => Promise<void>;
  setTrackingPaused: (paused: boolean) => Promise<{ success: boolean; error?: string }>;
  getTrackingPaused: () => Promise<{ paused: boolean }>;
  // Auth session persistence
  saveAuthSession: (session: unknown) => Promise<{ success: boolean; error?: string }>;
  getAuthSession: () => Promise<unknown | null>;
  clearAuthSession: () => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
