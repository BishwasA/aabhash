// Forest Service Nepal - zero-dependency server (Node 18+). Run: node server.js
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme123';
const ROOT = __dirname, PUB = path.join(ROOT, 'public'), DATA = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA, 'db.json'), UPLOADS = path.join(DATA, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

const TYPES = ['update', 'highlight', 'article', 'news', 'opportunity', 'video', 'resource'];
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const uid = () => crypto.randomBytes(6).toString('hex');
const today = (d = 0) => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);

function seed() {
  const mk = (type, title, d, extra = {}) => ({ id: uid(), type, title, title_ne: '', summary: '', body: '', url: '', fileType: '', published: true, date: today(d), ...extra });
  return {
    items: [
      mk('update', 'Research Permission Form', 0), mk('update', 'New Loksewa Syllabus', 1),
      mk('update', 'Forestry Research Opportunity', 2), mk('update', 'New Forestry Article', 3),
      mk('update', 'New Additional Resource', 4),
      mk('highlight', 'New Loksewa materials and updates', 0), mk('highlight', 'New forestry opportunities', 0),
      mk('highlight', 'New articles and learning resources', 0), mk('highlight', 'New forms and documents', 0),
      mk('resource', 'Research Permission Form', 0, { fileType: 'PDF' }),
      mk('resource', 'Research Proposal Format', 1, { fileType: 'PDF' }),
      mk('resource', 'Forestry Guidelines', 2, { fileType: 'PDF' }),
      mk('resource', 'Important Forms & Documents', 3, { fileType: 'DOC' }),
    ], submissions: [], socialLinks: []
  };
}
let db;
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { db = seed(); save(); }
function save() { const t = DB_FILE + '.tmp'; fs.writeFileSync(t, JSON.stringify(db, null, 2)); fs.renameSync(t, DB_FILE); }
const migrateSocialLinks = !Array.isArray(db.socialLinks);
if (Array.isArray(db.socialLinks)) {
  db.socialLinks = db.socialLinks.map(link => ({
    id: str(link.id, 32) || uid(),
    name: str(link.name, 80),
    url: str(link.url, 500),
    iconClass: str(link.iconClass, 120),
    imageUrl: str(link.imageUrl, 500)
  }));
} else if (db.socialLinks && typeof db.socialLinks === 'object') {
  const legacyIcons = { linkedin: 'fa-brands fa-linkedin-in', instagram: 'fa-brands fa-instagram', facebook: 'fa-brands fa-facebook-f', tiktok: 'fa-brands fa-tiktok' };
  db.socialLinks = Object.entries(db.socialLinks).filter(([, url]) => url).map(([name, url]) => ({
    id: uid(), name: name[0].toUpperCase() + name.slice(1), url: str(url, 500), iconClass: legacyIcons[name] || 'fa-solid fa-link', imageUrl: ''
  }));
} else {
  db.socialLinks = [];
}
if (!Array.isArray(db.submissions)) db.submissions = [];
if (!db.items || !Array.isArray(db.items)) db.items = [];
if (migrateSocialLinks) {
  save();
}

// ---- auth (in-memory sessions, HttpOnly cookie) ----
const sessions = new Map(), hits = new Map();
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const same = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const cookie = req => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(c => c[0]));
const isAdmin = req => { const t = cookie(req).fsn_session, s = sessions.get(t); if (s && s > Date.now()) return true; sessions.delete(t); return false; };
function limited(key, max, ms) { const n = Date.now(), h = (hits.get(key) || []).filter(t => t > n - ms); h.push(n); hits.set(key, h); return h.length > max; }

