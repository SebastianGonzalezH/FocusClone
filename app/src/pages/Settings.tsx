import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Bell, Clock, Shield, Database, RefreshCw, CreditCard, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface SettingToggleProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function SettingToggle({ label, description, icon, enabled, onChange, disabled }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between py-5 border-b border-border">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-card-hover text-muted">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium text-white">{label}</div>
          <div className="text-xs text-muted mt-0.5">{description}</div>
        </div>
      </div>
      <motion.button
        onClick={() => !disabled && onChange(!enabled)}
        className={`relative w-12 h-6 transition-colors duration-200 ${
          enabled ? 'bg-accent' : 'bg-card-hover border border-border'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        whileTap={disabled ? {} : { scale: 0.95 }}
      >
        <motion.div
          className={`absolute top-1 w-4 h-4 ${enabled ? 'bg-black' : 'bg-muted'}`}
          animate={{ left: enabled ? 28 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.button>
    </div>
  );
}

interface SettingSelectProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function SettingSelect({ label, description, icon, value, options, onChange }: SettingSelectProps) {
  return (
    <div className="flex items-center justify-between py-5 border-b border-border">
      <div className="flex items-center gap-4">
        <div className="p-2.5 bg-card-hover text-muted">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium text-white">{label}</div>
          <div className="text-xs text-muted mt-0.5">{description}</div>
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-card border border-border px-3 py-1.5 text-xs cursor-pointer hover:border-muted transition-colors focus:outline-none focus:border-accent"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function Settings() {
  const { user, profile, daysRemaining } = useAuth();
  const [cancelLoading, setCancelLoading] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [notifications, setNotifications] = useState(false);
  const [idleTimeout, setIdleTimeout] = useState('5');
  const [autoSync, setAutoSync] = useState(true);
  const [dataRetention, setDataRetention] = useState('30');

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('kronos-theme');
    const savedNotifications = localStorage.getItem('kronos-notifications');
    const savedIdleTimeout = localStorage.getItem('kronos-idle-timeout');
    const savedAutoSync = localStorage.getItem('kronos-auto-sync');
    const savedDataRetention = localStorage.getItem('kronos-data-retention');

    if (savedTheme) setTheme(savedTheme as 'dark' | 'light');
    if (savedNotifications) setNotifications(savedNotifications === 'true');
    if (savedIdleTimeout) setIdleTimeout(savedIdleTimeout);
    if (savedAutoSync !== null) setAutoSync(savedAutoSync !== 'false');
    if (savedDataRetention) setDataRetention(savedDataRetention);
  }, []);

  // Save theme and apply to document
  useEffect(() => {
    localStorage.setItem('kronos-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Save other settings
  useEffect(() => {
    localStorage.setItem('kronos-notifications', String(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('kronos-idle-timeout', idleTimeout);
  }, [idleTimeout]);

  useEffect(() => {
    localStorage.setItem('kronos-auto-sync', String(autoSync));
  }, [autoSync]);

  useEffect(() => {
    localStorage.setItem('kronos-data-retention', dataRetention);
  }, [dataRetention]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-display text-2xl text-white">Settings</h1>
      </div>

      {/* Account Section */}
      <div className="premium-card p-6">
        <div className="metric-label mb-6">Account</div>
        <div className="flex items-center gap-4 py-4">
          <div className="w-12 h-12 bg-accent flex items-center justify-center">
            <span className="text-display text-xl text-black">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium text-white">{user?.email || 'User'}</div>
            <div className="text-xs text-muted mt-0.5">
              {profile?.subscription_status === 'active' ? 'Pro Member' :
               profile?.subscription_status === 'trialing' ? `Trial (${daysRemaining} days left)` :
               'Free'}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Section */}
      <div className="premium-card p-6">
        <div className="metric-label mb-4">Subscription</div>
        <div className="flex items-center justify-between py-5 border-b border-border">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-accent-dim text-accent">
              <Crown size={18} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-sm font-medium text-white">
                {profile?.subscription_status === 'active' ? 'Kronos Pro' :
                 profile?.subscription_status === 'trialing' ? 'Free Trial' :
                 'Free Plan'}
              </div>
              <div className="text-xs text-muted mt-0.5">
                {profile?.subscription_status === 'active' ? '$7/month' :
                 profile?.subscription_status === 'trialing' ? `${daysRemaining} days remaining` :
                 'Upgrade for full access'}
              </div>
            </div>
          </div>
          {profile?.subscription_status !== 'active' && (
            <motion.button
              onClick={async () => {
                const { data } = await supabase.functions.invoke('create-checkout');
                if (data?.url) window.location.href = data.url;
              }}
              className="btn-primary text-xs px-4 py-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Upgrade
            </motion.button>
          )}
        </div>

        {profile?.subscription_status === 'active' && (
          <div className="flex items-center justify-between py-5">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-card-hover text-muted">
                <CreditCard size={18} strokeWidth={1.5} />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Manage Subscription</div>
                <div className="text-xs text-muted mt-0.5">Update payment or cancel</div>
              </div>
            </div>
            <motion.button
              onClick={async () => {
                setCancelLoading(true);
                const { error } = await supabase.functions.invoke('cancel-subscription');
                if (!error) {
                  alert('Subscription cancelled. You will have access until the end of your billing period.');
                }
                setCancelLoading(false);
              }}
              disabled={cancelLoading}
              className="text-xs text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {cancelLoading ? 'Processing...' : 'Cancel Subscription'}
            </motion.button>
          </div>
        )}
      </div>

      {/* Appearance Section */}
      <div className="premium-card p-6">
        <div className="metric-label mb-4">Appearance</div>
        <SettingToggle
          label="Light Mode"
          description="Switch to a light color scheme"
          icon={theme === 'light' ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
          enabled={theme === 'light'}
          onChange={(enabled) => setTheme(enabled ? 'light' : 'dark')}
          disabled={true}
        />
        <div className="text-xs text-muted py-2 pl-14">Light mode coming soon</div>
      </div>

      {/* Tracking Section */}
      <div className="premium-card p-6">
        <div className="metric-label mb-4">Tracking</div>
        <SettingSelect
          label="Idle Detection"
          description="Time before marking as away"
          icon={<Clock size={18} strokeWidth={1.5} />}
          value={idleTimeout}
          options={[
            { value: '2', label: '2 minutes' },
            { value: '5', label: '5 minutes' },
            { value: '10', label: '10 minutes' },
            { value: '15', label: '15 minutes' },
          ]}
          onChange={setIdleTimeout}
        />
        <SettingToggle
          label="Auto Sync"
          description="Automatically sync data to cloud"
          icon={<RefreshCw size={18} strokeWidth={1.5} />}
          enabled={autoSync}
          onChange={setAutoSync}
        />
      </div>

      {/* Notifications Section */}
      <div className="premium-card p-6">
        <div className="metric-label mb-4">Notifications</div>
        <SettingToggle
          label="Desktop Notifications"
          description="Get notified about productivity insights"
          icon={<Bell size={18} strokeWidth={1.5} />}
          enabled={notifications}
          onChange={setNotifications}
        />
      </div>

      {/* Data Section */}
      <div className="premium-card p-6">
        <div className="metric-label mb-4">Data & Privacy</div>
        <SettingSelect
          label="Data Retention"
          description="How long to keep your activity data"
          icon={<Database size={18} strokeWidth={1.5} />}
          value={dataRetention}
          options={[
            { value: '7', label: '7 days' },
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
            { value: '365', label: '1 year' },
            { value: 'forever', label: 'Forever' },
          ]}
          onChange={setDataRetention}
        />
        <div className="flex items-center justify-between py-5">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-card-hover text-muted">
              <Shield size={18} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-sm font-medium text-white">Privacy</div>
              <div className="text-xs text-muted mt-0.5">Your data is stored securely and never shared</div>
            </div>
          </div>
        </div>
      </div>

      {/* Version */}
      <div className="text-center text-xs text-muted pt-4">
        Kronos v1.0.0
      </div>
    </div>
  );
}
