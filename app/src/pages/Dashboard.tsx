import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { RefreshCw, ArrowLeft, Copy, Check, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' as const }
  })
};

// Types
interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface CategoryDetail {
  name: string;
  color: string;
  totalDuration: number;
  apps: { name: string; duration: number; events: { title: string; url: string; timestamp: string; duration: number }[] }[];
}

interface AppData {
  name: string;
  duration: number;
  icon?: string;
}

interface StackedBarData {
  name: string;
  [category: string]: string | number;
}

interface Summary {
  total: number;
  productive: number;
  idle: number;
  topCategories: { name: string; color: string; duration: number }[];
}

type DateRange = 'day' | 'week' | 'month' | 'custom';

// Helper functions
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${secs}s`;
}

function formatDurationShort(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${secs}s`;
}

function getDateRange(range: DateRange, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date();

  // Use local time for date boundaries
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (range) {
    case 'day':
      return { start: todayStart, end: todayEnd };
    case 'week':
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 6);
      return { start: weekStart, end: todayEnd };
    case 'month':
      const monthStart = new Date(todayStart);
      monthStart.setDate(monthStart.getDate() - 29);
      return { start: monthStart, end: todayEnd };
    case 'custom':
      if (customStart && customEnd) {
        const start = new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate(), 0, 0, 0);
        const end = new Date(customEnd.getFullYear(), customEnd.getMonth(), customEnd.getDate(), 23, 59, 59);
        return { start, end };
      }
      return { start: todayStart, end: todayEnd };
    default:
      return { start: todayStart, end: todayEnd };
  }
}

