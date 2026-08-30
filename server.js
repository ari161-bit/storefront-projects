const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const db = require('./db');
const auth = require('./auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'lumera-web', 'dist')));

/* Only /api/* routes need Supabase — static files serve regardless,
   so the site shell still loads even if the keys aren't set yet. */
app.use('/api', (req, res, next) => {
  try {
    db.getClient();
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

function sanitizeStr(v, max = 500) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}
function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'product';
}
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

/* =========================================================
   PAN AROMA — candle store orders, reviews, newsletter
========================================================= */
function generateCandleOrderId() {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `PA-${rand}`;
}

const CANDLE_PAYMENT_METHODS = new Set(['card', 'paypal', 'cod']);
const CANDLE_DELIVERY_FEE = 3.95;
const CANDLE_FREE_DELIVERY_THRESHOLD = 35;

function mapCandleOrderRow(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    customer: row.customer,
    items: row.items,
    subtotal: Number(row.subtotal),
    discountCode: row.discount_code,
    discountAmount: Number(row.discount_amount),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    payment: row.payment,
  };
}

app.post('/api/candle-orders', authOptional, async (req, res) => {
  try {
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

    const cleanItems = items.map((it) => {
      const qty = Math.max(1, Math.min(50, parseInt(it.qty, 10) || 1));
      const price = Math.max(0, Number(it.price) || 0);
      return { id: sanitizeStr(it.id, 40), name: sanitizeStr(it.name, 120), price, qty };
    });

    const subtotal = cleanItems.reduce((sum, i) => sum + i.qty * i.price, 0);
    const requestedCode = sanitizeStr(body.discountCode, 30);
    const discount = requestedCode ? await lookupDiscount(requestedCode) : null;
    if (requestedCode && !discount) {
      return res.status(400).json({ error: 'That discount code is invalid or has expired.' });
    }
    const discountAmount = computeDiscountAmount(discount, subtotal);
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
      payment.cardBrand = cardNumberDigits.startsWith('4') ? 'Visa' : /^5[1-5]/.test(cardNumberDigits) ? 'Mastercard' : 'Card';
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
      status: 'Pending',
      customer: { name, email, phone, address, city, postcode, notes },
      items: cleanItems,
      subtotal: Math.round(subtotal * 100) / 100,
      discountCode: discount ? discount.code : null,
      discountAmount,
      deliveryFee: Math.round(deliveryFee * 100) / 100,
      total,
      payment,
    };

    const supabase = db.getClient();
    unwrap(await supabase.from('candle_orders').insert({
      id: order.id,
      created_at: order.createdAt,
      status: order.status,
      customer: order.customer,
      items: order.items,
      subtotal: order.subtotal,
      discount_code: order.discountCode,
      discount_amount: order.discountAmount,
      delivery_fee: order.deliveryFee,
      total: order.total,
      payment: order.payment,
      user_id: req.user ? req.user.sub : null,
    }));

    if (discount) {
      await supabase.from('discounts').update({ used_count: discount.used_count + 1 }).eq('id', discount.id);
    }

    res.status(201).json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong placing your order.' });
  }
});

