import { motion } from 'framer-motion';
import { Clock, ArrowRight } from 'lucide-react';

interface TrialBannerProps {
  daysRemaining: number;
  onUpgradeClick?: () => void;
}

export default function TrialBanner({ daysRemaining, onUpgradeClick }: TrialBannerProps) {
  const isUrgent = daysRemaining <= 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between px-4 py-2.5 border-b ${
        isUrgent
          ? 'bg-rose-500/10 border-rose-500/20'
          : 'bg-accent-dim border-accent/20'
      }`}
    >
      <div className="flex items-center gap-3">
        <Clock size={14} strokeWidth={1.5} className={isUrgent ? 'text-rose-400' : 'text-accent'} />
        <span className="text-xs">
          <span className={isUrgent ? 'text-rose-400' : 'text-accent'}>
            {daysRemaining === 0
              ? 'Trial ends today'
              : daysRemaining === 1
              ? '1 day left in trial'
              : `${daysRemaining} days left in trial`}
          </span>
        </span>
      </div>

      <button
        onClick={onUpgradeClick}
        className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
      >
        Upgrade now
        <ArrowRight size={12} strokeWidth={1.5} />
      </button>
    </motion.div>
  );
}
