import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ExternalLink, X, RefreshCw } from 'lucide-react';

export function AccessibilityBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isMacOS, setIsMacOS] = useState(false);

  async function checkPermission() {
    if (!window.electronAPI?.checkAccessibilityPermission) return;

    setChecking(true);
    try {
      const result = await window.electronAPI.checkAccessibilityPermission();
      setShowBanner(!result.granted);
    } catch {
      // If check fails, assume no permission
      setShowBanner(true);
    }
    setChecking(false);
  }

  useEffect(() => {
    // Only show on macOS - Windows doesn't need accessibility permission
    async function init() {
      if (window.electronAPI?.getPlatform) {
        const platform = await window.electronAPI.getPlatform();
        setIsMacOS(platform === 'darwin');
        if (platform === 'darwin') {
          checkPermission();
        }
      }
    }
    init();

    // Re-check when window gains focus (user might have granted permission)
    const handleFocus = () => {
      if (isMacOS) checkPermission();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isMacOS]);

  async function openSettings() {
    if (window.electronAPI?.openAccessibilitySettings) {
      await window.electronAPI.openAccessibilitySettings();
    }
  }

  // Only show on macOS when permission is not granted
  if (!isMacOS || !showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-amber-500/10 border border-amber-500/30 px-4 py-3 flex items-center gap-3"
      >
        <AlertTriangle className="text-amber-400 shrink-0" size={18} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-amber-200">
            <span className="font-medium">Accessibility permission required.</span>{' '}
            <span className="text-amber-300/80">Kronos needs this to track which apps you're using.</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={checkPermission}
            disabled={checking}
            className="text-amber-400 hover:text-amber-300 p-1.5 transition-colors"
            title="Check again"
          >
            <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={openSettings}
            className="flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-medium px-3 py-1.5 transition-colors"
          >
            Open Settings
            <ExternalLink size={12} />
          </button>
          <button
            onClick={() => setShowBanner(false)}
            className="text-amber-400/60 hover:text-amber-400 p-1 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