// Calendar Picker Component
function CalendarPicker({
  selected,
  onChange,
  label
}: {
  selected: Date | null;
  onChange: (date: Date) => void;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selected || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return label;
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const isSelectedDay = (day: number) => {
    if (!selected) return false;
    return selected.getDate() === day &&
           selected.getMonth() === viewDate.getMonth() &&
           selected.getFullYear() === viewDate.getFullYear();
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day &&
           today.getMonth() === viewDate.getMonth() &&
           today.getFullYear() === viewDate.getFullYear();
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(newDate);
    setIsOpen(false);
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs transition-colors duration-150 border ${
          isOpen ? 'border-accent bg-card' : 'border-border bg-card hover:border-muted'
        }`}
      >
        <Calendar size={12} strokeWidth={1.5} className="text-muted" />
        <span className={selected ? 'text-white' : 'text-muted'}>{formatDisplayDate(selected)}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 z-50 premium-card p-3 shadow-lg"
            style={{ minWidth: '240px' }}
          >
            {/* Month/Year Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={prevMonth}
                className="p-1 text-muted hover:text-white transition-colors"
              >
                <ChevronLeft size={14} strokeWidth={1.5} />
              </button>
              <span className="text-xs font-medium text-white">
                {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                onClick={nextMonth}
                className="p-1 text-muted hover:text-white transition-colors"
              >
                <ChevronRight size={14} strokeWidth={1.5} />
              </button>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {dayNames.map((day) => (
                <div key={day} className="text-center text-[10px] text-muted uppercase tracking-wider py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before first of month */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="w-7 h-7" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`w-7 h-7 text-xs transition-colors duration-100 ${
                      isSelectedDay(day)
                        ? 'bg-accent text-black font-medium'
                        : isToday(day)
                        ? 'border border-accent text-accent'
                        : 'text-white hover:bg-card-hover'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Date Range Selector - Minimal underline style with Custom option
function DateRangeSelector({
  selected,
  onChange,
  customStart,
  customEnd,
  onCustomChange
}: {
  selected: DateRange;
  onChange: (range: DateRange) => void;
  customStart: Date | null;
  customEnd: Date | null;
  onCustomChange: (start: Date | null, end: Date | null) => void;
}) {
  const options: { value: DateRange; label: string }[] = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="flex items-center gap-8">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className="relative pb-2"
        >
          <span className={`text-sm transition-colors duration-200 ${
            selected === option.value ? 'text-white' : 'text-muted hover:text-white'
          }`}>
            {option.label}
          </span>
          {selected === option.value && (
            <motion.div
              layoutId="date-indicator"
              className="absolute bottom-0 left-0 right-0 h-px bg-accent"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      ))}
      {/* Custom date pickers */}
      {selected === 'custom' && (
        <div className="flex items-center gap-3 ml-4 pl-4 border-l border-border">
          <CalendarPicker
            selected={customStart}
            onChange={(date) => onCustomChange(date, customEnd)}
            label="Start date"
          />
          <span className="text-muted text-xs">to</span>
          <CalendarPicker
            selected={customEnd}
            onChange={(date) => onCustomChange(customStart, date)}
            label="End date"
          />
        </div>
      )}
    </div>
  );
}

// Metric Card - Premium luxury style
function MetricCard({
  label,
  value,
  subValue,
  isAccent = false,
  index = 0
}: {
  label: string;
  value: string;
  subValue?: string;
  isAccent?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="premium-card p-6 hover:bg-card-hover transition-colors duration-200"
    >
      <p className="metric-label mb-4">{label}</p>
      <p
        className="text-4xl font-semibold tracking-tight"
        style={{ color: isAccent ? '#D4AF37' : '#FFFFFF' }}
      >
        {value}
      </p>
      {subValue && <p className="text-xs text-muted mt-3">{subValue}</p>}
    </motion.div>
  );
}

// Top Categories Card
function TopCategoriesCard({
  categories,
  index = 0
}: {
  categories: { name: string; color: string; duration: number }[];
  index?: number;
}) {
  const total = categories.reduce((sum, c) => sum + c.duration, 0);

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="premium-card p-6 hover:bg-card-hover transition-colors duration-200"
    >
      <p className="metric-label mb-4">Top Categories</p>
      <div className="space-y-3">
        {categories.slice(0, 3).map((cat) => (
          <div key={cat.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5" style={{ backgroundColor: cat.color }} />
              <span className="text-sm text-white">{cat.name}</span>
            </div>
            <span className="text-sm font-medium text-white">
              {total > 0 ? Math.round((cat.duration / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Stacked Bar Timeline
function StackedBarTimeline({
  data,
  categories,
}: {
  data: StackedBarData[];
  categories: { name: string; color: string }[];
  dateRange?: DateRange;
}) {
  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="premium-card p-6"
      >
        <p className="metric-label mb-4">Activity Timeline</p>
        <div className="flex items-center justify-center h-48 text-muted text-sm">
          No data available
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="premium-card p-6"
    >
      <p className="metric-label mb-4">Activity Timeline</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            barSize={24}
            barGap={0}
          >
            <XAxis
              dataKey="name"
              tick={{ fill: '#71717a', fontSize: 10 }}
              axisLine={{ stroke: '#262626' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#71717a', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${Math.round(value / 60)}m`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#141414',
                border: '1px solid #262626',
                borderRadius: '0',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [formatDurationShort(value), name]}
              labelStyle={{ color: '#FFFFFF', fontWeight: 500 }}
            />
            {categories.map((cat) => (
              <Bar
                key={cat.name}
                dataKey={cat.name}
                stackId="a"
                fill={cat.color}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-border">
        {categories.slice(0, 6).map((cat) => (
          <div key={cat.name} className="flex items-center gap-2">
            <div className="w-1.5 h-1.5" style={{ backgroundColor: cat.color }} />
            <span className="text-[10px] text-muted uppercase tracking-wider">{cat.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// Category Donut Chart
function CategoryDonut({ data }: { data: CategoryData[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="premium-card p-6 h-full"
      >
        <p className="metric-label mb-4">Distribution</p>
        <div className="flex items-center justify-center h-48 text-muted text-sm">
          No data available
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="premium-card p-6 h-full"
    >
      <p className="metric-label mb-4">Distribution</p>
      <div className="flex items-center gap-6">
        <div className="w-36 h-36 flex-shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
                stroke="#000000"
                strokeWidth={1}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#080808',
                  border: '1px solid #1A1A1A',
                  borderRadius: '0',
                  fontSize: '12px',
                }}
                formatter={(value: number) => formatDuration(value)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-lg font-semibold text-white">{formatDurationShort(total)}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {data.slice(0, 5).map((category) => (
            <div key={category.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-1.5 h-1.5 flex-shrink-0" style={{ backgroundColor: category.color }} />
                <span className="text-xs text-muted truncate">{category.name}</span>
              </div>
              <span className="text-xs font-medium text-white ml-2">
                {Math.round((category.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Ranked List
function RankedList({
  title,
  items,
  type,
  onItemClick,
  delay = 0.3
}: {
  title: string;
  items: { name: string; duration: number; color?: string }[];
  type: 'categories' | 'apps';
  onItemClick?: (name: string, color: string) => void;
  delay?: number;
}) {
  const total = items.reduce((sum, item) => sum + item.duration, 0);

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="premium-card p-6"
      >
        <p className="metric-label mb-4">{title}</p>
        <div className="text-center text-muted text-sm py-4">No data available</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="premium-card p-6"
    >
      <p className="metric-label mb-4">{title}</p>
      <div className="space-y-1">
        {items.slice(0, 6).map((item, index) => {
          const percentage = total > 0 ? (item.duration / total) * 100 : 0;
          const isClickable = type === 'categories' && onItemClick;
          return (
            <div
              key={item.name}
              className={`py-2.5 border-b border-border-subtle last:border-0 ${isClickable ? 'cursor-pointer hover:bg-card-hover -mx-3 px-3 transition-colors duration-150' : ''}`}
              onClick={() => isClickable && onItemClick(item.name, item.color || '#666666')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {type === 'categories' && item.color && (
                    <div
                      className="w-1.5 h-1.5 flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                  {type === 'apps' && (
                    <span className="text-[10px] text-muted w-4 flex-shrink-0 font-medium">{index + 1}</span>
                  )}
                  <span className="text-sm truncate text-white">{item.name}</span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-sm font-medium text-white">{formatDurationShort(item.duration)}</span>
                  <span className="text-[10px] text-muted w-8 text-right font-medium">{Math.round(percentage)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Category Detail View
function CategoryDetailView({
  category,
  onBack
}: {
  category: CategoryDetail;
  onBack: () => void;
}) {
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleCopyUrl = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-muted hover:text-white transition-colors duration-150"
        >
          <ArrowLeft size={18} strokeWidth={1.5} />
        </button>
        <div className="w-2 h-2" style={{ backgroundColor: category.color }} />
        <h1 className="text-sm font-medium">{category.name}</h1>
        <span className="text-3xl font-semibold tracking-tight text-white">
          {formatDuration(category.totalDuration)}
        </span>
      </div>

      {/* Apps breakdown */}
      <div className="premium-card">
        <div className="p-4 border-b border-border">
          <p className="metric-label">Breakdown by App</p>
        </div>
        <div className="divide-y divide-border-subtle">
          {category.apps.map((app, index) => {
            const percentage = (app.duration / category.totalDuration) * 100;
            const isExpanded = expandedApp === app.name;

            return (
              <motion.div
                key={app.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <button
                  onClick={() => setExpandedApp(isExpanded ? null : app.name)}
                  className={`w-full p-4 transition-colors duration-150 text-left ${isExpanded ? 'bg-card-hover' : 'hover:bg-card-hover'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">{app.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-white">{formatDuration(app.duration)}</span>
                      <span className="text-[10px] text-muted w-8 text-right font-medium">{Math.round(percentage)}%</span>
                    </div>
                  </div>
                </button>

                {/* Expanded event list */}
                {isExpanded && app.events.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-background border-t border-border"
                  >
                    <div className="max-h-64 overflow-y-auto">
                      {app.events.slice(0, 20).map((event, i) => (
                        <div
                          key={i}
                          className="px-4 py-3 flex items-center justify-between text-sm border-b border-border-subtle last:border-0 group hover:bg-card transition-colors"
                        >
                          <div className="flex-1 min-w-0 mr-4">
                            <p className="truncate text-muted text-xs">{event.title || 'No title'}</p>
                            {event.url && (
                              <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] text-accent truncate flex-1">{event.url}</span>
                                <button
                                  onClick={(e) => handleCopyUrl(event.url, e)}
                                  className="p-1 hover:bg-card-hover transition-colors flex-shrink-0"
                                  title="Copy URL"
                                >
                                  {copiedUrl === event.url ? (
                                    <Check size={10} className="text-accent" />
                                  ) : (
                                    <Copy size={10} className="text-muted" />
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-4 flex-shrink-0">
                            <span className="text-[10px] text-muted">
                              {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[10px] font-medium text-white w-10 text-right">
                              {formatDurationShort(event.duration)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {app.events.length > 20 && (
                        <div className="px-4 py-2 text-[10px] text-muted text-center">
                          +{app.events.length - 20} more events
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// Main Dashboard Component
export default function Dashboard() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>('day');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [appData, setAppData] = useState<AppData[]>([]);
  const [stackedBarData, setStackedBarData] = useState<StackedBarData[]>([]);
  const [summary, setSummary] = useState<Summary>({
    total: 0,
    productive: 0,
    idle: 0,
    topCategories: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryDetail | null>(null);
  const [loadingCategory, setLoadingCategory] = useState(false);

  async function fetchDashboardData() {
    if (!user) return;
    setLoading(true);

    const { start, end } = getDateRange(dateRange, customStartDate || undefined, customEndDate || undefined);

    // Fetch events for the selected date range
    const { data: events, error } = await supabase
      .from('events')
      .select('id, timestamp, duration_seconds, app_name, url, is_idle')
      .eq('user_id', user.id)
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString());

    if (error) {
      console.error('Error fetching dashboard data:', error.message);
      setLoading(false);
      return;
    }

    // Fetch user's categories
    const { data: userCategories } = await supabase
      .from('categories')
      .select('id, name, color_hex')
      .eq('user_id', user.id);

    // Fetch event_categories
    const eventIds = (events || []).map(e => e.id);
    const { data: eventCategories } = await supabase
      .from('event_categories')
      .select('event_id, category_id')
      .in('event_id', eventIds.length > 0 ? eventIds : [0]);

    // Create lookup maps
    const categoryLookup = new Map<number, { name: string; color: string }>();
    (userCategories || []).forEach(c => {
      categoryLookup.set(c.id, { name: c.name, color: c.color_hex });
    });

    const eventCategoryMap = new Map<number, number>();
    (eventCategories || []).forEach(ec => {
      eventCategoryMap.set(ec.event_id, ec.category_id);
    });

    // Process data
    const categoryMap = new Map<string, { value: number; color: string }>();
    const appMap = new Map<string, number>();
    const timeSlotMap = new Map<string, Map<string, number>>();

    let totalSeconds = 0;
    let productiveSeconds = 0;
    let idleSeconds = 0;

    for (const event of events || []) {
      const duration = event.duration_seconds || 0;

      // Track idle time separately (for AWAY counter only)
      if (event.is_idle) {
        idleSeconds += duration;
        totalSeconds += duration;
        continue; // Skip idle events for all other metrics
      }

      // Only process non-idle events for categories, apps, charts
      const categoryId = eventCategoryMap.get(event.id);
      const category = categoryId ? categoryLookup.get(categoryId) : null;
      const categoryName = category?.name || 'Uncategorized';
      const categoryColor = category?.color || '#666666';

      totalSeconds += duration;

      // Aggregate by category
      const existing = categoryMap.get(categoryName) || { value: 0, color: categoryColor };
      categoryMap.set(categoryName, { value: existing.value + duration, color: categoryColor });

      // Aggregate by app
      const appName = event.app_name || 'Unknown';
      appMap.set(appName, (appMap.get(appName) || 0) + duration);

      // Aggregate for stacked bar chart (by time slot)
      const eventDate = new Date(event.timestamp);
      let timeSlotKey: string;

      if (dateRange === 'day') {
        // Group by hour for day view
        timeSlotKey = `${eventDate.getHours()}:00`;
      } else {
        // Group by day for week/month view
        timeSlotKey = eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      }

      if (!timeSlotMap.has(timeSlotKey)) {
        timeSlotMap.set(timeSlotKey, new Map());
      }
      const slotCategories = timeSlotMap.get(timeSlotKey)!;
      slotCategories.set(categoryName, (slotCategories.get(categoryName) || 0) + duration);

      // Check if productive
      const lowerName = categoryName.toLowerCase();
      if (lowerName.includes('deep work') || lowerName.includes('coding') || lowerName.includes('focused') || lowerName.includes('design') || lowerName.includes('strategy')) {
        productiveSeconds += duration;
      }
    }

    // Convert category map to sorted array
    const categoryArray: CategoryData[] = Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, value: data.value, color: data.color }))
      .sort((a, b) => b.value - a.value);

    // Convert app map to sorted array
    const appArray: AppData[] = Array.from(appMap.entries())
      .map(([name, duration]) => ({ name, duration }))
      .sort((a, b) => b.duration - a.duration);

    // Convert time slot map to stacked bar data
    const stackedData: StackedBarData[] = [];

    if (dateRange === 'day') {
      // For day view, fill in all hours from first to last
      const hours = Array.from(timeSlotMap.keys()).map(k => parseInt(k));
      if (hours.length > 0) {
        const minHour = Math.min(...hours);
        const maxHour = Math.max(...hours);

        for (let h = minHour; h <= maxHour; h++) {
          const slotKey = `${h}:00`;
          const slotData: StackedBarData = { name: slotKey };

          if (timeSlotMap.has(slotKey)) {
            const categories = timeSlotMap.get(slotKey)!;
            categories.forEach((duration, catName) => {
              slotData[catName] = duration;
            });
          }
          stackedData.push(slotData);
        }
      }
    } else {
      // For week/month view, sort by date
      const sortedSlots = Array.from(timeSlotMap.keys()).sort((a, b) => {
        return new Date(a).getTime() - new Date(b).getTime();
      });

      for (const slot of sortedSlots) {
        const slotData: StackedBarData = { name: slot };
        const categories = timeSlotMap.get(slot)!;
        categories.forEach((duration, catName) => {
          slotData[catName] = duration;
        });
        stackedData.push(slotData);
      }
    }

    // Get top 3 categories for summary card
    const topCategories = categoryArray.slice(0, 3).map(c => ({
      name: c.name,
      color: c.color,
      duration: c.value
    }));

    setCategoryData(categoryArray);
    setAppData(appArray);
    setStackedBarData(stackedData);
    setSummary({
      total: totalSeconds,
      productive: productiveSeconds,
      idle: idleSeconds,
      topCategories
    });
    setLoading(false);
  }

  useEffect(() => {
    fetchDashboardData();
  }, [user, dateRange, customStartDate, customEndDate]);

  function handleCustomDateChange(start: Date | null, end: Date | null) {
    setCustomStartDate(start);
    setCustomEndDate(end);
  }

  async function fetchCategoryDetail(categoryName: string, categoryColor: string) {
    if (!user) return;
    setLoadingCategory(true);

    const { start, end } = getDateRange(dateRange, customStartDate || undefined, customEndDate || undefined);

    // Fetch events for the selected date range with full details
    const { data: events } = await supabase
      .from('events')
      .select('id, timestamp, duration_seconds, app_name, window_title, url')
      .eq('user_id', user.id)
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString());

    // Fetch user's categories to get the category ID
    const { data: userCategories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', user.id);

    const targetCategory = (userCategories || []).find(c => c.name === categoryName);
    if (!targetCategory) {
      setLoadingCategory(false);
      return;
    }

    // Fetch event_categories
    const eventIds = (events || []).map(e => e.id);
    const { data: eventCategories } = await supabase
      .from('event_categories')
      .select('event_id, category_id')
      .in('event_id', eventIds.length > 0 ? eventIds : [0]);

    // Filter events that belong to this category
    const categoryEventIds = new Set(
      (eventCategories || [])
        .filter(ec => ec.category_id === targetCategory.id)
        .map(ec => ec.event_id)
    );

    const categoryEvents = (events || []).filter(e => categoryEventIds.has(e.id));

    // Group by app
    const appMap = new Map<string, { duration: number; events: { title: string; url: string; timestamp: string; duration: number }[] }>();

    for (const event of categoryEvents) {
      const appName = event.app_name || 'Unknown';
      const existing = appMap.get(appName) || { duration: 0, events: [] };
      existing.duration += event.duration_seconds || 0;
      existing.events.push({
        title: event.window_title || '',
        url: event.url || '',
        timestamp: event.timestamp,
        duration: event.duration_seconds || 0
      });
      appMap.set(appName, existing);
    }

    // Convert to array and sort by duration
    const apps = Array.from(appMap.entries())
      .map(([name, data]) => ({
        name,
        duration: data.duration,
        events: data.events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      }))
      .sort((a, b) => b.duration - a.duration);

    const totalDuration = apps.reduce((sum, app) => sum + app.duration, 0);

    setSelectedCategory({
      name: categoryName,
      color: categoryColor,
      totalDuration,
      apps
    });
    setLoadingCategory(false);
  }

  function handleCategoryClick(categoryName: string, categoryColor: string) {
    fetchCategoryDetail(categoryName, categoryColor);
  }

  // Get unique categories for stacked bar chart
  const uniqueCategories = categoryData.map(c => ({ name: c.name, color: c.color }));

  // Show category detail view if a category is selected
  if (selectedCategory) {
    return (
      <CategoryDetailView
        category={selectedCategory}
        onBack={() => setSelectedCategory(null)}
      />
    );
  }

  // Show loading state for category detail
  if (loadingCategory) {
    return (
      <div className="text-center text-muted py-8 text-sm">Loading category details...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-12">
          <h1 className="text-display text-2xl text-white">Dashboard</h1>
          <DateRangeSelector
            selected={dateRange}
            onChange={setDateRange}
            customStart={customStartDate}
            customEnd={customEndDate}
            onCustomChange={handleCustomDateChange}
          />
        </div>
        <motion.button
          onClick={fetchDashboardData}
          disabled={loading}
          className="p-2.5 text-muted hover:text-white disabled:opacity-50 transition-colors duration-150"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Refresh"
        >
          <RefreshCw size={16} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
        </motion.button>
      </div>

      {loading ? (
        <div className="text-center text-muted py-8 text-sm">Loading dashboard...</div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-4 gap-px bg-border">
            <MetricCard
              label="Total Time"
              value={formatDuration(summary.total)}
              subValue={dateRange === 'day' ? 'Tracked today' : dateRange === 'week' ? 'This week' : 'This month'}
              index={0}
            />
            <MetricCard
              label="Productive"
              value={formatDuration(summary.productive)}
              subValue={summary.total > 0 ? `${Math.round((summary.productive / summary.total) * 100)}% of total` : '—'}
              isAccent={true}
              index={1}
            />
            <MetricCard
              label="Away"
              value={formatDuration(summary.idle)}
              subValue={summary.total > 0 ? `${Math.round((summary.idle / summary.total) * 100)}% of total` : '—'}
              index={2}
            />
            <TopCategoriesCard categories={summary.topCategories} index={3} />
          </div>

          {/* Stacked Bar Timeline */}
          <StackedBarTimeline
            data={stackedBarData}
            categories={uniqueCategories}
            dateRange={dateRange}
          />

          {/* Bottom Section: Donut + Ranked Lists */}
          <div className="grid grid-cols-3 gap-4">
            <CategoryDonut data={categoryData} />
            <RankedList
              title="Top Categories"
              items={categoryData.map(c => ({ name: c.name, duration: c.value, color: c.color }))}
              type="categories"
              onItemClick={handleCategoryClick}
              delay={0.3}
            />
            <RankedList
              title="Top Apps"
              items={appData.map(a => ({ name: a.name, duration: a.duration }))}
              type="apps"
              delay={0.35}
            />
          </div>
        </>
      )}
    </div>
  );
}
