export interface OAuthCallbackData {
  access_token: string;
  refresh_token: string;
  expires_in: string;
  token_type: string;
}

export interface ElectronAPI {
  writeUserFile: (data: { userId: string; email: string }) => Promise<void>;
  clearUserFile: () => Promise<void>;
  setTrackingPaused: (paused: boolean) => Promise<{ success: boolean; error?: string }>;
  getTrackingPaused: () => Promise<{ paused: boolean }>;
  // Auth session persistence
  saveAuthSession: (session: unknown) => Promise<{ success: boolean; error?: string }>;
  getAuthSession: () => Promise<unknown | null>;
  clearAuthSession: () => Promise<{ success: boolean; error?: string }>;
  // OAuth
  openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
  onOAuthCallback: (callback: (data: OAuthCallbackData) => void) => void;
  // Accessibility permission (macOS only)
  checkAccessibilityPermission: () => Promise<{ granted: boolean }>;
  openAccessibilitySettings: () => Promise<{ success: boolean; error?: string }>;
  // Platform info
  getPlatform: () => Promise<'darwin' | 'win32' | 'linux'>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