// ---- helpers ----
const send = (res, code, obj, headers = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', ...headers }); res.end(JSON.stringify(obj)); };
function body(req, limit = 1e6, raw = false) {
  return new Promise((ok, no) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limit) { no(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { const b = Buffer.concat(chunks); if (raw) return ok(b); try { ok(b.length ? JSON.parse(b) : {}); } catch { no(new Error('bad json')); } });
  });
}
const isHttpUrl = value => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
};
const isFontAwesomeClass = value => /^fa(?:-[a-z0-9]+)?(?:\s+fa-[a-z0-9-]+)+$/i.test(value);
function socialLinks() {
  return db.socialLinks.filter(link => link.name && isHttpUrl(link.url) &&
    (isFontAwesomeClass(link.iconClass) || isHttpUrl(link.imageUrl)));
}
function cleanSocialLinks(values) {
  if (!Array.isArray(values) || values.length > 50) return { error: 'Provide up to 50 social links.' };
  const links = [];
  for (const value of values) {
    const name = str(value.name, 80), url = str(value.url, 500);
    const iconClass = str(value.iconClass, 120), imageUrl = str(value.imageUrl, 500);
    if (!name || !url || !isHttpUrl(url)) return { error: 'Each social link needs a name and a valid http(s) destination URL.' };
    if (imageUrl && !isHttpUrl(imageUrl)) return { error: `The image URL for "${name}" must use http or https.` };
    if (iconClass && !isFontAwesomeClass(iconClass)) return { error: `Enter valid Font Awesome classes for "${name}" (for example: fa-brands fa-instagram).` };
    if (!iconClass && !imageUrl) return { error: `Add a Font Awesome class or image URL for "${name}".` };
    links.push({ id: str(value.id, 32) || uid(), name, url, iconClass, imageUrl });
  }
  return { links };
}
function clean(i) {
  return { type: TYPES.includes(i.type) ? i.type : 'article', title: str(i.title, 200), title_ne: str(i.title_ne, 200),
    summary: str(i.summary, 500), body: str(i.body, 20000), url: str(i.url, 500), fileType: str(i.fileType, 8).toUpperCase(),
    published: i.published !== false, date: /^\d{4}-\d{2}-\d{2}$/.test(i.date) ? i.date : today() };
}
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
const UPLOAD_EXT = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp'];

