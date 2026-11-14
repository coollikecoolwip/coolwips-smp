import { createServer } from 'node:http';
import { createHash, randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const HOST = process.env.BACKEND_HOST || '127.0.0.1';
const PORT = Number(process.env.BACKEND_PORT || 48787);
const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'admin@coolwip.xyz').trim().toLowerCase();
const DB_FILE = resolve(process.env.BACKEND_DB || './data/coolwips.sqlite');
const MAX_BODY = 16 * 1024;
const SESSION_SECONDS = 12 * 60 * 60;
const ALLOWED_ORIGINS = new Set(['https://coolwip.xyz', 'https://www.coolwip.xyz']);

mkdirSync(dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec(`
  PRAGMA journal_mode=WAL;
  PRAGMA foreign_keys=ON;
  PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS staff_members (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    role TEXT NOT NULL CHECK (role IN ('moderator','admin','owner')),
    password_salt BLOB NOT NULL,
    password_hash BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL CHECK (category IN ('player','appeal','claim','waypoint','other')),
    username TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','closed')),
    staff_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS reports_created_idx ON reports(created_at DESC);
  CREATE INDEX IF NOT EXISTS reports_username_created_idx ON reports(lower(username),created_at DESC);
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES staff_members(user_id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS staff_email_send_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES staff_members(user_id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS email_send_user_created_idx ON staff_email_send_log(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS email_send_created_idx ON staff_email_send_log(created_at DESC);
`);

const statements = {
  ownerCount: db.prepare('SELECT count(*) AS n FROM staff_members'),
  staffByEmail: db.prepare('SELECT user_id,email,role,password_salt,password_hash FROM staff_members WHERE email=?'),
  staffById: db.prepare('SELECT user_id,email,role FROM staff_members WHERE user_id=?'),
  saveStaff: db.prepare('INSERT INTO staff_members(user_id,email,role,password_salt,password_hash) VALUES(?,?,?,?,?)'),
  saveSession: db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)'),
  sessionUser: db.prepare('SELECT s.user_id FROM sessions s JOIN staff_members u ON u.user_id=s.user_id WHERE s.token_hash=? AND s.expires_at>?'),
  deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash=?'),
  recentUsername: db.prepare("SELECT count(*) AS n FROM reports WHERE lower(username)=lower(?) AND created_at>strftime('%Y-%m-%dT%H:%M:%fZ','now','-15 minutes')"),
  addReport: db.prepare('INSERT INTO reports(id,code,category,username,details) VALUES(?,?,?,?,?)'),
  getTicket: db.prepare('SELECT status,created_at AS submitted_at FROM reports WHERE code=?'),
  allReports: db.prepare('SELECT id,code,category,username,details,status,staff_note,created_at FROM reports ORDER BY created_at DESC LIMIT 100'),
  oneReport: db.prepare('SELECT id,code,category,username,details,status,staff_note,created_at FROM reports WHERE id=?'),
  updateReport: db.prepare('UPDATE reports SET status=?,staff_note=? WHERE id=?'),
  emailHourCount: db.prepare('SELECT count(*) AS n FROM staff_email_send_log WHERE user_id=? AND created_at>?'),
  emailDayCount: db.prepare('SELECT count(*) AS n FROM staff_email_send_log WHERE created_at>?'),
  addEmailAttempt: db.prepare('INSERT INTO staff_email_send_log(user_id,created_at) VALUES(?,?)'),
  cleanup: db.prepare('DELETE FROM sessions WHERE expires_at<=?'),
};

function json(res, status, body, origin) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, OPTIONS';
    headers['Access-Control-Max-Age'] = '600';
    headers.Vary = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(body === undefined ? '' : JSON.stringify(body));
}

function isLoopback(address = '') {
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function readJson(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Bad JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function bearerToken(req) {
  const match = (req.headers.authorization || '').match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] || null;
}

function authenticatedUser(req) {
  const token = bearerToken(req);
  if (!token || token.length > 256) return null;
  const hash = tokenHash(token);
  const session = statements.sessionUser.get(hash, Math.floor(Date.now() / 1000));
  if (!session) return null;
  return statements.staffById.get(session.user_id) || null;
}

function validEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
}

