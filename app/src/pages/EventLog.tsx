import { useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, RefreshCw, Play, Pause } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Event {
  id: number;
  timestamp: string;
  app_name: string;
  window_title: string;
  duration_seconds: number;
  category_name: string;
  category_color: string;
  category_id: number | null;
}

interface Category {
  id: number;
  name: string;
  color_hex: string;
}

const columnHelper = createColumnHelper<Event>();

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EventLog() {
  const [data, setData] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoUpdate, setAutoUpdate] = useState(false);

  async function fetchCategories() {
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name, color_hex');
    setCategories(cats || []);
  }

  async function fetchEvents(showLoading = true) {
    if (showLoading) setLoading(true);

    // Fetch events (simple query first)
    const { data: events, error } = await supabase
      .from('events')
      .select('id, timestamp, app_name, window_title, duration_seconds')
      .order('timestamp', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error fetching events:', error.message);
      setLoading(false);
      return;
    }

    // Transform events
    const transformedEvents: Event[] = (events || []).map((event: any) => ({
      id: event.id,
      timestamp: event.timestamp,
      app_name: event.app_name,
      window_title: event.window_title || '',
      duration_seconds: event.duration_seconds,
      category_id: null,
      category_name: 'Uncategorized',
      category_color: '#71717a',
    }));

    setData(transformedEvents);
    setLoading(false);
  }

  async function updateCategory(eventId: number, categoryId: number) {
    const { error } = await supabase
      .from('event_categories')
      .upsert({
        event_id: eventId,
        category_id: categoryId,
        is_manual: true
      }, { onConflict: 'event_id' });

    if (error) {
      console.error('Error updating category:', error.message);
      return;
    }

    // Update local state
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      setData(prev =>
        prev.map(item =>
          item.id === eventId
            ? { ...item, category_id: categoryId, category_name: category.name, category_color: category.color_hex }
            : item
        )
      );
    }
  }

  // Initial fetch on mount
  useEffect(() => {
    fetchCategories();
    fetchEvents();
  }, []);

  // Handle auto-update polling
  useEffect(() => {
    if (autoUpdate) {
      const interval = setInterval(() => {
        fetchEvents(false); // Don't show loading spinner on auto-updates
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [autoUpdate]);

  const columns = [
    columnHelper.accessor('timestamp', {
      header: 'Time',
      cell: (info) => (
        <span className="text-muted">{formatTime(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('app_name', {
      header: 'Application',
      cell: (info) => (
        <span className="font-medium">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('window_title', {
      header: 'Window Title',
      cell: (info) => (
        <span className="text-sm truncate max-w-xs block">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('duration_seconds', {
      header: 'Duration',
      cell: (info) => formatDuration(info.getValue()),
    }),
    columnHelper.accessor('category_name', {
      header: 'Category',
      cell: (info) => {
        const row = info.row.original;
        return (
          <select
            value={row.category_id || ''}
            onChange={(e) => {
              const categoryId = parseInt(e.target.value);
              if (categoryId) {
                updateCategory(row.id, categoryId);
              }
            }}
            className="bg-card border border-border rounded px-2 py-1 text-sm"
            style={{ color: row.category_color }}
          >
            <option value="" style={{ color: '#71717a' }}>Uncategorized</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id} style={{ color: cat.color_hex }}>
                {cat.name}
              </option>
            ))}
          </select>
        );
      },
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Event Log</h1>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setAutoUpdate(!autoUpdate)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm ${
              autoUpdate
                ? 'bg-green-600 text-white'
                : 'bg-card border border-border hover:bg-border'
            }`}
            title={autoUpdate ? 'Stop auto-update' : 'Start auto-update'}
          >
            {autoUpdate ? <Pause size={14} /> : <Play size={14} />}
            {autoUpdate ? 'Live' : 'Auto'}
          </button>
          <button
            onClick={() => fetchEvents(true)}
            disabled={loading}
            className="p-2 rounded hover:bg-border disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <input
            type="text"
            placeholder="Search events..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="bg-card border border-border rounded-lg px-4 py-2 text-sm w-64"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted">Loading events...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-muted">No events found. Start the tracker daemon to begin collecting data.</div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-border/50">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="text-left px-4 py-3 text-sm font-medium text-muted"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t border-border hover:bg-border/30">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-sm text-muted">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="p-2 rounded hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="p-2 rounded hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
