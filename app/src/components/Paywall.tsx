import { motion } from 'framer-motion';
import { Lock, ArrowRight, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

interface PaywallProps {
  onClose?: () => void;
}

export default function Paywall({ onClose }: PaywallProps) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      // Call the create-checkout edge function
      const { data, error } = await supabase.functions.invoke('create-checkout');

      if (error) {
        console.error('Checkout error:', error);
        alert('Failed to start checkout. Please try again.');
        setLoading(false);
        return;
      }

      // Redirect to Culqi checkout URL
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="premium-card max-w-md w-full p-8 text-center"
      >
        <div className="inline-flex p-3 bg-accent-dim text-accent mb-6">
          <Lock size={24} strokeWidth={1.5} />
        </div>

        <h2 className="text-xl font-medium text-white mb-2">
          Your trial has ended
        </h2>
        <p className="text-sm text-muted mb-8">
          Upgrade to Pro to continue tracking your productivity and unlock all features.
        </p>

        <div className="premium-card p-6 mb-6 text-left">
          <div className="flex items-baseline justify-between mb-4">
            <span className="text-sm text-muted">Kronos Pro</span>
            <div>
              <span className="text-2xl font-semibold text-white">$9</span>
              <span className="text-muted">/month</span>
            </div>
          </div>

          <ul className="space-y-2">
            {[
              'Unlimited time tracking',
              'AI-powered categorization',
              'Full analytics access',
              'Data export'
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-xs text-muted">
                <Check size={12} className="text-accent flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <motion.button
          onClick={handleUpgrade}
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {loading ? 'Processing...' : 'Upgrade to Pro'}
          <ArrowRight size={16} strokeWidth={1.5} />
        </motion.button>

        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-muted hover:text-white transition-colors mt-4"
          >
            Maybe later
          </button>
        )}
      </motion.div>
    </div>
  );
}
