import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { supabase } from './db.js';

// Configuration
const CATEGORIZE_INTERVAL_MS = 60000;  // 1 minute
const SHORT_EVENT_THRESHOLD_SECONDS = 10;  // Events shorter than this go to Miscellaneous

// Load current user ID from file
function loadUserId() {
  const userFilePath = join(homedir(), '.kronos', 'user.json');
  try {
    if (existsSync(userFilePath)) {
      const data = JSON.parse(readFileSync(userFilePath, 'utf-8'));
      return data.userId;
    }
  } catch (error) {
    console.error('Error loading user file:', error.message);
  }
  return null;
}

// Auto-categorize idle events and short-duration events
async function categorizeAutomaticEvents() {
  const userId = loadUserId();
  if (!userId) {
    console.log(`[${new Date().toISOString()}] No user logged in, skipping categorization`);
    return;
  }

  console.log(`[${new Date().toISOString()}] Running auto-categorization for user: ${userId}`);

  try {
    // Get all categorized event IDs first (shared lookup)
    const { data: categorizedEvents } = await supabase
      .from('event_categories')
      .select('event_id');

    const categorizedIds = new Set((categorizedEvents || []).map(e => e.event_id));
    console.log(`[${new Date().toISOString()}] Found ${categorizedIds.size} already categorized events`);

    // --- 1. Categorize Short Events (<= 10s) as Miscellaneous ---
    const { data: miscCategory, error: miscError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', '%miscellaneous%')
      .single();

    console.log(`[${new Date().toISOString()}] Miscellaneous category lookup:`, miscCategory, miscError?.message);

    if (miscCategory?.id) {
      const { data: shortEvents, error: shortError } = await supabase
        .from('events')
        .select('id, duration_seconds')
        .eq('user_id', userId)
        .lte('duration_seconds', SHORT_EVENT_THRESHOLD_SECONDS)
        .eq('is_idle', false);

      console.log(`[${new Date().toISOString()}] Found ${shortEvents?.length || 0} short events (<=10s), error: ${shortError?.message}`);

      const uncategorizedShortEvents = (shortEvents || []).filter(e => !categorizedIds.has(e.id));
      console.log(`[${new Date().toISOString()}] ${uncategorizedShortEvents.length} of those are uncategorized`);

      if (uncategorizedShortEvents.length > 0) {
        console.log(`[${new Date().toISOString()}] Auto-categorizing ${uncategorizedShortEvents.length} short events as Miscellaneous...`);

        const miscCategoriesToInsert = uncategorizedShortEvents.map(event => ({
          event_id: event.id,
          category_id: miscCategory.id,
          is_manual: false
        }));

        const { error: miscInsertError } = await supabase
          .from('event_categories')
          .upsert(miscCategoriesToInsert, { onConflict: 'event_id' });

        if (miscInsertError) {
          console.error('Error inserting miscellaneous categories:', miscInsertError.message);
        } else {
          uncategorizedShortEvents.forEach(e => categorizedIds.add(e.id));
          console.log(`[${new Date().toISOString()}] Successfully categorized ${uncategorizedShortEvents.length} short events as Miscellaneous`);
        }
      }
    } else {
      console.log(`[${new Date().toISOString()}] No Miscellaneous category found for user - please create one`);
    }

  } catch (error) {
    console.error('Error in auto-categorization:', error.message);
  }
}

function shutdown() {
  console.log('\nShutting down categorizer...');
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Main
async function main() {
  console.log('Initializing categorizer (idle + short events)...');
  console.log('Press Ctrl+C to stop.\n');

  // Run immediately
  await categorizeAutomaticEvents();

  // Then run every minute
  setInterval(categorizeAutomaticEvents, CATEGORIZE_INTERVAL_MS);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