app.get('/api/candle-orders/:id', async (req, res) => {
  try {
    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('candle_orders').select('*').ilike('id', req.params.id));
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    res.json(mapCandleOrderRow(rows[0]));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.get('/api/candle-orders', async (req, res) => {
  const email = sanitizeStr(req.query.email, 160).toLowerCase();
  if (!email) return res.status(400).json({ error: 'Provide an email query parameter to look up orders.' });
  try {
    const supabase = db.getClient();
    const rows = unwrap(
      await supabase.from('candle_orders').select('*').filter('customer->>email', 'ilike', email).order('created_at', { ascending: false })
    );
    res.json((rows || []).map(mapCandleOrderRow));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

function mapReviewRow(r) {
  return {
    id: r.id,
    productId: r.product_id,
    userId: r.user_id || null,
    name: r.name,
    rating: Number(r.rating),
    comment: r.comment,
    verifiedPurchase: !!r.verified_purchase,
    createdAt: r.created_at,
  };
}

async function recomputeProductRating(productId) {
  const supabase = db.getClient();
  const rows = unwrap(await supabase.from('candle_reviews').select('rating').eq('product_id', productId).eq('hidden', false));
  const list = rows || [];
  const count = list.length;
  const avg = count ? list.reduce((s, r) => s + Number(r.rating), 0) / count : 0;
  await supabase.from('candle_products').update({ rating: Math.round(avg * 10) / 10, rating_count: count }).eq('id', productId);
}

app.get('/api/candle-reviews', async (req, res) => {
  try {
    const supabase = db.getClient();
    const productId = sanitizeStr(req.query.productId, 40);
    let q = supabase.from('candle_reviews').select('*').eq('hidden', false).order('created_at', { ascending: false });
    if (productId) q = q.eq('product_id', productId);
    const rows = unwrap(await q);
    res.json((rows || []).map(mapReviewRow));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.post('/api/candle-reviews', authOptional, async (req, res) => {
  try {
    const body = req.body || {};
    const productId = sanitizeStr(body.productId, 40);
    const rating = Math.round(Number(body.rating));
    const comment = sanitizeStr(body.comment, 800);
    let name = sanitizeStr(body.name, 80);

    const supabase = db.getClient();
    let userId = null;
    let verifiedPurchase = false;

    if (req.user) {
      userId = req.user.sub;
      if (!name) name = req.user.name || 'LUMÉRA Customer';
      const orders = unwrap(await supabase.from('candle_orders').select('items').eq('user_id', userId));
      verifiedPurchase = (orders || []).some((o) => (o.items || []).some((i) => i.id === productId));
    }

    if (!productId || !name || !comment || !(rating >= 1 && rating <= 5)) {
      return res.status(400).json({ error: 'Please provide your name, a rating (1-5) and a comment.' });
    }

    const review = {
      id: crypto.randomBytes(6).toString('hex'),
      productId,
      userId,
      name,
      rating,
      comment,
      verifiedPurchase,
      createdAt: new Date().toISOString(),
    };

    unwrap(await supabase.from('candle_reviews').insert({
      id: review.id,
      product_id: review.productId,
      user_id: review.userId,
      name: review.name,
      rating: review.rating,
      comment: review.comment,
      verified_purchase: review.verifiedPurchase,
      created_at: review.createdAt,
    }));

    await recomputeProductRating(productId);

    res.status(201).json(review);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not submit review.' });
  }
});

app.post('/api/newsletter', async (req, res) => {
  try {
    const body = req.body || {};
    const email = sanitizeStr(body.email, 160).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const supabase = db.getClient();
    const existing = unwrap(await supabase.from('newsletter_subscribers').select('email').eq('email', email));
    const already = existing && existing.length > 0;
    if (!already) {
      unwrap(await supabase.from('newsletter_subscribers').insert({ email, subscribed_at: new Date().toISOString() }));
    }

    res.status(already ? 200 : 201).json({ code: 'WELCOME10', alreadySubscribed: already });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not subscribe.' });
  }
});

/* =========================================================
   LUMÉRA — customer accounts (JWT)
========================================================= */
function authOptional(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const payload = auth.verifyToken(header.slice(7));
    if (payload) req.user = payload;
  }
  next();
}
function authRequired(req, res, next) {
  authOptional(req, res, () => {
    if (!req.user) return res.status(401).json({ error: 'Please log in to continue.' });
    next();
  });
}

function mapUserRow(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body || {};
    const cleanName = sanitizeStr(name, 120);
    const cleanEmail = sanitizeStr(email, 160).toLowerCase();

    if (!cleanName || !cleanEmail || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Please fill in all fields.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const supabase = db.getClient();
    const existing = unwrap(await supabase.from('lumera_users').select('id').eq('email', cleanEmail));
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const { salt, hash } = db.hashPassword(password);
    const created = unwrap(
      await supabase.from('lumera_users').insert({ name: cleanName, email: cleanEmail, password_salt: salt, password_hash: hash, role: 'customer' }).select().single()
    );

    const user = mapUserRow(created);
    const token = auth.signToken(user, false);
    res.status(201).json({ token, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not create your account.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body || {};
    const cleanEmail = sanitizeStr(email, 160).toLowerCase();
    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'Please enter your email and password.' });
    }

    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('lumera_users').select('*').eq('email', cleanEmail));
    const userRow = rows && rows[0];
    if (!userRow || !db.verifyPassword(password, userRow.password_salt, userRow.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (userRow.active === false) {
      return res.status(403).json({ error: 'This account has been deactivated. Contact support.' });
    }

    const user = mapUserRow(userRow);
    const token = auth.signToken(user, !!rememberMe);
    res.json({ token, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not log you in.' });
  }
});

app.get('/api/auth/me', authRequired, async (req, res) => {
  try {
    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('lumera_users').select('*').eq('id', req.user.sub));
    const userRow = rows && rows[0];
    if (!userRow) return res.status(401).json({ error: 'Please log in to continue.' });
    res.json(mapUserRow(userRow));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.put('/api/auth/profile', authRequired, async (req, res) => {
  try {
    const name = sanitizeStr((req.body || {}).name, 120);
    const email = sanitizeStr((req.body || {}).email, 160).toLowerCase();
    if (!name || !email) return res.status(400).json({ error: 'Please provide your name and email.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

    const supabase = db.getClient();
    if (email !== req.user.email) {
      const existing = unwrap(await supabase.from('lumera_users').select('id').eq('email', email));
      if (existing && existing.length > 0) return res.status(409).json({ error: 'That email is already in use.' });
    }
    const updated = unwrap(await supabase.from('lumera_users').update({ name, email }).eq('id', req.user.sub).select().single());
    const user = mapUserRow(updated);
    const token = auth.signToken(user, false);
    res.json({ token, user });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update your profile.' });
  }
});

app.post('/api/auth/change-password', authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('lumera_users').select('*').eq('id', req.user.sub));
    const userRow = rows && rows[0];
    if (!currentPassword || !userRow || !db.verifyPassword(currentPassword, userRow.password_salt, userRow.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    const { salt, hash } = db.hashPassword(newPassword);
    unwrap(await supabase.from('lumera_users').update({ password_salt: salt, password_hash: hash }).eq('id', req.user.sub));
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

/* --- addresses --- */
function mapAddressRow(row) {
  return {
    id: row.id,
    label: row.label,
    fullName: row.full_name,
    phone: row.phone || '',
    addressLine: row.address_line,
    city: row.city,
    postcode: row.postcode,
    isDefault: row.is_default,
  };
}

app.get('/api/addresses', authRequired, async (req, res) => {
  try {
    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('addresses').select('*').eq('user_id', req.user.sub).order('is_default', { ascending: false }));
    res.json((rows || []).map(mapAddressRow));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.post('/api/addresses', authRequired, async (req, res) => {
  try {
    const b = req.body || {};
    const label = sanitizeStr(b.label, 40) || 'Home';
    const fullName = sanitizeStr(b.fullName, 120);
    const phone = sanitizeStr(b.phone, 30);
    const addressLine = sanitizeStr(b.addressLine, 300);
    const city = sanitizeStr(b.city, 80);
    const postcode = sanitizeStr(b.postcode, 20);
    if (!fullName || !addressLine || !city || !postcode) {
      return res.status(400).json({ error: 'Please fill in name, address, city and postcode.' });
    }

    const supabase = db.getClient();
    if (b.isDefault) {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', req.user.sub);
    }
    const created = unwrap(
      await supabase.from('addresses').insert({
        user_id: req.user.sub, label, full_name: fullName, phone, address_line: addressLine, city, postcode, is_default: !!b.isDefault,
      }).select().single()
    );
    res.status(201).json(mapAddressRow(created));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not save address.' });
  }
});

app.put('/api/addresses/:id', authRequired, async (req, res) => {
  try {
    const supabase = db.getClient();
    const existing = unwrap(await supabase.from('addresses').select('id').eq('id', req.params.id).eq('user_id', req.user.sub));
    if (!existing || existing.length === 0) return res.status(404).json({ error: 'Address not found.' });

    const b = req.body || {};
    const label = sanitizeStr(b.label, 40) || 'Home';
    const fullName = sanitizeStr(b.fullName, 120);
    const phone = sanitizeStr(b.phone, 30);
    const addressLine = sanitizeStr(b.addressLine, 300);
    const city = sanitizeStr(b.city, 80);
    const postcode = sanitizeStr(b.postcode, 20);
    if (!fullName || !addressLine || !city || !postcode) {
      return res.status(400).json({ error: 'Please fill in name, address, city and postcode.' });
    }

    if (b.isDefault) {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', req.user.sub);
    }
    const updated = unwrap(
      await supabase.from('addresses').update({
        label, full_name: fullName, phone, address_line: addressLine, city, postcode, is_default: !!b.isDefault,
      }).eq('id', req.params.id).select().single()
    );
    res.json(mapAddressRow(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update address.' });
  }
});

app.delete('/api/addresses/:id', authRequired, async (req, res) => {
  try {
    const supabase = db.getClient();
    const existing = unwrap(await supabase.from('addresses').select('id').eq('id', req.params.id).eq('user_id', req.user.sub));
    if (!existing || existing.length === 0) return res.status(404).json({ error: 'Address not found.' });
    unwrap(await supabase.from('addresses').delete().eq('id', req.params.id));
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not delete address.' });
  }
});

/* --- wishlist --- */
app.get('/api/wishlist', authRequired, async (req, res) => {
  try {
    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('wishlist_items').select('product_id').eq('user_id', req.user.sub));
    res.json((rows || []).map((r) => r.product_id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.post('/api/wishlist', authRequired, async (req, res) => {
  try {
    const productId = sanitizeStr((req.body || {}).productId, 60);
    if (!productId) return res.status(400).json({ error: 'Missing productId.' });
    const supabase = db.getClient();
    const { error } = await supabase.from('wishlist_items').insert({ user_id: req.user.sub, product_id: productId });
    if (error && error.code !== '23505') throw error; // ignore duplicate
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update wishlist.' });
  }
});

app.delete('/api/wishlist/:productId', authRequired, async (req, res) => {
  try {
    const supabase = db.getClient();
    unwrap(await supabase.from('wishlist_items').delete().eq('user_id', req.user.sub).eq('product_id', req.params.productId));
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update wishlist.' });
  }
});

/* --- my orders --- */
app.get('/api/my-orders', authRequired, async (req, res) => {
  try {
    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('candle_orders').select('*').eq('user_id', req.user.sub).order('created_at', { ascending: false }));
    res.json((rows || []).map(mapCandleOrderRow));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

/* --- discount validation (public) --- */
async function lookupDiscount(code) {
  if (!code) return null;
  const supabase = db.getClient();
  const rows = unwrap(await supabase.from('discounts').select('*').eq('code', code.toUpperCase()));
  const d = rows && rows[0];
  if (!d || !d.active) return null;
  if (d.expires_at && new Date(d.expires_at).getTime() < Date.now()) return null;
  if (d.usage_limit !== null && d.usage_limit !== undefined && d.used_count >= d.usage_limit) return null;
  return d;
}
function computeDiscountAmount(discount, subtotal) {
  if (!discount) return 0;
  const raw = discount.type === 'percentage' ? subtotal * (Number(discount.value) / 100) : Number(discount.value);
  return Math.max(0, Math.min(subtotal, Math.round(raw * 100) / 100));
}

app.get('/api/discounts/validate', async (req, res) => {
  try {
    const code = sanitizeStr(req.query.code, 30);
    const subtotal = Math.max(0, Number(req.query.subtotal) || 0);
    const discount = await lookupDiscount(code);
    if (!discount) return res.status(404).json({ error: 'That code is invalid or has expired.' });
    res.json({
      code: discount.code,
      type: discount.type,
      value: Number(discount.value),
      amount: computeDiscountAmount(discount, subtotal),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

/* =========================================================
   PAN AROMA — admin auth & product management
========================================================= */
const CATEGORY_LABELS = { candle: 'Candle', diffuser: 'Reed Diffuser', tealight: 'Tea Lights' };
const VALID_MOODS = new Set(['floral', 'fruity', 'fresh', 'spicy', 'cozy', 'calming']);
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

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

async function createSession(username) {
  const supabase = db.getClient();
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  unwrap(await supabase.from('admin_sessions').insert({ token, username, expires_at: expiresAt }));
  return token;
}

async function requireAdmin(req, res, next) {
  try {
    const cookies = parseCookies(req);
    const token = cookies['pa_admin_session'];
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('admin_sessions').select('*').eq('token', token));
    if (!rows || rows.length === 0) return res.status(401).json({ error: 'Not authenticated.' });

    const session = rows[0];
    if (Number(session.expires_at) < Date.now()) {
      await supabase.from('admin_sessions').delete().eq('token', token);
      return res.status(401).json({ error: 'Session expired.' });
    }
    req.adminUsername = session.username;
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
}

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('admin_users').select('*').eq('username', username));
    const admin = rows && rows[0];
    if (!admin || !db.verifyPassword(password, admin.salt, admin.hash)) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = await createSession(admin.username);
    res.cookie('pa_admin_session', token, { httpOnly: true, sameSite: 'lax', maxAge: SESSION_TTL_MS, path: '/' });
    res.json({ ok: true, username: admin.username });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong logging in.' });
  }
});

app.post('/api/admin/logout', async (req, res) => {
  try {
    const cookies = parseCookies(req);
    const token = cookies['pa_admin_session'];
    if (token) {
      const supabase = db.getClient();
      await supabase.from('admin_sessions').delete().eq('token', token);
    }
    res.clearCookie('pa_admin_session', { path: '/' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.get('/api/admin/me', async (req, res) => {
  try {
    const cookies = parseCookies(req);
    const token = cookies['pa_admin_session'];
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('admin_sessions').select('*').eq('token', token));
    if (!rows || rows.length === 0 || Number(rows[0].expires_at) < Date.now()) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    res.json({ username: rows[0].username });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.post('/api/admin/change-password', requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('admin_users').select('*').eq('username', req.adminUsername));
    const admin = rows && rows[0];
    if (!currentPassword || !admin || !db.verifyPassword(currentPassword, admin.salt, admin.hash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    const { salt, hash } = db.hashPassword(newPassword);
    unwrap(await supabase.from('admin_users').update({ salt, hash }).eq('username', admin.username));
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

function mapProductRow(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    categoryLabel: row.category_label,
    moods: row.moods,
    price: Number(row.price),
    salePrice: row.sale_price === null || row.sale_price === undefined ? null : Number(row.sale_price),
    burn: row.burn,
    notes: row.notes,
    blurb: row.blurb,
    description: row.description || '',
    color: row.color,
    stock: Number(row.stock),
    sku: row.sku || null,
    featured: !!row.featured,
    waxType: row.wax_type || 'Soy & Coconut Wax Blend',
    size: row.size || '220g',
    rating: Number(row.rating || 0),
    ratingCount: Number(row.rating_count || 0),
    createdAt: row.created_at,
    imageUrl: row.image_url || null,
  };
}

app.get('/api/candle-products', async (req, res) => {
  try {
    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('candle_products').select('*').order('name', { ascending: true }));
    res.json((rows || []).map(mapProductRow));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

function validateProductPayload(body) {
  const name = sanitizeStr(body.name, 120);
  const category = sanitizeStr(body.category, 20);
  const blurb = sanitizeStr(body.blurb, 300);
  const description = sanitizeStr(body.description, 2000);
  const burn = sanitizeStr(body.burn, 120);
  const color = /^#[0-9A-Fa-f]{6}$/.test(body.color) ? body.color : '#B8692A';
  const price = Number(body.price);
  const salePriceRaw = body.salePrice === '' || body.salePrice === null || body.salePrice === undefined ? null : Number(body.salePrice);
  const stock = Math.round(Number(body.stock));
  const sku = sanitizeStr(body.sku, 60) || null;
  const featured = !!body.featured;
  const waxType = sanitizeStr(body.waxType, 80) || 'Soy & Coconut Wax Blend';
  const size = sanitizeStr(body.size, 40) || '220g';
  const imageUrl = sanitizeStr(body.imageUrl, 500) || null;
  const notes = body.notes || {};
  const top = sanitizeStr(notes.top, 80);
  const mid = sanitizeStr(notes.mid, 80);
  const base = sanitizeStr(notes.base, 80);
  const moods = Array.isArray(body.moods) ? body.moods.filter((m) => VALID_MOODS.has(m)) : [];

  if (!name || !blurb || !burn || !top || !mid || !base) {
    return { error: 'Please fill in name, blurb, usage info and all three scent notes.' };
  }
  if (!CATEGORY_LABELS[category]) return { error: 'Invalid category.' };
  if (!Number.isFinite(price) || price <= 0) return { error: 'Price must be a positive number.' };
  if (salePriceRaw !== null && (!Number.isFinite(salePriceRaw) || salePriceRaw <= 0 || salePriceRaw >= price)) {
    return { error: 'Sale price must be a positive number lower than the regular price.' };
  }
  if (!Number.isFinite(stock) || stock < 0) return { error: 'Stock must be a non-negative number.' };
  if (moods.length === 0) return { error: 'Select at least one mood.' };

  return {
    fields: {
      name, category, categoryLabel: CATEGORY_LABELS[category], moods,
      price: Math.round(price * 100) / 100,
      salePrice: salePriceRaw === null ? null : Math.round(salePriceRaw * 100) / 100,
      burn, notes: { top, mid, base }, blurb, description, color, stock, sku, featured, waxType, size, imageUrl,
    },
  };
}

app.post('/api/admin/candle-products', requireAdmin, async (req, res) => {
  try {
    const { error, fields } = validateProductPayload(req.body || {});
    if (error) return res.status(400).json({ error });

    const supabase = db.getClient();
    const existingRows = unwrap(await supabase.from('candle_products').select('id'));
    const existingIds = new Set((existingRows || []).map((r) => r.id));

    let id = slugify(fields.name);
    const baseId = id;
    let i = 2;
    while (existingIds.has(id)) {
      id = `${baseId}-${i}`;
      i++;
    }

    unwrap(await supabase.from('candle_products').insert({
      id,
      name: fields.name,
      category: fields.category,
      category_label: fields.categoryLabel,
      moods: fields.moods,
      price: fields.price,
      sale_price: fields.salePrice,
      burn: fields.burn,
      notes: fields.notes,
      blurb: fields.blurb,
      description: fields.description,
      color: fields.color,
      stock: fields.stock,
      sku: fields.sku,
      featured: fields.featured,
      wax_type: fields.waxType,
      size: fields.size,
      image_url: fields.imageUrl,
    }));

    res.status(201).json({ id, ...fields });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not save product.' });
  }
});

app.put('/api/admin/candle-products/:id', requireAdmin, async (req, res) => {
  try {
    const supabase = db.getClient();
    const existing = unwrap(await supabase.from('candle_products').select('id').eq('id', req.params.id));
    if (!existing || existing.length === 0) return res.status(404).json({ error: 'Product not found.' });

    const { error, fields } = validateProductPayload(req.body || {});
    if (error) return res.status(400).json({ error });

    unwrap(await supabase.from('candle_products').update({
      name: fields.name,
      category: fields.category,
      category_label: fields.categoryLabel,
      moods: fields.moods,
      price: fields.price,
      sale_price: fields.salePrice,
      burn: fields.burn,
      notes: fields.notes,
      blurb: fields.blurb,
      description: fields.description,
      color: fields.color,
      stock: fields.stock,
      sku: fields.sku,
      featured: fields.featured,
      wax_type: fields.waxType,
      size: fields.size,
      image_url: fields.imageUrl,
    }).eq('id', req.params.id));

    res.json({ id: req.params.id, ...fields });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update product.' });
  }
});

app.delete('/api/admin/candle-products/:id', requireAdmin, async (req, res) => {
  try {
    const supabase = db.getClient();
    const existing = unwrap(await supabase.from('candle_products').select('id').eq('id', req.params.id));
    if (!existing || existing.length === 0) return res.status(404).json({ error: 'Product not found.' });

    unwrap(await supabase.from('candle_products').delete().eq('id', req.params.id));
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not delete product.' });
  }
});

/* =========================================================
   LUMÉRA — admin dashboard: stats, orders, customers,
   discounts, review moderation, image upload
========================================================= */
app.post('/api/admin/upload-image', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided.' });
    if (!req.file.mimetype.startsWith('image/')) return res.status(400).json({ error: 'File must be an image.' });

    const supabase = db.getClient();
    const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const filename = `${crypto.randomBytes(10).toString('hex')}.${ext}`;

    const { error } = await supabase.storage.from('product-images').upload(filename, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });
    if (error) throw error;

    const { data } = supabase.storage.from('product-images').getPublicUrl(filename);
    res.status(201).json({ url: data.publicUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not upload image.' });
  }
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const supabase = db.getClient();
    const [ordersRes, productsRes, usersRes] = await Promise.all([
      supabase.from('candle_orders').select('*'),
      supabase.from('candle_products').select('id,name,stock'),
      supabase.from('lumera_users').select('id'),
    ]);
    const orders = unwrap(ordersRes);
    const products = unwrap(productsRes);
    const users = unwrap(usersRes);

    const totalSales = orders.reduce((s, o) => s + Number(o.total), 0);
    const lowStockProducts = products
      .filter((p) => Number(p.stock) <= 10)
      .sort((a, b) => Number(a.stock) - Number(b.stock))
      .map((p) => ({ id: p.id, name: p.name, stock: Number(p.stock) }));
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 6)
      .map(mapCandleOrderRow);

    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const byDay = {};
    days.forEach((d) => (byDay[d] = { date: d, sales: 0, orders: 0 }));
    orders.forEach((o) => {
      const day = String(o.created_at).slice(0, 10);
      if (byDay[day]) {
        byDay[day].sales += Number(o.total);
        byDay[day].orders += 1;
      }
    });
    const salesOverTime = days.map((d) => ({ ...byDay[d], sales: Math.round(byDay[d].sales * 100) / 100 }));

    const qtyMap = {};
    orders.forEach((o) => (o.items || []).forEach((i) => { qtyMap[i.id] = (qtyMap[i.id] || 0) + i.qty; }));
    const bestSelling = Object.entries(qtyMap)
      .map(([id, qty]) => {
        const p = products.find((pr) => pr.id === id);
        return { id, name: p ? p.name : id, qty };
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    res.json({
      totalSales: Math.round(totalSales * 100) / 100,
      totalOrders: orders.length,
      totalCustomers: users.length,
      totalProducts: products.length,
      lowStockProducts,
      recentOrders,
      salesOverTime,
      bestSelling,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('candle_orders').select('*').order('created_at', { ascending: false }));
    res.json((rows || []).map(mapCandleOrderRow));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

const ORDER_STATUSES = new Set(['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled']);

app.put('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const status = sanitizeStr((req.body || {}).status, 20);
    if (!ORDER_STATUSES.has(status)) return res.status(400).json({ error: 'Invalid status.' });

    const supabase = db.getClient();
    const existing = unwrap(await supabase.from('candle_orders').select('id').eq('id', req.params.id));
    if (!existing || existing.length === 0) return res.status(404).json({ error: 'Order not found.' });

    const updated = unwrap(await supabase.from('candle_orders').update({ status }).eq('id', req.params.id).select().single());
    res.json(mapCandleOrderRow(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update order.' });
  }
});

app.get('/api/admin/customers', requireAdmin, async (req, res) => {
  try {
    const supabase = db.getClient();
    const users = unwrap(await supabase.from('lumera_users').select('id,name,email,created_at,active'));
    const orders = unwrap(await supabase.from('candle_orders').select('user_id,total'));

    const list = (users || []).map((u) => {
      const userOrders = (orders || []).filter((o) => o.user_id === u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.created_at,
        active: u.active,
        orderCount: userOrders.length,
        totalSpent: Math.round(userOrders.reduce((s, o) => s + Number(o.total), 0) * 100) / 100,
      };
    });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.put('/api/admin/customers/:id/active', requireAdmin, async (req, res) => {
  try {
    const active = !!(req.body || {}).active;
    const supabase = db.getClient();
    unwrap(await supabase.from('lumera_users').update({ active }).eq('id', req.params.id));
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update customer.' });
  }
});

function mapDiscountRow(d) {
  return {
    id: d.id,
    code: d.code,
    type: d.type,
    value: Number(d.value),
    expiresAt: d.expires_at,
    usageLimit: d.usage_limit === null || d.usage_limit === undefined ? null : Number(d.usage_limit),
    usedCount: Number(d.used_count),
    active: d.active,
  };
}

app.get('/api/admin/discounts', requireAdmin, async (req, res) => {
  try {
    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('discounts').select('*').order('created_at', { ascending: false }));
    res.json((rows || []).map(mapDiscountRow));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.post('/api/admin/discounts', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const code = sanitizeStr(b.code, 30).toUpperCase();
    const type = b.type === 'fixed' ? 'fixed' : 'percentage';
    const value = Number(b.value);
    if (!code) return res.status(400).json({ error: 'Please enter a code.' });
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'Value must be a positive number.' });
    if (type === 'percentage' && value > 100) return res.status(400).json({ error: 'Percentage discounts cannot exceed 100.' });

    const supabase = db.getClient();
    const created = unwrap(
      await supabase.from('discounts').insert({
        code,
        type,
        value,
        expires_at: b.expiresAt || null,
        usage_limit: b.usageLimit ? Number(b.usageLimit) : null,
        active: b.active !== false,
      }).select().single()
    );
    res.status(201).json(mapDiscountRow(created));
  } catch (e) {
    if (e && e.code === '23505') return res.status(409).json({ error: 'That code already exists.' });
    console.error(e);
    res.status(500).json({ error: 'Could not create discount.' });
  }
});

app.put('/api/admin/discounts/:id', requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const value = Number(b.value);
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'Value must be a positive number.' });

    const supabase = db.getClient();
    const updated = unwrap(
      await supabase.from('discounts').update({
        type: b.type === 'fixed' ? 'fixed' : 'percentage',
        value,
        expires_at: b.expiresAt || null,
        usage_limit: b.usageLimit ? Number(b.usageLimit) : null,
        active: !!b.active,
      }).eq('id', req.params.id).select().single()
    );
    res.json(mapDiscountRow(updated));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update discount.' });
  }
});

app.delete('/api/admin/discounts/:id', requireAdmin, async (req, res) => {
  try {
    const supabase = db.getClient();
    unwrap(await supabase.from('discounts').delete().eq('id', req.params.id));
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not delete discount.' });
  }
});

app.get('/api/admin/reviews', requireAdmin, async (req, res) => {
  try {
    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('candle_reviews').select('*').order('created_at', { ascending: false }));
    res.json((rows || []).map(mapReviewRow));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.put('/api/admin/reviews/:id/hidden', requireAdmin, async (req, res) => {
  try {
    const hidden = !!(req.body || {}).hidden;
    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('candle_reviews').select('product_id').eq('id', req.params.id));
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Review not found.' });

    unwrap(await supabase.from('candle_reviews').update({ hidden }).eq('id', req.params.id));
    await recomputeProductRating(rows[0].product_id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update review.' });
  }
});

app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const supabase = db.getClient();
    const rows = unwrap(await supabase.from('candle_reviews').select('product_id').eq('id', req.params.id));
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Review not found.' });

    unwrap(await supabase.from('candle_reviews').delete().eq('id', req.params.id));
    await recomputeProductRating(rows[0].product_id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not delete review.' });
  }
});

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found.' });
  }
  const indexPath = path.join(__dirname, 'lumera-web', 'dist', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('LUMÉRA frontend not built yet. In dev, run the lumera-web Vite server separately (npm run dev). In production, run `npm run build` in lumera-web/ first.');
    }
  });
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`LUMÉRA API running at http://localhost:${PORT}`);
  });
}
