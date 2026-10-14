-- D1 table behind functions/api/event.js. Apply once:
--   npx wrangler d1 execute anvol-site-events --remote --file=scripts/events-schema.sql
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  event TEXT NOT NULL,
  path TEXT, sid TEXT, landing_page TEXT, referrer TEXT,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
  first_source TEXT, device TEXT, detail TEXT, country TEXT
);
CREATE INDEX IF NOT EXISTS events_ts ON events (ts);
CREATE INDEX IF NOT EXISTS events_event ON events (event);
