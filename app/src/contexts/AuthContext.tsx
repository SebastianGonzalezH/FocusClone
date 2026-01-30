import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  template_id: string | null;
  onboarding_completed: boolean;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
}

// Helper to calculate days remaining in trial
function getDaysRemaining(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const now = new Date();
  const end = new Date(trialEndsAt);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// Helper to check if subscription is active
function isSubscriptionActive(profile: UserProfile | null): boolean {
  if (!profile) return false;
  const status = profile.subscription_status;

  if (status === 'active') return true;

  if (status === 'trialing') {
    return getDaysRemaining(profile.trial_ends_at) > 0;
  }

  return false;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  profileLoading: boolean;
  isSubscribed: boolean;
  daysRemaining: number;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const lastProcessedUserIdRef = useRef<string | null>(null);

  // Fetch user profile from database with timeout (optional - table may not exist)
  async function fetchProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 5000); // 5 second timeout
      });

      const fetchPromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .then(({ data, error }) => {
          if (error) return null;
          return data as UserProfile;
        });

      return await Promise.race([fetchPromise, timeoutPromise]);
    } catch {
      return null;
    }
  }

  // Write user ID to file for daemon (via Electron IPC)
  async function writeUserFile(userId: string, email: string) {
    if (window.electronAPI?.writeUserFile) {
      await window.electronAPI.writeUserFile({ userId, email });
    }
  }

  // Clear user file on logout
  async function clearUserFile() {
    if (window.electronAPI?.clearUserFile) {
      await window.electronAPI.clearUserFile();
    }
  }

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    console.log('AuthContext: Getting initial session...');
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log('AuthContext: getSession result', { session: !!session, error });

      if (error) {
        console.error('AuthContext: getSession error:', error);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('AuthContext: User found, writing user file...');
        // Mark this user as processed to prevent duplicate handling in onAuthStateChange
        lastProcessedUserIdRef.current = session.user.id;
        await writeUserFile(session.user.id, session.user.email || '');

        // Fetch profile - track loading state
        setProfileLoading(true);
        setLoading(false);
        console.log('AuthContext: Loading complete, fetching profile...');

        fetchProfile(session.user.id).then(userProfile => {
          console.log('AuthContext: Profile fetched:', userProfile);
          setProfile(userProfile);
          setProfileLoading(false);
        });
      } else {
        console.log('AuthContext: No session/user');
        setLoading(false);
        console.log('AuthContext: Loading complete');
      }
    }).catch(err => {
      console.error('AuthContext: Unexpected error:', err);
      setLoading(false);
    });

    // Listen for OAuth callback from Electron (custom protocol)
    if (window.electronAPI?.onOAuthCallback) {
      window.electronAPI.onOAuthCallback(async (data) => {
        console.log('AuthContext: OAuth callback received');
        try {
          // Set the session using the tokens from the callback
          const { data: sessionData, error } = await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token
          });

          if (error) {
            console.error('AuthContext: Error setting session from OAuth:', error);
            return;
          }

          if (sessionData.session) {
            // Mark this user as processed to prevent duplicate handling
            lastProcessedUserIdRef.current = sessionData.session.user.id;
            setSession(sessionData.session);
            setUser(sessionData.session.user);
            await writeUserFile(sessionData.session.user.id, sessionData.session.user.email || '');

            // Fetch profile
            setProfileLoading(true);
            const userProfile = await fetchProfile(sessionData.session.user.id);
            setProfile(userProfile);
            setProfileLoading(false);
          }
        } catch (err) {
          console.error('AuthContext: OAuth callback error:', err);
        }
      });
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('AuthContext: onAuthStateChange', event);

        // Handle token refresh - just update session, don't refetch profile
        if (event === 'TOKEN_REFRESHED' && newSession) {
          console.log('AuthContext: Token refreshed, updating session');
          setSession(newSession);
          return;
        }

        // Handle initial session - skip if we already processed in getSession
        if (event === 'INITIAL_SESSION') {
          console.log('AuthContext: Initial session event, skipping (handled by getSession)');
          return;
        }

        if (event === 'SIGNED_IN' && newSession) {
          // Skip if we already processed this user (prevents infinite loop)
          if (newSession.user.id === lastProcessedUserIdRef.current) {
            console.log('AuthContext: Skipping duplicate SIGNED_IN for same user');
            return;
          }

          lastProcessedUserIdRef.current = newSession.user.id;
          setSession(newSession);
          setUser(newSession.user);
          await writeUserFile(newSession.user.id, newSession.user.email || '');

          // Fetch profile
          setProfileLoading(true);
          const userProfile = await fetchProfile(newSession.user.id);
          setProfile(userProfile);
          setProfileLoading(false);
        } else if (event === 'SIGNED_OUT') {
          lastProcessedUserIdRef.current = null;
          setSession(null);
          setUser(null);
          setProfile(null);
          await clearUserFile();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  }

  async function signInWithGoogle() {
    // Check if we're in Electron (packaged app)
    const isElectron = !!window.electronAPI?.openExternalUrl;

    if (isElectron) {
      // Use external browser with custom protocol callback
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'kronos://auth-callback',
          skipBrowserRedirect: true, // Don't redirect, just get the URL
          queryParams: {
            prompt: 'select_account'
          }
        }
      });

      if (error) return { error };

      // Open the OAuth URL in the system browser
      if (data?.url && window.electronAPI) {
        await window.electronAPI.openExternalUrl(data.url);
      }

      return { error: null };
    } else {
      // Standard web OAuth flow
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });
      return { error };
    }
  }

  async function signOut() {
    lastProcessedUserIdRef.current = null;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    await clearUserFile();
  }

  async function refreshProfile() {
    if (user) {
      const userProfile = await fetchProfile(user.id);
      // Only update if fetch succeeded (don't overwrite with null on timeout)
      if (userProfile) {
        setProfile(userProfile);
      }
    }
  }

  // Compute subscription status
  const isSubscribed = isSubscriptionActive(profile);
  const daysRemaining = profile ? getDaysRemaining(profile.trial_ends_at) : 0;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      loading,
      profileLoading,
      isSubscribed,
      daysRemaining,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