function sendSetupPage(res) {
  const page = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>CoolWips backend setup</title>
  <main style="font:16px system-ui;max-width:34rem;margin:4rem auto;padding:0 1rem"><h1>Create the CoolWips staff owner</h1>
  <p>This one-time setup is available only on this PC. It creates <b>${OWNER_EMAIL.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}</b>. Choose a long password and keep it private.</p>
  <form id="f"><label>Password<br><input id="p" type="password" minlength="16" autocomplete="new-password" required style="width:100%;padding:.7rem"></label><br><br>
  <label>Repeat password<br><input id="q" type="password" minlength="16" autocomplete="new-password" required style="width:100%;padding:.7rem"></label><br><br>
  <button style="padding:.7rem 1rem">Create staff login</button></form><p id="m" role="status"></p></main>
  <script>f.onsubmit=async e=>{e.preventDefault();m.textContent='Creating account…';if(p.value!==q.value){m.textContent='The passwords do not match.';return}const r=await fetch('/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:p.value})});const d=await r.json().catch(()=>({}));m.textContent=r.ok?'Staff owner created. Close this page, then sign in at the website.':(d.error||'Setup failed.');if(r.ok)f.remove();};</script>`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" });
  res.end(page);
}

const loginAttempts = new Map();
let cachedAmeluApiKey = null;
function getAmeluApiKey() {
  if (cachedAmeluApiKey) return cachedAmeluApiKey;
  if (process.platform !== 'win32') return null;
  try {
    const script = new URL('./secrets.ps1', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
    const value = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, 'read'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (value) cachedAmeluApiKey = value;
  } catch {
    return null;
  }
  return cachedAmeluApiKey;
}

function allowLoginAttempt(email) {
  const now = Date.now();
  const current = loginAttempts.get(email) || { start: now, count: 0 };
  if (now - current.start > 15 * 60_000) { current.start = now; current.count = 0; }
  current.count += 1;
  loginAttempts.set(email, current);
  return current.count <= 10;
}

async function handle(req, res) {
  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(res, 403, { error: 'Origin not allowed.' }, '');
  if (req.method === 'OPTIONS') {
    if (!origin) return json(res, 403, { error: 'Origin not allowed.' }, '');
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Max-Age': '600', Vary: 'Origin',
    });
    return res.end();
  }

  const url = new URL(req.url || '/', 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/healthz') return json(res, 200, { ok: true }, origin);

  if (url.pathname === '/setup') {
    if (!isLoopback(req.socket.remoteAddress) || statements.ownerCount.get().n !== 0) return json(res, 404, { error: 'Not found.' }, origin);
    if (req.method === 'GET') return sendSetupPage(res);
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' }, origin);
    const payload = await readJson(req);
    const password = typeof payload.password === 'string' ? payload.password : '';
    if (password.length < 16 || password.length > 1024) return json(res, 400, { error: 'Use a password from 16 to 1024 characters.' }, origin);
    if (statements.ownerCount.get().n !== 0) return json(res, 409, { error: 'The owner account has already been created.' }, origin);
    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, 32, { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
    statements.saveStaff.run(randomUUID(), OWNER_EMAIL, 'owner', salt, hash);
    return json(res, 201, { created: true }, origin);
  }

  if (url.pathname === '/auth/v1/token' && req.method === 'POST' && url.searchParams.get('grant_type') === 'password') {
    const payload = await readJson(req);
    const email = (typeof payload.email === 'string' ? payload.email : '').trim().toLowerCase();
    const password = typeof payload.password === 'string' ? payload.password : '';
    const staff = validEmail(email) ? statements.staffByEmail.get(email) : null;
    if (!allowLoginAttempt(email) || !staff || password.length > 1024) return json(res, 400, { error_description: 'Invalid login credentials.' }, origin);
    const candidate = scryptSync(password, staff.password_salt, 32, { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
    if (candidate.length !== staff.password_hash.length || !timingSafeEqual(candidate, staff.password_hash)) return json(res, 400, { error_description: 'Invalid login credentials.' }, origin);
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
    statements.saveSession.run(tokenHash(token), staff.user_id, expiresAt);
    statements.cleanup.run(Math.floor(Date.now() / 1000));
    return json(res, 200, { access_token: token, token_type: 'bearer', expires_in: SESSION_SECONDS, expires_at: expiresAt, user: { id: staff.user_id, email: staff.email, role: 'authenticated', aud: 'authenticated' } }, origin);
  }

  if (url.pathname === '/auth/v1/user' && req.method === 'GET') {
    const user = authenticatedUser(req);
    if (!user) return json(res, 401, { error: 'Session expired.' }, origin);
    return json(res, 200, { id: user.user_id, email: user.email, role: 'authenticated', aud: 'authenticated' }, origin);
  }

  if (url.pathname === '/auth/v1/logout' && req.method === 'POST') {
    const token = bearerToken(req);
    if (token) statements.deleteSession.run(tokenHash(token));
    return json(res, 204, undefined, origin);
  }

  if (url.pathname === '/rest/v1/rpc/submit_report' && req.method === 'POST') {
    const payload = await readJson(req);
    const category = payload.p_category;
    const username = typeof payload.p_username === 'string' ? payload.p_username.trim() : '';
    const details = typeof payload.p_details === 'string' ? payload.p_details.trim() : '';
    if (!['player','appeal','claim','waypoint','other'].includes(category) || username.length < 2 || username.length > 32 || details.length < 12 || details.length > 2000) return json(res, 400, { error: 'Invalid report fields.' }, origin);
    if (statements.recentUsername.get(username).n >= 3) return json(res, 429, { error: 'Too many recent reports for this username.' }, origin);
    const id = randomUUID();
    const code = randomBytes(12).toString('hex');
    statements.addReport.run(id, code, category, username, details);
    return json(res, 200, code, origin);
  }

  if (url.pathname === '/rest/v1/rpc/report_status' && req.method === 'POST') {
    const payload = await readJson(req);
    const code = typeof payload.p_code === 'string' ? payload.p_code : '';
    if (!/^[a-f0-9]{24}$/.test(code)) return json(res, 200, [], origin);
    const row = statements.getTicket.get(code);
    return json(res, 200, row ? [row] : [], origin);
  }

  if (url.pathname === '/rest/v1/staff_members' && req.method === 'GET') {
    const user = authenticatedUser(req);
    if (!user) return json(res, 401, { error: 'Sign in required.' }, origin);
    const wantedId = (url.searchParams.get('user_id') || '').replace(/^eq\./, '');
    if (wantedId !== user.user_id) return json(res, 200, [], origin);
    return json(res, 200, [{ user_id: user.user_id, role: user.role }], origin);
  }

  if (url.pathname === '/rest/v1/reports' && req.method === 'GET') {
    if (!authenticatedUser(req)) return json(res, 401, { error: 'Sign in required.' }, origin);
    return json(res, 200, statements.allReports.all(), origin);
  }

  if (url.pathname === '/rest/v1/reports' && req.method === 'PATCH') {
    if (!authenticatedUser(req)) return json(res, 401, { error: 'Sign in required.' }, origin);
    const id = (url.searchParams.get('id') || '').replace(/^eq\./, '');
    if (!/^[0-9a-f-]{36}$/i.test(id) || !statements.oneReport.get(id)) return json(res, 404, { error: 'Report not found.' }, origin);
    const payload = await readJson(req);
    const status = payload.status;
    const staffNote = typeof payload.staff_note === 'string' ? payload.staff_note : '';
    if (!['open','reviewing','resolved','closed'].includes(status) || staffNote.length > 3000) return json(res, 400, { error: 'Invalid report update.' }, origin);
    statements.updateReport.run(status, staffNote, id);
    return json(res, 204, undefined, origin);
  }

  if (url.pathname === '/functions/v1/send-staff-email' && req.method === 'POST') {
    const user = authenticatedUser(req);
    if (!user) return json(res, 401, { error: 'Sign in with an approved staff account.' }, origin);
    const apiKey = getAmeluApiKey();
    const mailboxId = process.env.AMELU_MAILBOX_ID;
    if (!apiKey || !mailboxId) return json(res, 503, { error: 'Outgoing mail relay is not configured.' }, origin);
    const payload = await readJson(req);
    const to = typeof payload.to === 'string' ? payload.to.trim() : '';
    const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
    const textBody = typeof payload.textBody === 'string' ? payload.textBody.trim() : '';
    if (!validEmail(to)) return json(res, 400, { error: 'Enter one valid recipient email address.' }, origin);
    if (!subject || subject.length > 180 || /[\r\n\u0000-\u001f\u007f]/.test(subject)) return json(res, 400, { error: 'Subject must be 1–180 characters on one line.' }, origin);
    if (!textBody || textBody.length > 10000 || textBody.includes('\u0000')) return json(res, 400, { error: 'Message must be 1–10,000 characters.' }, origin);
    const now = Math.floor(Date.now() / 1000);
    if (statements.emailHourCount.get(user.user_id, now - 3600).n >= 10 || statements.emailDayCount.get(now - 86400).n >= 50) return json(res, 429, { error: 'Staff email limit reached.' }, origin);
    statements.addEmailAttempt.run(user.user_id, now);
    let response;
    try {
      response = await fetch('https://api.amelu.org/api/mailboxes/' + encodeURIComponent(mailboxId) + '/messages', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ to: [to], cc: [], subject, textBody }),
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      return json(res, 502, { error: 'The mail provider did not confirm the send. Check the sender’s Sent folder before retrying.' }, origin);
    }
    if (!response.ok) return json(res, 502, { error: 'The mail provider did not accept the message. Check the sender’s Sent folder before retrying.' }, origin);
    return json(res, 200, { sent: true }, origin);
  }

  return json(res, 404, { error: 'Not found.' }, origin);
}

const server = createServer((req, res) => {
  handle(req, res).catch((error) => {
    if (!res.headersSent) json(res, error.status || 500, { error: error.status === 413 ? 'Request is too large.' : error.status === 400 ? 'Enter valid JSON.' : 'The backend could not complete the request.' }, req.headers.origin || '');
    else res.destroy();
  });
});

server.listen(PORT, HOST, () => {
  console.log(`CoolWips backend listening on ${HOST}:${PORT}`);
  console.log(`Database: ${DB_FILE}`);
  if (statements.ownerCount.get().n === 0) console.log(`Open http://127.0.0.1:${PORT}/setup on this PC to create ${OWNER_EMAIL}.`);
});

function shutdown() {
  server.close(() => { db.close(); process.exit(0); });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

