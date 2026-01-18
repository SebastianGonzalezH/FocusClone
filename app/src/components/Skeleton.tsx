import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`bg-white/5 rounded-lg animate-skeleton ${className}`}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card p-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-16" />
    </motion.div>
  );
}

export function SkeletonChart() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card p-6 space-y-4"
    >
      <Skeleton className="h-5 w-32" />
      <div className="h-64 flex items-end gap-2 pt-4">
        {[...Array(12)].map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export function SkeletonTable() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass-card overflow-hidden"
    >
      <div className="bg-white/5 px-4 py-3.5 flex gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="divide-y divide-white/5">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-4 items-center">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-28 rounded-lg" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Chart */}
      <SkeletonChart />

      {/* Bottom section */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-6 space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="flex items-center gap-6">
            <Skeleton className="w-40 h-40 rounded-full" />
            <div className="flex-1 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="w-2.5 h-2.5 rounded-full" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="glass-card p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-3">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
