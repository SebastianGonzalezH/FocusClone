import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface TimelineData {
  hour: number;
  category: string;
  color: string;
}

interface Summary {
  total: number;
  productive: number;
  meetings: number;
  other: number;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function Timeline({ data }: { data: TimelineData[] }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="bg-card rounded-lg p-4 border border-border">
      <h2 className="text-lg font-semibold mb-4">Today's Timeline</h2>
      <div className="flex gap-1">
        {hours.map((hour) => {
          const activity = data.find((d) => d.hour === hour);
          return (
            <div
              key={hour}
              className="flex-1 h-8 rounded"
              style={{
                backgroundColor: activity?.color || '#1e293b',
              }}
              title={activity ? `${hour}:00 - ${activity.category}` : `${hour}:00 - No activity`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-muted">
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>12am</span>
      </div>
    </div>
  );
}

function CategoryDonut({ data }: { data: CategoryData[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return (
      <div className="bg-card rounded-lg p-4 border border-border">
        <h2 className="text-lg font-semibold mb-4">Category Distribution</h2>
        <div className="flex items-center justify-center h-48 text-muted">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 border border-border">
      <h2 className="text-lg font-semibold mb-4">Category Distribution</h2>
      <div className="flex items-center gap-8">
        <div className="w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => formatDuration(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-2">
          {data.map((category) => (
            <div key={category.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-sm">{category.name}</span>
              <span className="text-sm text-muted ml-auto">
                {Math.round((category.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, productive: 0, meetings: 0, other: 0 });
  const [loading, setLoading] = useState(true);

  async function fetchDashboardData() {
    setLoading(true);

    // Get today's date range in UTC
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)).toISOString();
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59)).toISOString();

    // Fetch today's events with categories
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        id,
        timestamp,
        duration_seconds,
        event_categories (
          category_id,
          categories (
            name,
            color_hex
          )
        )
      `)
      .gte('timestamp', startOfDay)
      .lte('timestamp', endOfDay);

    if (error) {
      console.error('Error fetching dashboard data:', error.message);
      setLoading(false);
      return;
    }

    // Process events for category aggregation
    const categoryMap = new Map<string, { value: number; color: string }>();
    const hourMap = new Map<number, { category: string; color: string; duration: number }>();

    let totalSeconds = 0;
    let productiveSeconds = 0;
    let meetingSeconds = 0;
    let otherSeconds = 0;

    for (const event of events || []) {
      const eventCategory = (event as any).event_categories?.[0];
      const category = eventCategory?.categories;
      const categoryName = category?.name || 'Uncategorized';
      const categoryColor = category?.color_hex || '#71717a';
      const duration = event.duration_seconds || 0;

      totalSeconds += duration;

      // Aggregate by category
      const existing = categoryMap.get(categoryName) || { value: 0, color: categoryColor };
      categoryMap.set(categoryName, { value: existing.value + duration, color: categoryColor });

      // Categorize for summary
      if (categoryName === 'Coding' || categoryName === 'Communication') {
        productiveSeconds += duration;
      } else if (categoryName === 'Meeting') {
        meetingSeconds += duration;
      } else {
        otherSeconds += duration;
      }

      // Aggregate by hour for timeline
      const hour = new Date(event.timestamp).getHours();
      const existingHour = hourMap.get(hour);
      if (!existingHour || duration > existingHour.duration) {
        hourMap.set(hour, { category: categoryName, color: categoryColor, duration });
      }
    }

    // Convert maps to arrays
    const categoryArray: CategoryData[] = Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, value: data.value, color: data.color }))
      .sort((a, b) => b.value - a.value);

    const timelineArray: TimelineData[] = Array.from(hourMap.entries())
      .map(([hour, data]) => ({ hour, category: data.category, color: data.color }));

    setCategoryData(categoryArray);
    setTimelineData(timelineArray);
    setSummary({
      total: totalSeconds,
      productive: productiveSeconds,
      meetings: meetingSeconds,
      other: otherSeconds
    });
    setLoading(false);
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="p-2 rounded hover:bg-border disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="text-center text-muted py-8">Loading dashboard...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Timeline data={timelineData} />
            <CategoryDonut data={categoryData} />
          </div>

          <div className="bg-card rounded-lg p-4 border border-border">
            <h2 className="text-lg font-semibold mb-4">Today's Summary</h2>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-muted text-sm">Total Time</p>
                <p className="text-2xl font-semibold">{formatDuration(summary.total)}</p>
              </div>
              <div>
                <p className="text-muted text-sm">Productive</p>
                <p className="text-2xl font-semibold text-green-500">{formatDuration(summary.productive)}</p>
              </div>
              <div>
                <p className="text-muted text-sm">Meetings</p>
                <p className="text-2xl font-semibold text-purple-500">{formatDuration(summary.meetings)}</p>
              </div>
              <div>
                <p className="text-muted text-sm">Other</p>
                <p className="text-2xl font-semibold text-orange-500">{formatDuration(summary.other)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
