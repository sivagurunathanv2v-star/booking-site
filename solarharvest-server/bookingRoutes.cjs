const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { run, get, all, initSolarHarvestDb, DEFAULT_TIME_WINDOWS } = require('./bookingDb.cjs');
const pool = require('../db-adapter.cjs');

const SESSION_SECRET =
  process.env.SOLARHARVEST_SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MAIN_ADMIN_EMAIL = 'arunsekar.v2v@gmail.com';

const hashPassword = (password) =>
  new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });

const verifyPasswordHash = (password, storedHash) =>
  new Promise((resolve, reject) => {
    const [salt, keyHex] = String(storedHash || '').split(':');
    if (!salt || !keyHex) return resolve(false);
    const keyBuf = Buffer.from(keyHex, 'hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      if (keyBuf.length !== derivedKey.length) return resolve(false);
      resolve(crypto.timingSafeEqual(keyBuf, derivedKey));
    });
  });

const timingSafeCompareString = (a, b) => {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const issueAdminToken = () => {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'SOLARHARVEST_ADMIN',
      exp: Date.now() + SESSION_TTL_MS,
      jti: crypto.randomBytes(8).toString('hex'),
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
};

const verifyAdminToken = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  if (!timingSafeCompareString(sig, expectedSig)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return parsed && parsed.role === 'SOLARHARVEST_ADMIN' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
};

const requireSolarHarvestAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }
  const token = authHeader.slice(7).trim();
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
  return next();
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone) => /^[+\d\s()-]{7,20}$/.test(phone);
const isValidIsoDate = (dateStr) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
const isValidTime = (timeStr) => /^\d{2}:\d{2}$/.test(timeStr);

const formatTime12h = (hhmm) => {
  const [hRaw, mRaw] = hhmm.split(':');
  const h = parseInt(hRaw, 10);
  const m = String(mRaw || '00').padStart(2, '0');
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${m} ${suffix}`;
};

const generateReferenceCode = () => {
  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SH-${year}-${suffix}`;
};

const getEnvAdminUsername = () => MAIN_ADMIN_EMAIL;
const getEnvAdminPasscode = () => process.env.SOLARHARVEST_ADMIN_PASSWORD || '';

let adminCredentialsReady;
const ensureAdminCredentials = () => {
  if (!adminCredentialsReady) {
    adminCredentialsReady = (async () => {
      const envPassword = getEnvAdminPasscode();
      if (!envPassword) return;

      const existing = await get(
        `SELECT credential_source FROM solarharvest_admin WHERE id = 1`
      );
      if (existing?.credential_source === 'changed') return;

      const passwordHash = await hashPassword(envPassword);
      await run(
        `INSERT INTO solarharvest_admin (id, username, password_hash, credential_source)
         VALUES (1, ?, ?, 'env')
         ON CONFLICT(id) DO UPDATE SET username = ?, password_hash = ?, credential_source = 'env'`,
        [MAIN_ADMIN_EMAIL, passwordHash, MAIN_ADMIN_EMAIL, passwordHash]
      );
    })().catch((err) => {
      adminCredentialsReady = null;
      throw err;
    });
  }
  return adminCredentialsReady;
};

const isValidMainAdminPassword = async (password, adminRow) => {
  if (adminRow?.credential_source === 'changed') {
    return verifyPasswordHash(password, adminRow.password_hash);
  }
  const envPassword = getEnvAdminPasscode();
  return Boolean(envPassword) && timingSafeCompareString(password, envPassword);
};

const setMainAdminPassword = async (password) => {
  await initSolarHarvestDb();
  await ensureAdminCredentials();

  const solarHarvestHash = await hashPassword(password);
  const adminUserHash = await bcrypt.hash(password, 12);
  await run(
    `INSERT INTO solarharvest_admin (id, username, password_hash, credential_source)
     VALUES (1, ?, ?, 'changed')
     ON CONFLICT(id) DO UPDATE SET username = ?, password_hash = ?, credential_source = 'changed'`,
    [MAIN_ADMIN_EMAIL, solarHarvestHash, MAIN_ADMIN_EMAIL, solarHarvestHash]
  );
  await pool.query(
    `INSERT INTO admin_users (email, password, name, image, role, can_manage_blogs, can_manage_experiments)
     VALUES ($1, $2, 'Arun Sekar', '/team/arun.jpg', 'MAIN_ADMIN', TRUE, TRUE)
     ON CONFLICT (email) DO UPDATE SET password = $2, role = 'MAIN_ADMIN',
       can_manage_blogs = TRUE, can_manage_experiments = TRUE`,
    [MAIN_ADMIN_EMAIL, adminUserHash]
  );
};

