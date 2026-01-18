import { useState, useEffect, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, RefreshCw, Play, Pause, Globe, ExternalLink, Copy, Check, Search, Sparkles, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Event {
  id: number;
  timestamp: string;
  app_name: string;
  window_title: string;
  url: string | null;
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

function formatDateTime(timestamp: string): { date: string; time: string; isToday: boolean } {
  const d = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = d.toDateString() === now.toDateString();
  const isYesterday = d.toDateString() === yesterday.toDateString();

  let date: string;
  if (isToday) {
    date = 'Today';
  } else if (isYesterday) {
    date = 'Yesterday';
  } else {
    date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return { date, time, isToday };
}

export default function EventLog() {
  const { user } = useAuth();
  const [data, setData] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [copiedEventId, setCopiedEventId] = useState<number | null>(null);
  const [categorizing, setCategorizing] = useState(false);
  const [categorizeMessage, setCategorizeMessage] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<number | 'all' | 'uncategorized'>('all');

  const copyToClipboard = async (eventId: number, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedEventId(eventId);
    setTimeout(() => setCopiedEventId(null), 2000);
  };

  async function fetchEvents(isManualRefresh = false, categoriesList?: Category[]) {
    if (!user) return;
    if (isManualRefresh) setRefreshing(true);

    // Use passed categories or current state
    const cats = categoriesList || categories;

    const { data: events, error } = await supabase
      .from('events')
      .select('id, timestamp, app_name, window_title, url, duration_seconds')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error fetching events:', error.message);
      setInitialLoading(false);
      setRefreshing(false);
      return;
    }

    const eventIds = (events || []).map(e => e.id);
    const { data: eventCategories } = await supabase
      .from('event_categories')
      .select('event_id, category_id')
      .in('event_id', eventIds);

    const categoryMap = new Map<number, number>();
    (eventCategories || []).forEach(ec => {
      categoryMap.set(ec.event_id, ec.category_id);
    });

    const transformedEvents: Event[] = (events || []).map((event: any) => {
      const categoryId = categoryMap.get(event.id);
      const category = categoryId ? cats.find(c => c.id === categoryId) : null;

      return {
        id: event.id,
        timestamp: event.timestamp,
        app_name: event.app_name,
        window_title: event.window_title || '',
        url: event.url || null,
        duration_seconds: event.duration_seconds,
        category_id: category?.id || null,
        category_name: category?.name || 'Uncategorized',
        category_color: category?.color_hex || '#666666',
      };
    });

    setData(transformedEvents);
    setInitialLoading(false);
    setRefreshing(false);
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

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      // Fetch categories first
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, color_hex')
        .eq('user_id', user.id);
      const categoriesList = cats || [];
      setCategories(categoriesList);
      // Then fetch events with those categories
      await fetchEvents(false, categoriesList);
    }
    loadData();
  }, [user]);

  useEffect(() => {
    if (autoUpdate) {
      const interval = setInterval(() => {
        fetchEvents(false);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [autoUpdate, categories]);

  async function categorizeEvents() {
    if (!user) return;
    setCategorizing(true);
    setCategorizeMessage('Finding uncategorized events...');

    const SHORT_EVENT_THRESHOLD_SECONDS = 10;

    try {
      const miscCategory = categories.find(c => c.name.toLowerCase().includes('miscellaneous'));

      const { data: allEvents } = await supabase
        .from('events')
        .select('id, app_name, window_title, url, duration_seconds')
        .eq('user_id', user.id);

      if (!allEvents || allEvents.length === 0) {
        setCategorizeMessage('No events found');
        setTimeout(() => setCategorizeMessage(null), 3000);
        setCategorizing(false);
        return;
      }

      const eventIds = allEvents.map(e => e.id);
      const { data: categorizedEvents } = await supabase
        .from('event_categories')
        .select('event_id')
        .in('event_id', eventIds);

      const categorizedIds = new Set((categorizedEvents || []).map(e => e.event_id));
      const uncategorizedAll = allEvents.filter(e => !categorizedIds.has(e.id));

      if (uncategorizedAll.length === 0) {
        setCategorizeMessage('All events are already categorized!');
        setTimeout(() => setCategorizeMessage(null), 3000);
        setCategorizing(false);
        return;
      }

      const uncategorizedShort = uncategorizedAll.filter(e => (e.duration_seconds || 0) <= SHORT_EVENT_THRESHOLD_SECONDS);
      const uncategorizedLong = uncategorizedAll.filter(e => (e.duration_seconds || 0) > SHORT_EVENT_THRESHOLD_SECONDS);

      let totalCategorized = 0;

      if (uncategorizedShort.length > 0 && miscCategory) {
        setCategorizeMessage(`Categorizing ${uncategorizedShort.length} short events as Miscellaneous...`);

        const shortCategories = uncategorizedShort.map(e => ({
          event_id: e.id,
          category_id: miscCategory.id,
          is_manual: false
        }));

        const { error: shortInsertError } = await supabase
          .from('event_categories')
          .upsert(shortCategories, { onConflict: 'event_id' });

        if (!shortInsertError) {
          totalCategorized += uncategorizedShort.length;
        }
      }

      // Process ALL uncategorized events (no limit)
      const uncategorizedEvents = uncategorizedLong;

      if (uncategorizedEvents.length === 0) {
        setCategorizeMessage(`Done! Categorized ${totalCategorized} short events as Miscellaneous`);
        setTimeout(() => setCategorizeMessage(null), 3000);
        await fetchEvents(false);
        setCategorizing(false);
        return;
      }

      setCategorizeMessage(`Categorizing ${uncategorizedEvents.length} events with AI...`);

      const batchSize = 50;
      let errorCount = 0;

      for (let i = 0; i < uncategorizedEvents.length; i += batchSize) {
        const batch = uncategorizedEvents.slice(i, i + batchSize);
        const progress = Math.min(i + batchSize, uncategorizedEvents.length);
        setCategorizeMessage(`Categorizing ${progress}/${uncategorizedEvents.length} events...`);

        try {
          const { data, error } = await supabase.functions.invoke('categorize', {
            body: {
              events: batch,
              categories: categories,
              user_id: user.id
            }
          });

          if (error || data?.error) {
            console.error('Categorize error:', error?.message || data?.error);
            errorCount++;
            continue; // Continue with next batch instead of stopping
          }

          if (data?.categorized && data.categorized.length > 0) {
            const toInsert = data.categorized.map((c: { event_id: number; category_id: number }) => ({
              event_id: c.event_id,
              category_id: c.category_id,
              is_manual: false
            }));

            const { error: insertError } = await supabase
              .from('event_categories')
              .upsert(toInsert, { onConflict: 'event_id' });

            if (insertError) {
              console.error('Insert error:', insertError.message);
              errorCount++;
              continue;
            }

            totalCategorized += data.categorized.length;
          }
        } catch (err) {
          console.error('Batch error:', err);
          errorCount++;
          continue;
        }
      }

      const shortLabel = uncategorizedShort.length > 0 ? ` (${uncategorizedShort.length} short → Misc)` : '';
      const errorLabel = errorCount > 0 ? ` (${errorCount} errors)` : '';
      setCategorizeMessage(`Done! Categorized ${totalCategorized} events${shortLabel}${errorLabel}`);
      setTimeout(() => setCategorizeMessage(null), 5000);

      await fetchEvents(false);

    } catch (error: any) {
      setCategorizeMessage(`Error: ${error.message}`);
    }

    setCategorizing(false);
  }

  // Memoize columns to prevent infinite re-renders
  const columns = useMemo(() => [
    columnHelper.accessor('timestamp', {
      header: 'Time',
      cell: (info) => {
        const { date, time, isToday } = formatDateTime(info.getValue());
        return (
          <div className="flex flex-col">
            <span className="text-muted text-xs">{time}</span>
            {!isToday && <span className="text-muted/60 text-[10px]">{date}</span>}
          </div>
        );
      },
    }),
    columnHelper.accessor('app_name', {
      header: 'Application',
      cell: (info) => (
        <span className="font-medium text-sm">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('window_title', {
      header: 'Window Title',
      cell: () => null, // Rendered separately to avoid re-render issues with copy state
    }),
    columnHelper.accessor('duration_seconds', {
      header: 'Duration',
      cell: (info) => (
        <span className="text-sm font-medium">{formatDuration(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('category_name', {
      header: 'Category',
      cell: () => null, // Placeholder - rendered separately
    }),
  ], []);

  // Memoize filtered data to prevent unnecessary recalculations
  const filteredData = useMemo(() => {
    return data.filter(event => {
      if (categoryFilter === 'all') return true;
      if (categoryFilter === 'uncategorized') return event.category_id === null;
      return event.category_id === categoryFilter;
    });
  }, [data, categoryFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-display text-2xl text-white">Activity Log</h1>
        <div className="flex gap-3 items-center">
          {/* Category filter */}
          <div className="relative flex items-center gap-2">
            <Filter size={14} className="text-muted" />
            <select
              value={categoryFilter}
              onChange={(e) => {
                const val = e.target.value;
                setCategoryFilter(val === 'all' ? 'all' : val === 'uncategorized' ? 'uncategorized' : parseInt(val));
              }}
              className="bg-card border border-border px-3 py-2 text-xs cursor-pointer hover:border-muted transition-colors focus:outline-none focus:border-accent"
            >
              <option value="all">All Categories</option>
              <option value="uncategorized">Uncategorized</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Categorize message */}
          {categorizeMessage && (
            <span className="text-xs text-muted">{categorizeMessage}</span>
          )}

          {/* Categorize button */}
          <motion.button
            onClick={categorizeEvents}
            disabled={categorizing || initialLoading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Sparkles size={14} className={categorizing ? 'animate-pulse' : ''} />
            {categorizing ? 'Categorizing...' : 'Categorize'}
          </motion.button>

          {/* Auto-update toggle */}
          <motion.button
            onClick={() => setAutoUpdate(!autoUpdate)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-all duration-150 ${
              autoUpdate
                ? 'bg-accent-dim text-accent border border-accent/30'
                : 'bg-card border border-border text-muted hover:text-white hover:border-muted'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title={autoUpdate ? 'Stop auto-update' : 'Start auto-update'}
          >
            {autoUpdate ? <Pause size={12} strokeWidth={1.5} /> : <Play size={12} strokeWidth={1.5} />}
            {autoUpdate ? 'Live' : 'Auto'}
          </motion.button>

          {/* Refresh button */}
          <motion.button
            onClick={() => fetchEvents(true)}
            disabled={refreshing}
            className="p-2.5 text-muted hover:text-white disabled:opacity-50 transition-colors duration-150"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Refresh"
          >
            <RefreshCw size={16} strokeWidth={1.5} className={refreshing ? 'animate-spin' : ''} />
          </motion.button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search activity..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="input-premium pl-9 w-56 text-xs py-2.5"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-card overflow-hidden"
      >
        {initialLoading ? (
          <div className="p-8 text-center text-muted text-sm">Loading events...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">No events found. Start the tracker daemon to begin collecting data.</div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-border">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="text-left px-4 py-3 text-[10px] font-medium text-muted uppercase tracking-wider bg-card"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-border-subtle hover:bg-card-hover transition-colors">
                    {row.getVisibleCells().map((cell) => {
                      const event = row.original;

                      // Render window_title column with copy functionality
                      if (cell.column.id === 'window_title') {
                        const isBrowser = event.app_name === 'Google Chrome' || event.app_name === 'Safari';
                        const url = event.url;

                        if (isBrowser && url) {
                          let domain = '';
                          let favicon = '';
                          try {
                            const urlObj = new URL(url);
                            domain = urlObj.hostname.replace('www.', '');
                            favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                          } catch {
                            domain = url;
                          }
                          const isCopied = copiedEventId === event.id;

                          return (
                            <td key={cell.id} className="px-4 py-3">
                              <div className="flex items-center gap-2.5 max-w-xs group/row">
                                <img
                                  src={favicon}
                                  alt=""
                                  className="w-4 h-4 flex-shrink-0"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-sm truncate">{event.window_title}</span>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] truncate flex items-center gap-1 text-accent hover:text-accent-hover transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Globe size={9} className="flex-shrink-0 opacity-60" />
                                    <span className="truncate">{domain}</span>
                                    <ExternalLink size={9} className="flex-shrink-0 opacity-0 group-hover/row:opacity-60 transition-opacity" />
                                  </a>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(event.id, url); }}
                                  className={`p-1.5 transition-all flex-shrink-0 ${isCopied ? 'text-accent' : 'text-muted opacity-0 group-hover/row:opacity-100 hover:text-white'}`}
                                  title={isCopied ? 'Copied!' : 'Copy URL'}
                                >
                                  {isCopied ? <Check size={12} /> : <Copy size={12} />}
                                </button>
                              </div>
                            </td>
                          );
                        }
                        return (
                          <td key={cell.id} className="px-4 py-3">
                            <span className="text-sm truncate max-w-xs block">{event.window_title}</span>
                          </td>
                        );
                      }

                      // Render category column
                      if (cell.column.id === 'category_name') {
                        return (
                          <td key={cell.id} className="px-4 py-3">
                            <select
                              value={event.category_id || ''}
                              onChange={(e) => {
                                const categoryId = parseInt(e.target.value);
                                if (categoryId) {
                                  updateCategory(event.id, categoryId);
                                }
                              }}
                              className="bg-card border border-border px-3 py-1.5 text-xs cursor-pointer hover:border-muted transition-colors focus:outline-none focus:border-accent"
                              style={{ color: event.category_color }}
                            >
                              <option value="" style={{ color: '#666666' }}>Uncategorized</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id} style={{ color: cat.color_hex }}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        );
                      }

                      // Default render
                      return (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card">
              <span className="text-[10px] text-muted uppercase tracking-wider">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
              </span>
              <div className="flex gap-1">
                <motion.button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="p-2 text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronLeft size={16} strokeWidth={1.5} />
                </motion.button>
                <motion.button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="p-2 text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronRight size={16} strokeWidth={1.5} />
                </motion.button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
