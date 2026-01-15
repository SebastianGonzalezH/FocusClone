import { supabase } from './db.js';

// Configuration
const CATEGORIZE_INTERVAL_MS = 60000;  // 1 minute

async function categorize() {
  try {
    const startTime = Date.now();

    // Get all rules
    const { data: rules, error: rulesError } = await supabase
      .from('rules')
      .select('id, match_string, match_type, category_id');

    if (rulesError) {
      console.error('Error fetching rules:', rulesError.message);
      return;
    }

    // Get Idle category id
    const { data: idleCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'Idle')
      .single();

    const idleCategoryId = idleCategory?.id;

    // Find uncategorized events (events not in event_categories)
    const { data: allEvents, error: eventsError } = await supabase
      .from('events')
      .select('id, app_name, window_title, url, is_idle');

    if (eventsError) {
      console.error('Error fetching events:', eventsError.message);
      return;
    }

    // Get already categorized event IDs
    const { data: categorizedEvents } = await supabase
      .from('event_categories')
      .select('event_id');

    const categorizedIds = new Set((categorizedEvents || []).map(e => e.event_id));

    // Filter to uncategorized events
    const uncategorizedEvents = (allEvents || []).filter(e => !categorizedIds.has(e.id));

    if (uncategorizedEvents.length === 0) {
      console.log(`[${new Date().toISOString()}] No uncategorized events found.`);
      return;
    }

    console.log(`[${new Date().toISOString()}] Processing ${uncategorizedEvents.length} uncategorized events...`);

    let categorizedCount = 0;
    const categoriesToInsert = [];

    for (const event of uncategorizedEvents) {
      let matchedCategoryId = null;

      // Check if it's an idle event
      if (event.is_idle && idleCategoryId) {
        matchedCategoryId = idleCategoryId;
      } else {
        // Try to match against rules
        for (const rule of rules || []) {
          const matchString = rule.match_string.toLowerCase();
          let fieldValue = '';

          switch (rule.match_type) {
            case 'app':
              fieldValue = (event.app_name || '').toLowerCase();
              break;
            case 'title':
              fieldValue = (event.window_title || '').toLowerCase();
              break;
            case 'url':
              fieldValue = (event.url || '').toLowerCase();
              break;
          }

          if (fieldValue.includes(matchString)) {
            matchedCategoryId = rule.category_id;
            break;  // Use first matching rule
          }
        }
      }

      // If a category was matched, add to batch
      if (matchedCategoryId !== null) {
        categoriesToInsert.push({
          event_id: event.id,
          category_id: matchedCategoryId,
          is_manual: false
        });
        categorizedCount++;
      }
    }

    // Batch insert categorizations
    if (categoriesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('event_categories')
        .upsert(categoriesToInsert, { onConflict: 'event_id' });

      if (insertError) {
        console.error('Error inserting categories:', insertError.message);
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Categorized ${categorizedCount}/${uncategorizedEvents.length} events in ${elapsed}ms`);

  } catch (error) {
    console.error('Error categorizing:', error.message);
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
  console.log('Initializing categorizer with Supabase...');
  console.log('Categorizer started. Running every 1 minute...');
  console.log('Press Ctrl+C to stop.\n');

  // Run immediately
  await categorize();

  // Then run every minute
  setInterval(categorize, CATEGORIZE_INTERVAL_MS);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
