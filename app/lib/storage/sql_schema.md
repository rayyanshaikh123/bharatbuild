-- SQLite schema for labour app

CREATE TABLE assigned_site (
  id TEXT PRIMARY KEY,
  site_name TEXT NOT NULL,
  polygon TEXT NOT NULL -- JSON encoded array of [lat,lng]
);

CREATE TABLE attendance_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  checkin_at TEXT,
  checkout_at TEXT,
  checkin_payload TEXT,
  checkout_payload TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE offline_attendance_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  accuracy REAL,
  device_id TEXT,
  payload TEXT,
  synced INTEGER DEFAULT 0
);

CREATE TABLE gps_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  accuracy REAL
);