const TIER_FEE_MAP = {
  'Field Consultation Slot': 1500,
  '1 Acre Guava Field': 1500,
  '3 Acre Guava Field': 1500,
  'Custom Guava / Orchard Acreage': 1500,
  'Energy Saving Trust M&E Briefing': 1500,
};

const generatePaymentReceiptId = () => {
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `PAY-SH-${suffix}`;
};

const registerSolarHarvestRoutes = (app) => {
  const router = express.Router();

  // Ensure DB is ready before handling requests
  router.use(async (_req, res, next) => {
    try {
      await initSolarHarvestDb();
      await ensureAdminCredentials();
      next();
    } catch (err) {
      console.error('SolarHarvest DB init error:', err);
      res.status(500).json({ error: 'Booking database unavailable.' });
    }
  });

  // Restrict CORS on authenticated admin routes to same-origin (override app-level wildcard)
  router.use('/admin', (req, res, next) => {
    const origin = req.headers.origin;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    if (origin && host) {
      try {
        const parsedOrigin = new URL(origin);
        if (parsedOrigin.host === host) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Vary', 'Origin');
        } else {
          res.removeHeader('Access-Control-Allow-Origin');
        }
      } catch {
        res.removeHeader('Access-Control-Allow-Origin');
      }
    } else {
      res.removeHeader('Access-Control-Allow-Origin');
    }
    next();
  });

  // ==================== UNIQUE CLIENT USERS (GMAIL LOGIN SAVE) ====================
  router.post('/client/login', async (req, res) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
      const avatar = typeof req.body?.avatar === 'string' ? req.body.avatar.trim() : '';

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: 'Valid email address is required.' });
      }

      await run(
        `INSERT INTO client_users (email, name, phone, avatar, last_login_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(email) DO UPDATE SET
           name = COALESCE(NULLIF(excluded.name, ''), client_users.name),
           phone = COALESCE(NULLIF(excluded.phone, ''), client_users.phone),
           avatar = COALESCE(NULLIF(excluded.avatar, ''), client_users.avatar),
           last_login_at = CURRENT_TIMESTAMP`,
        [email, name || email.split('@')[0], phone, avatar]
      );

      const clientUser = await get(`SELECT * FROM client_users WHERE email = ?`, [email]);
      res.json({ message: 'Client logged in and saved successfully.', data: clientUser });
    } catch (err) {
      console.error('Error in client login:', err);
      res.status(500).json({ error: 'Failed to save client user login.' });
    }
  });

  router.get('/client/profile', async (req, res) => {
    try {
      const email = typeof req.query?.email === 'string' ? req.query.email.trim().toLowerCase() : '';
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: 'Valid email address is required.' });
      }
      const clientUser = await get(`SELECT * FROM client_users WHERE email = ?`, [email]);
      res.json({ data: clientUser || null });
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve client profile.' });
    }
  });

  // ==================== GOOGLE OAUTH CONFIG & TOKEN VERIFICATION ====================
  router.get('/auth-config', (_req, res) => {
    const googleClientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
    res.json({ data: { googleClientId } });
  });

  router.post('/google-auth', async (req, res) => {
    try {
      const credential = typeof req.body?.credential === 'string' ? req.body.credential.trim() : '';
      if (!credential) {
        return res.status(400).json({ error: 'Google credential token is required.' });
      }

      const verifyRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );
      if (!verifyRes.ok) {
        return res.status(401).json({ error: 'Invalid or expired Google sign-in token.' });
      }

      const tokenInfo = await verifyRes.json();
      const configuredClientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
      if (configuredClientId && tokenInfo.aud !== configuredClientId) {
        return res.status(401).json({ error: 'Google token audience mismatch.' });
      }

      const email = normalizeEmail(tokenInfo.email);
      const name = (tokenInfo.name || email.split('@')[0] || 'Google User').trim();
      const avatar = (tokenInfo.picture || '').trim();

      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: 'Google account did not return a valid email.' });
      }

      await run(
        `INSERT INTO client_users (email, name, phone, avatar, last_login_at)
         VALUES (?, ?, '', ?, CURRENT_TIMESTAMP)
         ON CONFLICT(email) DO UPDATE SET
           name = excluded.name,
           avatar = CASE WHEN excluded.avatar != '' THEN excluded.avatar ELSE client_users.avatar END,
           last_login_at = CURRENT_TIMESTAMP`,
        [email, name, avatar]
      );

      const savedUser = await get(`SELECT * FROM client_users WHERE email = ?`, [email]);
      res.json({
        message: 'Google Sign-In verified.',
        data: {
          email: savedUser?.email || email,
          name: savedUser?.name || name,
          phone: savedUser?.phone || '',
          avatar: savedUser?.avatar || avatar,
        },
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to verify Google sign-in.' });
    }
  });

  // ==================== PUBLIC SETTINGS (WEBSITE LOGO) ====================
  router.get('/settings', async (_req, res) => {
    try {
      const logoRow = await get(`SELECT value FROM site_settings WHERE key = 'logo_url'`);
      res.json({
        data: {
          logoUrl: logoRow ? logoRow.value : '',
        },
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load site settings.' });
    }
  });

  // ==================== PUBLIC CLIENT SLOTS & BOOKINGS ====================
  router.get('/slots', async (req, res) => {
    try {
      const dateFilter = typeof req.query.date === 'string' ? req.query.date.trim() : '';
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      let rows;
      if (dateFilter && isValidIsoDate(dateFilter)) {
        rows = await all(
          `SELECT id, slot_date, start_time, end_time, time_label, slot_type, status
           FROM booking_slots
           WHERE slot_date = ?
           ORDER BY slot_date ASC, start_time ASC`,
          [dateFilter]
        );
      } else {
        rows = await all(
          `SELECT id, slot_date, start_time, end_time, time_label, slot_type, status
           FROM booking_slots
           WHERE slot_date >= ?
           ORDER BY slot_date ASC, start_time ASC`,
          [todayStr]
        );
      }
      res.json({ data: rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load available slots.' });
    }
  });

  // Client Step 1: Request a slot timing (awaits Admin approval before payment)
  router.post('/bookings', async (req, res) => {
    try {
      const slotId = Number(req.body?.slotId);
      const clientName = typeof req.body?.clientName === 'string' ? req.body.clientName.trim() : '';
      const clientEmail = typeof req.body?.clientEmail === 'string' ? req.body.clientEmail.trim().toLowerCase() : '';
      const clientPhone = typeof req.body?.clientPhone === 'string' ? req.body.clientPhone.trim() : '';
      const acreageTier = typeof req.body?.acreageTier === 'string' ? req.body.acreageTier.trim() : '1 Acre Guava Field';
      const farmLocation = typeof req.body?.farmLocation === 'string' ? req.body.farmLocation.trim().slice(0, 200) : '';
      const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 600) : '';

      if (!Number.isInteger(slotId) || slotId <= 0) {
        return res.status(400).json({ error: 'Please select a valid time slot.' });
      }
      if (clientName.length < 2 || clientName.length > 120) {
        return res.status(400).json({ error: 'Please enter your full name (2–120 characters).' });
      }
      if (!isValidEmail(clientEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      if (!isValidPhone(clientPhone)) {
        return res.status(400).json({ error: 'Please enter a valid phone number.' });
      }

      const safeTier = Object.prototype.hasOwnProperty.call(TIER_FEE_MAP, acreageTier)
        ? acreageTier
        : '1 Acre Guava Field';
      const bookingFee = TIER_FEE_MAP[safeTier];

      // Atomically hold the slot while awaiting admin timing approval
      const claim = await run(
        `UPDATE booking_slots SET status = 'booked' WHERE id = ? AND status = 'open'`,
        [slotId]
      );

      if (claim.changes !== 1) {
        return res.status(409).json({
          error: 'This slot is no longer available. Please choose another open time slot.',
        });
      }

      const referenceCode = generateReferenceCode();
      try {
        const inserted = await run(
          `INSERT INTO bookings (
             reference_code, slot_id, client_name, client_email, client_phone,
             acreage_tier, farm_location, notes, status, booking_fee, payment_status
           )
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?, 'awaiting_approval')`,
          [referenceCode, slotId, clientName, clientEmail, clientPhone, safeTier, farmLocation, notes, bookingFee]
        );

        const slotRow = await get(
          `SELECT id, slot_date, time_label, slot_type FROM booking_slots WHERE id = ?`,
          [slotId]
        );

        return res.status(201).json({
          message: 'Slot request submitted. Waiting for admin timing approval.',
          data: {
            id: inserted.lastID,
            referenceCode,
            status: 'pending_approval',
            paymentStatus: 'awaiting_approval',
            bookingFee,
            slotDate: slotRow?.slot_date || '',
            timeLabel: slotRow?.time_label || '',
            slotType: slotRow?.slot_type || '',
            clientName,
            clientEmail,
            acreageTier: safeTier,
          },
        });
      } catch (insertErr) {
        await run(`UPDATE booking_slots SET status = 'open' WHERE id = ?`, [slotId]).catch(() => {});
        throw insertErr;
      }
    } catch (err) {
      console.error('Error creating SolarHarvest booking:', err);
      res.status(500).json({ error: 'Unable to submit slot request right now. Please try again.' });
    }
  });

  // Lookup booking by reference + email (prevents enumeration)
  router.get('/bookings/lookup', async (req, res) => {
    try {
      const reference = typeof req.query.reference === 'string' ? req.query.reference.trim().toUpperCase() : '';
      const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';

      if (!reference || !isValidEmail(email)) {
        return res.status(400).json({ error: 'Both booking reference and matching email are required.' });
      }

      const row = await get(
        `SELECT b.id, b.reference_code, b.client_name, b.client_email, b.client_phone,
                b.acreage_tier, b.farm_location, b.notes, b.status,
                b.booking_fee, b.payment_status, b.payment_method, b.payment_reference,
                b.paid_at, b.admin_note, b.approved_at, b.payment_verified,
                b.meeting_link, b.joining_details, b.meeting_sent_at, b.created_at,
                s.slot_date, s.time_label, s.slot_type
         FROM bookings b
         INNER JOIN booking_slots s ON s.id = b.slot_id
         WHERE UPPER(b.reference_code) = ? AND LOWER(b.client_email) = ?`,
        [reference, email]
      );

      if (!row) {
        return res.status(404).json({ error: 'No booking found for that reference and email.' });
      }

      res.json({ data: row });
    } catch (err) {
      res.status(500).json({ error: 'Failed to look up booking.' });
    }
  });

  // Get all bookings for a signed-in user by email
  router.get('/user/bookings', async (req, res) => {
    try {
      const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: 'Valid user email is required.' });
      }

      const rows = await all(
        `SELECT b.id, b.reference_code, b.client_name, b.client_email, b.client_phone,
                b.acreage_tier, b.farm_location, b.notes, b.status,
                b.booking_fee, b.payment_status, b.payment_method, b.payment_reference,
                b.paid_at, b.admin_note, b.approved_at, b.payment_verified,
                b.meeting_link, b.joining_details, b.meeting_sent_at, b.created_at,
                s.slot_date, s.time_label, s.slot_type
         FROM bookings b
         INNER JOIN booking_slots s ON s.id = b.slot_id
         WHERE LOWER(b.client_email) = ?
         ORDER BY b.id DESC`,
        [email]
      );

      res.json({ data: rows });
    } catch (err) {
      console.error('Error fetching user bookings:', err);
      res.status(500).json({ error: 'Failed to fetch user bookings.' });
    }
  });

  // Client Step 3: Complete payment AFTER Admin has approved the slot timing
  router.post('/bookings/pay', async (req, res) => {
    try {
      const reference = typeof req.body?.referenceCode === 'string' ? req.body.referenceCode.trim().toUpperCase() : '';
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const paymentMethod = typeof req.body?.paymentMethod === 'string' ? req.body.paymentMethod.trim() : '';
      const payerDetail = typeof req.body?.payerDetail === 'string' ? req.body.payerDetail.trim().slice(0, 80) : '';

      if (!reference || !isValidEmail(email)) {
        return res.status(400).json({ error: 'Booking reference and matching email are required.' });
      }

      const allowedMethods = ['UPI', 'Card', 'Net Banking'];
      if (!allowedMethods.includes(paymentMethod)) {
        return res.status(400).json({ error: 'Please select a valid payment method (UPI, Card, or Net Banking).' });
      }

      if (payerDetail.length < 3) {
        return res.status(400).json({
          error:
            paymentMethod === 'UPI'
              ? 'Please enter your UPI ID or transaction reference.'
              : paymentMethod === 'Card'
              ? 'Please enter the cardholder name for confirmation.'
              : 'Please enter your bank name or transfer reference.',
        });
      }

      const booking = await get(
        `SELECT b.*, s.slot_date, s.time_label, s.slot_type
         FROM bookings b
         INNER JOIN booking_slots s ON s.id = b.slot_id
         WHERE UPPER(b.reference_code) = ? AND LOWER(b.client_email) = ?`,
        [reference, email]
      );

      if (!booking) {
        return res.status(404).json({ error: 'No booking found for that reference and email.' });
      }

      if (booking.status === 'confirmed' && booking.payment_status === 'paid') {
        return res.status(409).json({ error: 'This booking has already been paid and confirmed.' });
      }

      if (booking.status !== 'approved_awaiting_payment') {
        return res.status(400).json({
          error:
            booking.status === 'pending_approval'
              ? 'Admin has not approved this slot timing yet. Payment unlocks once the admin approves.'
              : 'This booking is not eligible for payment.',
        });
      }

      const paymentRef = `${generatePaymentReceiptId()} (${payerDetail})`;
      const updateResult = await run(
        `UPDATE bookings
         SET status = 'confirmed',
             payment_status = 'paid',
             payment_method = ?,
             payment_reference = ?,
             paid_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND status = 'approved_awaiting_payment'`,
        [paymentMethod, paymentRef, booking.id]
      );

      if (updateResult.changes !== 1) {
        return res.status(409).json({ error: 'Payment could not be finalized. Please refresh your booking status.' });
      }

      const updated = await get(
        `SELECT b.id, b.reference_code, b.client_name, b.client_email, b.client_phone,
                b.acreage_tier, b.farm_location, b.notes, b.status,
                b.booking_fee, b.payment_status, b.payment_method, b.payment_reference,
                b.paid_at, b.admin_note, b.approved_at, b.payment_verified,
                b.meeting_link, b.joining_details, b.meeting_sent_at, b.created_at,
                s.slot_date, s.time_label, s.slot_type
         FROM bookings b
         INNER JOIN booking_slots s ON s.id = b.slot_id
         WHERE b.id = ?`,
        [booking.id]
      );

      res.json({
        message: 'Payment completed and slot officially booked.',
        data: updated,
      });
    } catch (err) {
      console.error('Error processing SolarHarvest payment:', err);
      res.status(500).json({ error: 'Failed to process payment. Please try again.' });
    }
  });

  // ==================== ADMIN AUTH ====================
  router.get('/admin/status', async (_req, res) => {
    try {
      const adminRow = await get(
        `SELECT credential_source FROM solarharvest_admin WHERE id = 1`
      );
      const source = adminRow?.credential_source === 'changed'
        ? 'changed'
        : getEnvAdminPasscode()
        ? 'env'
        : 'unconfigured';
      return res.json({ data: { configured: source !== 'unconfigured', source } });
    } catch (err) {
      res.status(500).json({ error: 'Failed to check admin configuration.' });
    }
  });

  router.post('/admin/claim', async (req, res) => {
    return res.status(403).json({
      error: 'Admin access can only be configured by the server administrator.',
    });
  });

  router.post('/admin/login', async (req, res) => {
    try {
      const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      if (!username || !password) {
        return res.status(400).json({ error: 'Admin email and password are required.' });
      }

      if (username.toLowerCase() !== getEnvAdminUsername()) {
        return res.status(401).json({ error: 'Invalid admin email or password.' });
      }

      const adminRow = await get(
        `SELECT password_hash, credential_source FROM solarharvest_admin WHERE id = 1`
      );
      if (!adminRow || !(await isValidMainAdminPassword(password, adminRow))) {
        return res.status(401).json({ error: 'Invalid admin email or password.' });
      }

      const token = issueAdminToken();
      res.json({ message: 'Authenticated.', data: { token } });
    } catch (err) {
      res.status(500).json({ error: 'Authentication failed.' });
    }
  });

  router.post('/admin/change-password', async (req, res) => {
    try {
      const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
      const currentPassword =
        typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
      const newPassword =
        typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

      if (username.toLowerCase() !== MAIN_ADMIN_EMAIL || !currentPassword) {
        return res.status(401).json({ error: 'Invalid admin email or current password.' });
      }
      if (newPassword.length < 12 || newPassword.length > 128) {
        return res.status(400).json({ error: 'New password must be between 12 and 128 characters.' });
      }

      const adminRow = await get(
        `SELECT password_hash, credential_source FROM solarharvest_admin WHERE id = 1`
      );
      if (!(await isValidMainAdminPassword(currentPassword, adminRow))) {
        return res.status(401).json({ error: 'Invalid admin email or current password.' });
      }

      await setMainAdminPassword(newPassword);
      res.json({ message: 'Admin password updated successfully.' });
    } catch (err) {
      console.error('Failed to change SolarHarvest admin password:', err);
      res.status(500).json({ error: 'Failed to update admin password.' });
    }
  });

  // ==================== PROTECTED ADMIN ROUTES ====================
  router.get('/admin/slots', requireSolarHarvestAdmin, async (_req, res) => {
    try {
      const rows = await all(
        `SELECT s.id, s.slot_date, s.start_time, s.end_time, s.time_label, s.slot_type, s.status,
                b.id AS booking_id, b.reference_code, b.client_name, b.client_email, b.status AS booking_status
         FROM booking_slots s
         LEFT JOIN bookings b ON b.slot_id = s.id AND b.status NOT IN ('cancelled', 'rejected')
         ORDER BY s.slot_date ASC, s.start_time ASC`
      );
      res.json({ data: rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load slots.' });
    }
  });

  router.post('/admin/slots', requireSolarHarvestAdmin, async (req, res) => {
    try {
      const slotDate = typeof req.body?.slotDate === 'string' ? req.body.slotDate.trim() : '';
      const slotType =
        typeof req.body?.slotType === 'string' && req.body.slotType.trim()
          ? req.body.slotType.trim().slice(0, 120)
          : 'SolarHarvest Site & Tech Briefing';
      const bulkDefault = Boolean(req.body?.bulkDefault);

      if (!isValidIsoDate(slotDate)) {
        return res.status(400).json({ error: 'Valid date (YYYY-MM-DD) is required.' });
      }

      if (bulkDefault) {
        let added = 0;
        for (const win of DEFAULT_TIME_WINDOWS) {
          const result = await run(
            `INSERT OR IGNORE INTO booking_slots (slot_date, start_time, end_time, time_label, slot_type, status)
             VALUES (?, ?, ?, ?, ?, 'open')`,
            [slotDate, win.start, win.end, win.label, slotType]
          );
          added += result.changes;
        }
        return res.status(201).json({ message: `Added ${added} default slots for ${slotDate}.`, data: { added } });
      }

      const startTime = typeof req.body?.startTime === 'string' ? req.body.startTime.trim() : '';
      const endTime = typeof req.body?.endTime === 'string' ? req.body.endTime.trim() : '';

      if (!isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime) {
        return res.status(400).json({ error: 'Valid start and end times (HH:MM) are required, with end time after start time.' });
      }

      const timeLabel = `${formatTime12h(startTime)} – ${formatTime12h(endTime)}`;
      const inserted = await run(
        `INSERT INTO booking_slots (slot_date, start_time, end_time, time_label, slot_type, status)
         VALUES (?, ?, ?, ?, ?, 'open')`,
        [slotDate, startTime, endTime, timeLabel, slotType]
      );

      res.status(201).json({
        message: 'Slot created.',
        data: { id: inserted.lastID, slot_date: slotDate, start_time: startTime, end_time: endTime, time_label: timeLabel, slot_type: slotType, status: 'open' },
      });
    } catch (err) {
      if (String(err.message || '').includes('UNIQUE')) {
        return res.status(409).json({ error: 'A slot already exists for that date and start time.' });
      }
      res.status(500).json({ error: 'Failed to create slot.' });
    }
  });

  router.patch('/admin/slots/:id', requireSolarHarvestAdmin, async (req, res) => {
    try {
      const slotId = Number(req.params.id);
      const nextStatus = typeof req.body?.status === 'string' ? req.body.status.trim() : '';
      if (!Number.isInteger(slotId) || slotId <= 0) {
        return res.status(400).json({ error: 'Invalid slot ID.' });
      }
      if (!['open', 'blocked'].includes(nextStatus)) {
        return res.status(400).json({ error: 'Slot status can only be toggled between open and blocked.' });
      }
      const existing = await get(`SELECT status FROM booking_slots WHERE id = ?`, [slotId]);
      if (!existing) {
        return res.status(404).json({ error: 'Slot not found.' });
      }
      if (existing.status === 'booked') {
        return res.status(409).json({ error: 'Reject or cancel the active booking on this slot before changing its availability.' });
      }
      await run(`UPDATE booking_slots SET status = ? WHERE id = ?`, [nextStatus, slotId]);
      res.json({ message: 'Slot updated.', data: { id: slotId, status: nextStatus } });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update slot.' });
    }
  });

  router.delete('/admin/slots/:id', requireSolarHarvestAdmin, async (req, res) => {
    try {
      const slotId = Number(req.params.id);
      if (!Number.isInteger(slotId) || slotId <= 0) {
        return res.status(400).json({ error: 'Invalid slot ID.' });
      }
      const existing = await get(`SELECT status FROM booking_slots WHERE id = ?`, [slotId]);
      if (!existing) {
        return res.status(404).json({ error: 'Slot not found.' });
      }
      const activeBooking = await get(
        `SELECT id FROM bookings WHERE slot_id = ? AND status NOT IN ('cancelled', 'rejected')`,
        [slotId]
      );
      if (activeBooking) {
        return res.status(409).json({ error: 'Cannot delete a slot with an active booking. Reject or cancel the booking first.' });
      }
      await run(`DELETE FROM bookings WHERE slot_id = ? AND status IN ('cancelled', 'rejected')`, [slotId]);
      await run(`DELETE FROM booking_slots WHERE id = ?`, [slotId]);
      res.json({ message: 'Slot deleted.' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete slot.' });
    }
  });

  router.get('/admin/bookings', requireSolarHarvestAdmin, async (_req, res) => {
    try {
      const rows = await all(
        `SELECT b.id, b.reference_code, b.slot_id, b.client_name, b.client_email, b.client_phone,
                b.acreage_tier, b.farm_location, b.notes, b.status,
                b.booking_fee, b.payment_status, b.payment_method, b.payment_reference,
                b.paid_at, b.admin_note, b.approved_at, b.payment_verified,
                b.meeting_link, b.joining_details, b.meeting_sent_at, b.created_at, b.updated_at,
                s.slot_date, s.start_time, s.end_time, s.time_label, s.slot_type
         FROM bookings b
         INNER JOIN booking_slots s ON s.id = b.slot_id
         ORDER BY
           CASE b.status
             WHEN 'pending_approval' THEN 1
             WHEN 'approved_awaiting_payment' THEN 2
             WHEN 'confirmed' THEN 3
             WHEN 'completed' THEN 4
             ELSE 5
           END,
           s.slot_date ASC, s.start_time ASC`
      );
      res.json({ data: rows });
    } catch (err) {
      res.status(500).json({ error: 'Failed to load bookings.' });
    }
  });

  // Admin Step 2: Approve slot timing (unlocks user payment) or Reject timing (frees slot)
  router.patch('/admin/bookings/:id/review', requireSolarHarvestAdmin, async (req, res) => {
    try {
      const bookingId = Number(req.params.id);
      const decision = typeof req.body?.decision === 'string' ? req.body.decision.trim() : '';
      const adminNote = typeof req.body?.adminNote === 'string' ? req.body.adminNote.trim().slice(0, 400) : '';
      const customFeeRaw = req.body?.bookingFee;

      if (!Number.isInteger(bookingId) || bookingId <= 0) {
        return res.status(400).json({ error: 'Invalid booking ID.' });
      }
      if (!['approve', 'reject'].includes(decision)) {
        return res.status(400).json({ error: 'Decision must be either approve or reject.' });
      }

      const booking = await get(`SELECT id, slot_id, status, booking_fee FROM bookings WHERE id = ?`, [bookingId]);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found.' });
      }

      if (decision === 'approve') {
        let safeFee = booking.booking_fee || 1500;
        if (customFeeRaw !== undefined && customFeeRaw !== null && customFeeRaw !== '') {
          const parsedFee = Number(customFeeRaw);
          if (!Number.isFinite(parsedFee) || parsedFee < 0 || parsedFee > 500000) {
            return res.status(400).json({ error: 'Booking fee must be a valid amount between 0 and 500,000.' });
          }
          safeFee = Math.round(parsedFee);
        }

        await run(
          `UPDATE bookings
           SET status = 'approved_awaiting_payment',
               payment_status = 'unpaid',
               booking_fee = ?,
               admin_note = ?,
               approved_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [safeFee, adminNote || 'Slot timing approved. Please complete payment to confirm your booking.', bookingId]
        );

        return res.json({
          message: 'Slot timing approved. Client can now pay to confirm their slot.',
          data: { id: bookingId, status: 'approved_awaiting_payment', booking_fee: safeFee },
        });
      }

      // Reject timing -> free up slot automatically
      await run(
        `UPDATE bookings
         SET status = 'rejected',
             payment_status = 'cancelled',
             admin_note = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [adminNote || 'Requested timing is unavailable. Please select another open slot.', bookingId]
      );
      await run(`UPDATE booking_slots SET status = 'open' WHERE id = ?`, [booking.slot_id]);

      res.json({
        message: 'Slot timing declined and the time slot has been re-opened.',
        data: { id: bookingId, status: 'rejected' },
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to review booking timing.' });
    }
  });

  router.patch('/admin/bookings/:id/status', requireSolarHarvestAdmin, async (req, res) => {
    try {
      const bookingId = Number(req.params.id);
      const nextStatus = typeof req.body?.status === 'string' ? req.body.status.trim() : '';
      if (!Number.isInteger(bookingId) || bookingId <= 0) {
        return res.status(400).json({ error: 'Invalid booking ID.' });
      }
      if (!['pending_approval', 'approved_awaiting_payment', 'confirmed', 'completed', 'cancelled', 'rejected'].includes(nextStatus)) {
        return res.status(400).json({ error: 'Invalid booking status.' });
      }

      const booking = await get(`SELECT id, slot_id, status FROM bookings WHERE id = ?`, [bookingId]);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found.' });
      }

      await run(
        `UPDATE bookings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [nextStatus, bookingId]
      );

      if (nextStatus === 'cancelled' || nextStatus === 'rejected') {
        await run(`UPDATE booking_slots SET status = 'open' WHERE id = ?`, [booking.slot_id]);
      } else if (booking.status === 'cancelled' || booking.status === 'rejected') {
        await run(`UPDATE booking_slots SET status = 'booked' WHERE id = ? AND status = 'open'`, [booking.slot_id]);
      }

      res.json({ message: 'Booking status updated.', data: { id: bookingId, status: nextStatus } });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update booking status.' });
    }
  });

  // Admin Step 4: Verify payment & send meeting link + joining details to client
  router.patch('/admin/bookings/:id/meeting', requireSolarHarvestAdmin, async (req, res) => {
    try {
      const bookingId = Number(req.params.id);
      const meetingLink = typeof req.body?.meetingLink === 'string' ? req.body.meetingLink.trim().slice(0, 500) : '';
      const joiningDetails = typeof req.body?.joiningDetails === 'string' ? req.body.joiningDetails.trim().slice(0, 1000) : '';

      if (!Number.isInteger(bookingId) || bookingId <= 0) {
        return res.status(400).json({ error: 'Invalid booking ID.' });
      }
      if (!meetingLink) {
        return res.status(400).json({ error: 'Please enter a valid meeting link (e.g. Google Meet or Zoom URL).' });
      }

      const booking = await get(`SELECT id, status, payment_status FROM bookings WHERE id = ?`, [bookingId]);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found.' });
      }
      if (booking.status !== 'confirmed' && booking.status !== 'completed') {
        return res.status(400).json({ error: 'Meeting details can only be sent after client payment is completed.' });
      }

      await run(
        `UPDATE bookings
         SET payment_verified = 1,
             meeting_link = ?,
             joining_details = ?,
             meeting_sent_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [meetingLink, joiningDetails, bookingId]
      );

      res.json({
        message: 'Payment verified and meeting link & joining details sent to the client.',
        data: {
          id: bookingId,
          payment_verified: 1,
          meeting_link: meetingLink,
          joining_details: joiningDetails,
        },
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to send meeting details.' });
    }
  });

  // Update website logo (allows uploaded raster data URL or safe relative path)
  router.put('/admin/logo', requireSolarHarvestAdmin, async (req, res) => {
    try {
      const logoUrl = typeof req.body?.logoUrl === 'string' ? req.body.logoUrl.trim() : '';

      if (logoUrl === '') {
        await run(`DELETE FROM site_settings WHERE key = 'logo_url'`);
        return res.json({ message: 'Logo reset to default.', data: { logoUrl: '' } });
      }

      const isSafeDataImage = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(logoUrl);
      const isSafeLocalPath = /^\/[A-Za-z0-9._/-]+\.(png|jpg|jpeg|webp)$/i.test(logoUrl) && !logoUrl.includes('..');

      if (!isSafeDataImage && !isSafeLocalPath) {
        return res.status(400).json({
          error: 'Logo must be a PNG, JPG, or WebP image file (max 2MB).',
        });
      }

      if (logoUrl.length > 2_800_000) {
        return res.status(413).json({ error: 'Logo image is too large. Please keep it under 2MB.' });
      }

      await run(
        `INSERT INTO site_settings (key, value, updated_at)
         VALUES ('logo_url', ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        [logoUrl]
      );

      res.json({ message: 'Website logo updated.', data: { logoUrl } });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update website logo.' });
    }
  });

  app.use('/api/solarharvest', router);
};

module.exports = { registerSolarHarvestRoutes, setMainAdminPassword };
