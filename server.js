const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]', 'utf8');

function loadOrders() {
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

function generateOrderId() {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `VC-${rand}`;
}

const PAYMENT_METHODS = new Set(['cod', 'card', 'bank_transfer']);
const STATUS_FLOW = ['Placed', 'Confirmed', 'Shipped', 'Delivered'];

function luhnCheck(numStr) {
  const digits = numStr.replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

app.use(express.json());
app.use(express.static(__dirname));

function sanitizeStr(v, max = 500) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

app.post('/api/orders', (req, res) => {
  const body = req.body || {};
  const customer = body.customer || {};

  const name = sanitizeStr(customer.name, 120);
  const phone = sanitizeStr(customer.phone, 30);
  const email = sanitizeStr(customer.email, 160);
  const address = sanitizeStr(customer.address, 500);
  const city = sanitizeStr(customer.city, 80);
  const notes = sanitizeStr(customer.notes, 500);

  const items = Array.isArray(body.items) ? body.items : [];
  const customRequests = Array.isArray(body.customRequests) ? body.customRequests : [];
  const paymentMethod = sanitizeStr(body.paymentMethod, 20);

  if (!name || !phone || !address || !city) {
    return res.status(400).json({ error: 'Missing required shipping details (name, phone, address, city).' });
  }
  if (items.length === 0 && customRequests.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item or custom request.' });
  }
  if (!PAYMENT_METHODS.has(paymentMethod)) {
    return res.status(400).json({ error: 'Invalid or missing payment method.' });
  }

  let cleanItems;
  try {
    cleanItems = items.map((it) => {
      const qty = Math.max(1, Math.min(50, parseInt(it.qty, 10) || 1));
      const price = Math.max(0, Number(it.price) || 0);
      return {
        id: sanitizeStr(it.id, 40),
        name: sanitizeStr(it.name, 120),
        price,
        qty,
      };
    });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid items payload.' });
  }

  const cleanCustomRequests = customRequests.map((r) => ({
    shape: sanitizeStr(r.shape, 40),
    length: sanitizeStr(r.length, 40),
    sizeLabel: sanitizeStr(r.sizeLabel, 120),
    notes: sanitizeStr(r.notes, 500),
  }));

  const subtotal = cleanItems.reduce((sum, i) => sum + i.qty * i.price, 0);
  const deliveryFee = subtotal > 0 || cleanCustomRequests.length ? 200 : 0;
  const total = subtotal + (cleanItems.length ? deliveryFee : 0);

  let payment = { method: paymentMethod };

  if (paymentMethod === 'card') {
    const card = body.card || {};
    const cardNumberDigits = sanitizeStr(card.number, 25).replace(/\D/g, '');
    const expiry = sanitizeStr(card.expiry, 10);
    const cvv = sanitizeStr(card.cvv, 4);
    const nameOnCard = sanitizeStr(card.name, 120);

    if (!nameOnCard || !luhnCheck(cardNumberDigits) || !/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3,4}$/.test(cvv)) {
      return res.status(400).json({ error: 'Invalid test card details.' });
    }
    const [mm, yy] = expiry.split('/').map((n) => parseInt(n, 10));
    const now = new Date();
    const currentYY = now.getFullYear() % 100;
    const currentMM = now.getMonth() + 1;
    if (mm < 1 || mm > 12 || yy < currentYY || (yy === currentYY && mm < currentMM)) {
      return res.status(400).json({ error: 'Card has expired.' });
    }

    payment.status = 'Paid (Test Mode)';
    payment.cardLast4 = cardNumberDigits.slice(-4);
    payment.cardBrand = cardNumberDigits.startsWith('4') ? 'Visa'
      : /^5[1-5]/.test(cardNumberDigits) ? 'Mastercard'
      : 'Card';
    payment.note = 'Simulated test-mode payment — no real funds were transferred.';
  } else if (paymentMethod === 'bank_transfer') {
    payment.status = 'Pending Verification';
    payment.note = 'Awaiting payment proof from customer via WhatsApp.';
  } else {
    payment.status = 'Pending (Pay on Delivery)';
  }

  const order = {
    id: generateOrderId(),
    createdAt: new Date().toISOString(),
    status: 'Placed',
    customer: { name, phone, email, address, city, notes },
    items: cleanItems,
    customRequests: cleanCustomRequests,
    subtotal,
    deliveryFee: cleanItems.length ? deliveryFee : 0,
    total,
    payment,
  };

  const orders = loadOrders();
  orders.push(order);
  saveOrders(orders);

  res.status(201).json(order);
});

app.get('/api/orders/:id', (req, res) => {
  const orders = loadOrders();
  const order = orders.find((o) => o.id.toLowerCase() === String(req.params.id).toLowerCase());
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json(order);
});

app.get('/api/orders', (req, res) => {
  const phone = sanitizeStr(req.query.phone, 30);
  if (!phone) return res.status(400).json({ error: 'Provide a phone query parameter to look up orders.' });
  const orders = loadOrders()
    .filter((o) => o.customer.phone.replace(/\D/g, '').endsWith(phone.replace(/\D/g, '').slice(-7)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(orders);
});

/* =========================================================
   PAN AROMA — candle store orders, reviews, newsletter
========================================================= */
const CANDLE_ORDERS_FILE = path.join(DATA_DIR, 'candle-orders.json');
const CANDLE_REVIEWS_FILE = path.join(DATA_DIR, 'candle-reviews.json');
const NEWSLETTER_FILE = path.join(DATA_DIR, 'newsletter.json');

if (!fs.existsSync(CANDLE_ORDERS_FILE)) fs.writeFileSync(CANDLE_ORDERS_FILE, '[]', 'utf8');
if (!fs.existsSync(CANDLE_REVIEWS_FILE)) fs.writeFileSync(CANDLE_REVIEWS_FILE, '[]', 'utf8');
if (!fs.existsSync(NEWSLETTER_FILE)) fs.writeFileSync(NEWSLETTER_FILE, '[]', 'utf8');

function loadJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return []; }
}
function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function generateCandleOrderId() {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `PA-${rand}`;
}

const CANDLE_PAYMENT_METHODS = new Set(['card', 'paypal', 'cod']);
const CANDLE_DELIVERY_FEE = 3.95;
const CANDLE_FREE_DELIVERY_THRESHOLD = 35;

app.post('/api/candle-orders', (req, res) => {
  const body = req.body || {};
  const customer = body.customer || {};

  const name = sanitizeStr(customer.name, 120);
  const email = sanitizeStr(customer.email, 160);
  const phone = sanitizeStr(customer.phone, 30);
  const address = sanitizeStr(customer.address, 500);
  const city = sanitizeStr(customer.city, 80);
  const postcode = sanitizeStr(customer.postcode, 20);
  const notes = sanitizeStr(customer.notes, 500);

  const items = Array.isArray(body.items) ? body.items : [];
  const paymentMethod = sanitizeStr(body.paymentMethod, 20);

  if (!name || !email || !address || !city || !postcode) {
    return res.status(400).json({ error: 'Missing required details (name, email, address, city, postcode).' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (items.length === 0) {
    return res.status(400).json({ error: 'Your order has no items.' });
  }
  if (!CANDLE_PAYMENT_METHODS.has(paymentMethod)) {
    return res.status(400).json({ error: 'Invalid or missing payment method.' });
  }

  let cleanItems;
  try {
    cleanItems = items.map((it) => {
      const qty = Math.max(1, Math.min(50, parseInt(it.qty, 10) || 1));
      const price = Math.max(0, Number(it.price) || 0);
      return {
        id: sanitizeStr(it.id, 40),
        name: sanitizeStr(it.name, 120),
        price,
        qty,
      };
    });
  } catch (e) {
    return res.status(400).json({ error: 'Invalid items payload.' });
  }

  const subtotal = cleanItems.reduce((sum, i) => sum + i.qty * i.price, 0);
  const discountCode = sanitizeStr(body.discountCode, 30).toUpperCase();
  const discountAmount = discountCode === 'WELCOME10' ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
  const discountedSubtotal = subtotal - discountAmount;
  const deliveryFee = discountedSubtotal >= CANDLE_FREE_DELIVERY_THRESHOLD ? 0 : CANDLE_DELIVERY_FEE;
  const total = Math.round((discountedSubtotal + deliveryFee) * 100) / 100;

  let payment = { method: paymentMethod };

  if (paymentMethod === 'card') {
    const card = body.card || {};
    const cardNumberDigits = sanitizeStr(card.number, 25).replace(/\D/g, '');
    const expiry = sanitizeStr(card.expiry, 10);
    const cvv = sanitizeStr(card.cvv, 4);
    const nameOnCard = sanitizeStr(card.name, 120);

    if (!nameOnCard || !luhnCheck(cardNumberDigits) || !/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3,4}$/.test(cvv)) {
      return res.status(400).json({ error: 'Invalid test card details.' });
    }
    const [mm, yy] = expiry.split('/').map((n) => parseInt(n, 10));
    const now = new Date();
    const currentYY = now.getFullYear() % 100;
    const currentMM = now.getMonth() + 1;
    if (mm < 1 || mm > 12 || yy < currentYY || (yy === currentYY && mm < currentMM)) {
      return res.status(400).json({ error: 'Card has expired.' });
    }

    payment.status = 'Paid (Test Mode)';
    payment.cardLast4 = cardNumberDigits.slice(-4);
    payment.cardBrand = cardNumberDigits.startsWith('4') ? 'Visa'
      : /^5[1-5]/.test(cardNumberDigits) ? 'Mastercard'
      : 'Card';
    payment.note = 'Simulated test-mode payment — no real funds were transferred.';
  } else if (paymentMethod === 'paypal') {
    payment.status = 'Paid (Demo Mode)';
    payment.note = 'Simulated PayPal checkout — no real PayPal transaction occurred.';
  } else {
    payment.status = 'Pending (Pay on Delivery)';
  }

  const order = {
    id: generateCandleOrderId(),
    createdAt: new Date().toISOString(),
    status: 'Placed',
    customer: { name, email, phone, address, city, postcode, notes },
    items: cleanItems,
    subtotal: Math.round(subtotal * 100) / 100,
    discountCode: discountAmount > 0 ? 'WELCOME10' : null,
    discountAmount,
    deliveryFee: Math.round(deliveryFee * 100) / 100,
    total,
    payment,
  };

  const orders = loadJson(CANDLE_ORDERS_FILE);
  orders.push(order);
  saveJson(CANDLE_ORDERS_FILE, orders);

  res.status(201).json(order);
});

app.get('/api/candle-orders/:id', (req, res) => {
  const orders = loadJson(CANDLE_ORDERS_FILE);
  const order = orders.find((o) => o.id.toLowerCase() === String(req.params.id).toLowerCase());
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json(order);
});

app.get('/api/candle-orders', (req, res) => {
  const email = sanitizeStr(req.query.email, 160).toLowerCase();
  if (!email) return res.status(400).json({ error: 'Provide an email query parameter to look up orders.' });
  const orders = loadJson(CANDLE_ORDERS_FILE)
    .filter((o) => o.customer.email.toLowerCase() === email)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(orders);
});

app.get('/api/candle-reviews', (req, res) => {
  const productId = sanitizeStr(req.query.productId, 40);
  const reviews = loadJson(CANDLE_REVIEWS_FILE);
  const list = productId ? reviews.filter((r) => r.productId === productId) : reviews;
  res.json(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/candle-reviews', (req, res) => {
  const body = req.body || {};
  const productId = sanitizeStr(body.productId, 40);
  const name = sanitizeStr(body.name, 80);
  const rating = Math.round(Number(body.rating));
  const comment = sanitizeStr(body.comment, 800);

  if (!productId || !name || !comment || !(rating >= 1 && rating <= 5)) {
    return res.status(400).json({ error: 'Please provide your name, a rating (1-5) and a comment.' });
  }

  const review = {
    id: crypto.randomBytes(6).toString('hex'),
    productId,
    name,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };

  const reviews = loadJson(CANDLE_REVIEWS_FILE);
  reviews.push(review);
  saveJson(CANDLE_REVIEWS_FILE, reviews);

  res.status(201).json(review);
});

app.post('/api/newsletter', (req, res) => {
  const body = req.body || {};
  const email = sanitizeStr(body.email, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const subscribers = loadJson(NEWSLETTER_FILE);
  const already = subscribers.some((s) => s.email === email);
  if (!already) {
    subscribers.push({ email, subscribedAt: new Date().toISOString() });
    saveJson(NEWSLETTER_FILE, subscribers);
  }

  res.status(already ? 200 : 201).json({ code: 'WELCOME10', alreadySubscribed: already });
});

/* =========================================================
   PAN AROMA — admin auth & product management
========================================================= */
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const CANDLE_PRODUCTS_FILE = path.join(DATA_DIR, 'candle-products.json');

const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'ChangeMe123!';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, hash) {
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  const checkBuf = Buffer.from(check, 'hex');
  const hashBuf = Buffer.from(hash, 'hex');
  if (checkBuf.length !== hashBuf.length) return false;
  return crypto.timingSafeEqual(checkBuf, hashBuf);
}

function loadAdmin() {
  try { return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8')); } catch (e) { return null; }
}
function saveAdmin(data) {
  fs.writeFileSync(ADMIN_FILE, JSON.stringify(data, null, 2), 'utf8');
}

if (!fs.existsSync(ADMIN_FILE)) {
  const { salt, hash } = hashPassword(DEFAULT_ADMIN_PASSWORD);
  saveAdmin({ username: DEFAULT_ADMIN_USERNAME, salt, hash });
  console.log('─'.repeat(60));
  console.log('Pan Aroma admin account created.');
  console.log(`  Username: ${DEFAULT_ADMIN_USERNAME}`);
  console.log(`  Password: ${DEFAULT_ADMIN_PASSWORD}`);
  console.log('  Log in at /admin.html and change this password immediately.');
  console.log('─'.repeat(60));
}

const DEFAULT_CANDLE_PRODUCTS = [
  { id: 'honeysuckle-sandalwood', name: 'Honeysuckle & Sandalwood', category: 'candle', categoryLabel: 'Candle', moods: ['floral', 'fruity'], price: 14.99, burn: 'Approx 23hr burn', notes: { top: 'Honeysuckle Nectar', mid: 'Rose Petal', base: 'Sandalwood' }, blurb: 'A fruity-floral hand-poured candle in a matte ceramic jar.', color: '#5B6B3F', stock: 14 },
  { id: 'vanilla-bean', name: 'Vanilla Bean', category: 'candle', categoryLabel: 'Candle', moods: ['cozy'], price: 8.99, burn: 'Approx 21hr burn', notes: { top: 'Vanilla Orchid', mid: 'Warm Caramel', base: 'Tonka Bean' }, blurb: 'A timeless glass apothecary jar candle with a warm, sweet glow.', color: '#C7A34B', stock: 22 },
  { id: 'pure-jasmine', name: 'Pure Jasmine', category: 'diffuser', categoryLabel: 'Reed Diffuser', moods: ['floral', 'calming'], price: 11.99, burn: 'Lasts up to 8 weeks', notes: { top: 'Jasmine Petals', mid: 'White Musk', base: 'Soft Woods' }, blurb: 'A calming, soothing reed diffuser to gently scent any room.', color: '#8D82B5', stock: 9 },
  { id: 'apple-cinnamon', name: 'Apple & Cinnamon', category: 'diffuser', categoryLabel: 'Reed Diffuser', moods: ['spicy', 'cozy'], price: 11.99, burn: 'Lasts up to 8 weeks', notes: { top: 'Crisp Apple', mid: 'Cinnamon Bark', base: 'Warm Spice' }, blurb: 'A sweet and spicy reed diffuser, cosy from the very first sniff.', color: '#7C2B27', stock: 17 },
  { id: 'lemongrass', name: 'Lemongrass', category: 'diffuser', categoryLabel: 'Reed Diffuser', moods: ['fresh', 'fruity'], price: 11.99, burn: 'Lasts up to 8 weeks', notes: { top: 'Lemongrass', mid: 'Lime Zest', base: 'Green Tea' }, blurb: 'A fresh, vibrant reed diffuser that wakes up any space.', color: '#D9B23C', stock: 20 },
  { id: 'fluffy-towels-tealights', name: 'Fluffy Towels Tea Lights (16pk)', category: 'tealight', categoryLabel: 'Tea Lights', moods: ['fresh', 'calming'], price: 5.99, burn: 'Approx 4hr burn per light', notes: { top: 'Cotton Blossom', mid: 'Clean Linen', base: 'Soft Musk' }, blurb: '16 long-burning tea lights in a clean, fresh linen scent.', color: '#6E85A8', stock: 30 },
];
if (!fs.existsSync(CANDLE_PRODUCTS_FILE)) {
  saveJson(CANDLE_PRODUCTS_FILE, DEFAULT_CANDLE_PRODUCTS);
}

const CATEGORY_LABELS = { candle: 'Candle', diffuser: 'Reed Diffuser', tealight: 'Tea Lights' };
const VALID_MOODS = new Set(['floral', 'fruity', 'fresh', 'spicy', 'cozy', 'calming']);

function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'product';
}

/* --- sessions --- */
const adminSessions = new Map();
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function createSession(username) {
  const token = crypto.randomBytes(24).toString('hex');
  adminSessions.set(token, { username, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}
function getSession(token) {
  if (!token) return null;
  const s = adminSessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { adminSessions.delete(token); return null; }
  return s;
}
function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    try { cookies[k] = decodeURIComponent(v); } catch (e) { cookies[k] = v; }
  });
  return cookies;
}
function requireAdmin(req, res, next) {
  const cookies = parseCookies(req);
  const session = getSession(cookies['pa_admin_session']);
  if (!session) return res.status(401).json({ error: 'Not authenticated.' });
  req.adminUsername = session.username;
  next();
}

/* --- auth routes --- */
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

  const admin = loadAdmin();
  if (!admin || username !== admin.username || !verifyPassword(password, admin.salt, admin.hash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = createSession(admin.username);
  res.cookie('pa_admin_session', token, { httpOnly: true, sameSite: 'lax', maxAge: SESSION_TTL_MS, path: '/' });
  res.json({ ok: true, username: admin.username });
});

app.post('/api/admin/logout', (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies['pa_admin_session'];
  if (token) adminSessions.delete(token);
  res.clearCookie('pa_admin_session', { path: '/' });
  res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => {
  const cookies = parseCookies(req);
  const session = getSession(cookies['pa_admin_session']);
  if (!session) return res.status(401).json({ error: 'Not authenticated.' });
  res.json({ username: session.username });
});

app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const admin = loadAdmin();
  if (!currentPassword || !admin || !verifyPassword(currentPassword, admin.salt, admin.hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }
  const { salt, hash } = hashPassword(newPassword);
  admin.salt = salt;
  admin.hash = hash;
  saveAdmin(admin);
  res.json({ ok: true });
});

/* --- product catalog: public read, admin write --- */
app.get('/api/candle-products', (req, res) => {
  res.json(loadJson(CANDLE_PRODUCTS_FILE));
});

function validateProductPayload(body, existingProducts, currentId) {
  const name = sanitizeStr(body.name, 120);
  const category = sanitizeStr(body.category, 20);
  const blurb = sanitizeStr(body.blurb, 300);
  const burn = sanitizeStr(body.burn, 120);
  const color = /^#[0-9A-Fa-f]{6}$/.test(body.color) ? body.color : '#B8692A';
  const price = Number(body.price);
  const stock = Math.round(Number(body.stock));
  const notes = body.notes || {};
  const top = sanitizeStr(notes.top, 80);
  const mid = sanitizeStr(notes.mid, 80);
  const base = sanitizeStr(notes.base, 80);
  const moods = Array.isArray(body.moods) ? body.moods.filter((m) => VALID_MOODS.has(m)) : [];

  if (!name || !blurb || !burn || !top || !mid || !base) {
    return { error: 'Please fill in name, blurb, usage info and all three scent notes.' };
  }
  if (!CATEGORY_LABELS[category]) {
    return { error: 'Invalid category.' };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { error: 'Price must be a positive number.' };
  }
  if (!Number.isFinite(stock) || stock < 0) {
    return { error: 'Stock must be a non-negative number.' };
  }
  if (moods.length === 0) {
    return { error: 'Select at least one mood.' };
  }

  let id = currentId;
  if (!id) {
    const base_id = slugify(name);
    id = base_id;
    let i = 2;
    while (existingProducts.some((p) => p.id === id)) {
      id = `${base_id}-${i}`;
      i++;
    }
  }

  return {
    product: {
      id,
      name,
      category,
      categoryLabel: CATEGORY_LABELS[category],
      moods,
      price: Math.round(price * 100) / 100,
      burn,
      notes: { top, mid, base },
      blurb,
      color,
      stock,
    },
  };
}

app.post('/api/admin/candle-products', requireAdmin, (req, res) => {
  const products = loadJson(CANDLE_PRODUCTS_FILE);
  const { error, product } = validateProductPayload(req.body || {}, products, null);
  if (error) return res.status(400).json({ error });

  products.push(product);
  saveJson(CANDLE_PRODUCTS_FILE, products);
  res.status(201).json(product);
});

app.put('/api/admin/candle-products/:id', requireAdmin, (req, res) => {
  const products = loadJson(CANDLE_PRODUCTS_FILE);
  const idx = products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found.' });

  const { error, product } = validateProductPayload(req.body || {}, products, req.params.id);
  if (error) return res.status(400).json({ error });

  products[idx] = product;
  saveJson(CANDLE_PRODUCTS_FILE, products);
  res.json(product);
});

app.delete('/api/admin/candle-products/:id', requireAdmin, (req, res) => {
  const products = loadJson(CANDLE_PRODUCTS_FILE);
  const idx = products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found.' });

  products.splice(idx, 1);
  saveJson(CANDLE_PRODUCTS_FILE, products);
  res.json({ ok: true });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end.' });
});

app.listen(PORT, () => {
  console.log(`Velvet Co. running at http://localhost:${PORT}`);
});
