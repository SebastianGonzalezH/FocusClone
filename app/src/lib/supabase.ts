import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables');
}

// Custom storage that persists to file via Electron IPC (more reliable than localStorage in Electron)
const electronStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (window.electronAPI?.getAuthSession) {
      const session = await window.electronAPI.getAuthSession();
      return session ? JSON.stringify(session) : null;
    }
    // Fallback to localStorage
    return localStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (window.electronAPI?.saveAuthSession) {
      try {
        const parsed = JSON.parse(value);
        await window.electronAPI.saveAuthSession(parsed);
      } catch {
        // If parsing fails, still save to localStorage as backup
        localStorage.setItem(key, value);
      }
    } else {
      localStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (window.electronAPI?.clearAuthSession) {
      await window.electronAPI.clearAuthSession();
    }
    localStorage.removeItem(key);
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storageKey: 'kronos-auth',
    storage: electronStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
