const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'solarharvest_bookings.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SolarHarvest bookings database:', err.message);
    return;
  }
  console.log('Connected to SolarHarvest separate SQLite database.');
});

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });

const DEFAULT_TIME_WINDOWS = [
  { start: '09:30', end: '10:30', label: '09:30 AM – 10:30 AM' },
  { start: '11:00', end: '12:00', label: '11:00 AM – 12:00 PM' },
  { start: '14:30', end: '15:30', label: '02:30 PM – 03:30 PM' },
  { start: '16:00', end: '17:00', label: '04:00 PM – 05:00 PM' },
];

const formatIsoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

let initPromise = null;

const initSolarHarvestDb = () => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await run(`PRAGMA foreign_keys = ON`);

    await run(`
      CREATE TABLE IF NOT EXISTS booking_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slot_date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        time_label TEXT NOT NULL,
        slot_type TEXT NOT NULL DEFAULT 'Field Consultation & Demo',
        status TEXT NOT NULL DEFAULT 'open',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(slot_date, start_time)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_code TEXT NOT NULL UNIQUE,
        slot_id INTEGER NOT NULL,
        client_name TEXT NOT NULL,
        client_email TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        acreage_tier TEXT NOT NULL DEFAULT '1 Acre Guava Field',
        farm_location TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending_approval',
        booking_fee INTEGER NOT NULL DEFAULT 1500,
        payment_status TEXT NOT NULL DEFAULT 'awaiting_approval',
        payment_method TEXT DEFAULT '',
        payment_reference TEXT DEFAULT '',
        paid_at DATETIME,
        admin_note TEXT DEFAULT '',
        approved_at DATETIME,
        payment_verified INTEGER NOT NULL DEFAULT 0,
        meeting_link TEXT DEFAULT '',
        joining_details TEXT DEFAULT '',
        meeting_sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (slot_id) REFERENCES booking_slots(id)
      )
    `);

    // Safe additive migrations for existing solarharvest_bookings.db files
    const existingCols = await all(`PRAGMA table_info(bookings)`);
    const colNames = new Set(existingCols.map((c) => c.name));
    const migrations = [
      ['booking_fee', 'INTEGER NOT NULL DEFAULT 1500'],
      ['payment_status', "TEXT NOT NULL DEFAULT 'awaiting_approval'"],
      ['payment_method', "TEXT DEFAULT ''"],
      ['payment_reference', "TEXT DEFAULT ''"],
      ['paid_at', 'DATETIME'],
      ['admin_note', "TEXT DEFAULT ''"],
      ['approved_at', 'DATETIME'],
      ['payment_verified', 'INTEGER NOT NULL DEFAULT 0'],
      ['meeting_link', "TEXT DEFAULT ''"],
      ['joining_details', "TEXT DEFAULT ''"],
      ['meeting_sent_at', 'DATETIME'],
    ];
    for (const [col, def] of migrations) {
      if (!colNames.has(col)) {
        await run(`ALTER TABLE bookings ADD COLUMN ${col} ${def}`);
      }
    }
    // Normalize any legacy 'pending' bookings into 'pending_approval'
    await run(`UPDATE bookings SET status = 'pending_approval' WHERE status = 'pending'`);

    await run(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS solarharvest_admin (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        username TEXT NOT NULL DEFAULT 'admin',
        password_hash TEXT NOT NULL,
        credential_source TEXT NOT NULL DEFAULT 'claimed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS client_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        phone TEXT DEFAULT '',
        avatar TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const adminCols = await all(`PRAGMA table_info(solarharvest_admin)`);
    const adminColNames = new Set(adminCols.map((c) => c.name));
    if (!adminColNames.has('username')) {
      await run(`ALTER TABLE solarharvest_admin ADD COLUMN username TEXT NOT NULL DEFAULT 'admin'`);
    }
    if (!adminColNames.has('credential_source')) {
      await run(`ALTER TABLE solarharvest_admin ADD COLUMN credential_source TEXT NOT NULL DEFAULT 'claimed'`);
    }

    // Seed upcoming 10 business days of booking slots if none exist for upcoming dates
    const today = new Date();
    const todayStr = formatIsoDate(today);
    const existingUpcoming = await get(
      `SELECT COUNT(*) AS count FROM booking_slots WHERE slot_date >= ?`,
      [todayStr]
    );

    if (!existingUpcoming || existingUpcoming.count === 0) {
      let seededDays = 0;
      let offset = 1;
      while (seededDays < 8 && offset <= 16) {
        const candidate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
        offset += 1;
        // Skip Sunday (0)
        if (candidate.getDay() === 0) continue;
        const isoDate = formatIsoDate(candidate);
        for (const win of DEFAULT_TIME_WINDOWS) {
          await run(
            `INSERT OR IGNORE INTO booking_slots (slot_date, start_time, end_time, time_label, slot_type, status)
             VALUES (?, ?, ?, ?, ?, 'open')`,
            [isoDate, win.start, win.end, win.label, 'SolarHarvest Site & Tech Briefing']
          );
        }
        seededDays += 1;
      }
      console.log('Seeded initial SolarHarvest booking slots.');
    }
  })().catch((err) => {
    console.error('SolarHarvest DB initialization failed:', err);
    initPromise = null;
    throw err;
  });

  return initPromise;
};

module.exports = {
  db,
  run,
  get,
  all,
  initSolarHarvestDb,
  DEFAULT_TIME_WINDOWS,
};