function serveFile(res, base, rel) {
  let p = path.normalize(path.join(base, decodeURIComponent(rel)));
  if (!p.startsWith(base)) return send(res, 403, { error: 'forbidden' });
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  fs.readFile(p, (e, d) => {
    if (e) return send(res, 404, { error: 'not found' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(d);
  });
}

// ---- routes ----
async function api(req, res, url) {
  const m = req.method, p = url.pathname, q = url.searchParams, ip = req.socket.remoteAddress;
  // public
  if (m === 'GET' && p === '/api/items') {
    let list = db.items.filter(i => i.published && (!q.get('type') || i.type === q.get('type')));
    const s = (q.get('q') || '').trim().toLowerCase();
    if (s) list = list.filter(i => [i.title, i.title_ne, i.summary, i.body].join(' ').toLowerCase().includes(s));
    list.sort((a, b) => b.date.localeCompare(a.date));
    return send(res, 200, list.slice(0, Math.min(+q.get('limit') || 100, 200)));
  }
  if (m === 'GET' && p === '/api/social') {
    return send(res, 200, socialLinks());
  }
  let mm;
  if (m === 'GET' && (mm = p.match(/^\/api\/items\/(\w+)$/))) {
    const it = db.items.find(i => i.id === mm[1] && i.published);
    return it ? send(res, 200, it) : send(res, 404, { error: 'Not found' });
  }
  if (m === 'POST' && p === '/api/submit') {
    if (limited('sub' + ip, 5, 36e5)) return send(res, 429, { error: 'Too many submissions. Try again later.' });
    const b = await body(req);
    if (b.website) return send(res, 200, { ok: true }); // honeypot
    const s = { id: uid(), type: b.type === 'news' ? 'news' : 'article', title: str(b.title, 200), body: str(b.body, 20000),
      name: str(b.name, 100), email: str(b.email, 120), link: str(b.link, 500), date: today() };
    if (!s.title || !s.body || !s.name) return send(res, 400, { error: 'Name, title and content are required.' });
    db.submissions.push(s); save(); return send(res, 201, { ok: true });
  }
  if (m === 'POST' && p === '/api/login') {
    if (limited('login' + ip, 8, 9e5)) return send(res, 429, { error: 'Too many attempts. Wait 15 minutes.' });
    const b = await body(req);
    if (same(b.username, ADMIN_USER) && same(b.password, ADMIN_PASS)) {
      const t = crypto.randomBytes(32).toString('hex'); sessions.set(t, Date.now() + 12 * 36e5);
      return send(res, 200, { ok: true }, { 'Set-Cookie': `fsn_session=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200` });
    }
    return send(res, 401, { error: 'Wrong username or password.' });
  }
  if (p === '/api/logout') { sessions.delete(cookie(req).fsn_session); return send(res, 200, { ok: true }, { 'Set-Cookie': 'fsn_session=; Max-Age=0; Path=/' }); }
  if (p === '/api/me') return send(res, 200, { admin: isAdmin(req) });

  // admin only
  if (!p.startsWith('/api/admin/')) return send(res, 404, { error: 'Not found' });
  if (!isAdmin(req)) return send(res, 401, { error: 'Login required' });
  if (m !== 'GET' && req.headers['x-requested-with'] !== 'fsn') return send(res, 403, { error: 'Bad request' });

  if (m === 'GET' && p === '/api/admin/items') return send(res, 200, [...db.items].sort((a, b) => b.date.localeCompare(a.date)));
  if (m === 'GET' && p === '/api/admin/social') {
    return send(res, 200, socialLinks());
  }
  if (m === 'PUT' && p === '/api/admin/social') {
    const result = cleanSocialLinks(await body(req));
    if (result.error) return send(res, 400, { error: result.error });
    db.socialLinks = result.links;
    save();
    return send(res, 200, socialLinks());
  }
  if (m === 'POST' && p === '/api/admin/items') {
    const it = { id: uid(), ...clean(await body(req)) };
    if (!it.title) return send(res, 400, { error: 'Title is required.' });
    db.items.push(it); save(); return send(res, 201, it);
  }
  if ((mm = p.match(/^\/api\/admin\/items\/(\w+)$/))) {
    const i = db.items.findIndex(x => x.id === mm[1]); if (i < 0) return send(res, 404, { error: 'Not found' });
    if (m === 'PUT') { const c = clean(await body(req)); if (!c.title) return send(res, 400, { error: 'Title is required.' }); db.items[i] = { id: mm[1], ...c }; save(); return send(res, 200, db.items[i]); }
    if (m === 'DELETE') { db.items.splice(i, 1); save(); return send(res, 200, { ok: true }); }
  }
  if (m === 'GET' && p === '/api/admin/submissions') return send(res, 200, db.submissions);
  if ((mm = p.match(/^\/api\/admin\/submissions\/(\w+)(\/approve)?$/))) {
    const i = db.submissions.findIndex(x => x.id === mm[1]); if (i < 0) return send(res, 404, { error: 'Not found' });
    const s = db.submissions[i];
    if (m === 'POST' && mm[2]) {
      const it = { id: uid(), ...clean({ type: s.type, title: s.title, summary: s.body.slice(0, 200), body: s.body + `\n\n— ${s.name}`, url: '', published: true, date: today() }) };
      db.items.push(it); db.submissions.splice(i, 1); save(); return send(res, 200, it);
    }
    if (m === 'DELETE') { db.submissions.splice(i, 1); save(); return send(res, 200, { ok: true }); }
  }
  if (m === 'POST' && p === '/api/admin/upload') {
    const name = path.basename(decodeURIComponent(req.headers['x-filename'] || 'file')), ext = path.extname(name).toLowerCase();
    if (!UPLOAD_EXT.includes(ext)) return send(res, 400, { error: 'Allowed: ' + UPLOAD_EXT.join(', ') });
    const buf = await body(req, 25e6, true);
    const fn = uid() + '-' + name.replace(/[^\w.\-]/g, '_');
    fs.writeFileSync(path.join(UPLOADS, fn), buf); return send(res, 201, { url: '/uploads/' + fn });
  }
  send(res, 404, { error: 'Not found' });
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (url.pathname.startsWith('/uploads/')) return serveFile(res, UPLOADS, url.pathname.slice(9));
    if (url.pathname === '/admin') return serveFile(res, PUB, 'admin.html');
    serveFile(res, PUB, url.pathname === '/' ? 'index.html' : url.pathname);
  } catch (e) { send(res, 400, { error: e.message }); }
}).listen(PORT, () => {
  console.log(`Site:  http://localhost:${PORT}\nAdmin: http://localhost:${PORT}/admin`);
  if (ADMIN_PASS === 'changeme123') console.warn('WARNING: using default admin password. Set ADMIN_USER / ADMIN_PASS env vars.');
});
