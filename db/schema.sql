-- FocusClone Database Schema

-- Events table: stores raw window tracking data
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,  -- ISO8601 format
    app_name TEXT NOT NULL,
    window_title TEXT,
    url TEXT,
    duration_seconds INTEGER DEFAULT 0,
    is_idle INTEGER DEFAULT 0  -- boolean: 0 = false, 1 = true
);

-- Categories table: defines activity categories
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color_hex TEXT NOT NULL
);

-- Rules table: defines matching rules for auto-categorization
CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_string TEXT NOT NULL,
    match_type TEXT NOT NULL CHECK(match_type IN ('title', 'app', 'url')),
    category_id INTEGER NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Manual overrides table: stores user category overrides for specific events
CREATE TABLE IF NOT EXISTS event_categories (
    event_id INTEGER PRIMARY KEY,
    category_id INTEGER NOT NULL,
    is_manual INTEGER DEFAULT 0,  -- 1 if user manually set this
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Enriched logs view: joins events with categories based on rules or manual overrides
CREATE VIEW IF NOT EXISTS enriched_logs AS
SELECT
    e.id,
    e.timestamp,
    e.app_name,
    e.window_title,
    e.url,
    e.duration_seconds,
    e.is_idle,
    COALESCE(ec.category_id, matched.category_id) AS category_id,
    COALESCE(c.name, 'Uncategorized') AS category_name,
    COALESCE(c.color_hex, '#71717a') AS category_color
FROM events e
LEFT JOIN event_categories ec ON e.id = ec.event_id
LEFT JOIN (
    SELECT DISTINCT e2.id AS event_id, r.category_id
    FROM events e2
    JOIN rules r ON
        (r.match_type = 'app' AND e2.app_name LIKE '%' || r.match_string || '%')
        OR (r.match_type = 'title' AND e2.window_title LIKE '%' || r.match_string || '%')
        OR (r.match_type = 'url' AND e2.url LIKE '%' || r.match_string || '%')
) matched ON e.id = matched.event_id AND ec.category_id IS NULL
LEFT JOIN categories c ON c.id = COALESCE(ec.category_id, matched.category_id);

-- Seed default categories
INSERT OR IGNORE INTO categories (name, color_hex) VALUES
    ('Coding', '#22c55e'),        -- green
    ('Communication', '#3b82f6'), -- blue
    ('Meeting', '#a855f7'),       -- purple
    ('Browsing', '#f97316');      -- orange

-- Seed some default rules
INSERT OR IGNORE INTO rules (match_string, match_type, category_id) VALUES
    ('Visual Studio Code', 'app', 1),
    ('Code', 'app', 1),
    ('Terminal', 'app', 1),
    ('iTerm', 'app', 1),
    ('Slack', 'app', 2),
    ('Discord', 'app', 2),
    ('Messages', 'app', 2),
    ('Mail', 'app', 2),
    ('Zoom', 'app', 3),
    ('Google Meet', 'title', 3),
    ('Microsoft Teams', 'app', 3),
    ('Safari', 'app', 4),
    ('Chrome', 'app', 4),
    ('Firefox', 'app', 4);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_app_name ON events(app_name);
CREATE INDEX IF NOT EXISTS idx_rules_match_type ON rules(match_type);
