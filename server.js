const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { init, run, get, all } = require('./db');

init();

const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  // Rate limiters
  const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many order attempts. Try again later.' }
  });
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Try again later.' }
  });

  // ---- API: Products ----
  app.get('/api/products', (req, res) => {
    try {
      const rows = all('SELECT * FROM products WHERE active = 1 ORDER BY size');
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'Could not load products.' });
    }
  });

  // ---- API: Promo validate ----
  app.post('/api/promo/validate', (req, res) => {
    try {
      const { code } = req.body || {};
      if (!code) return res.status(400).json({ error: 'Promo code required.', field: 'code' });
      const row = get('SELECT * FROM promo_codes WHERE code = ? AND active = 1', [code.toUpperCase()]);
      if (!row) return res.status(400).json({ error: 'Invalid promo code.', field: 'code' });
      res.json({ valid: true, code: row.code, discount_percent: row.discount_percent });
    } catch (e) {
      res.status(500).json({ error: 'Promo check failed.' });
    }
  });

  // ---- API: Delivery estimate ----
  app.get('/api/delivery', (req, res) => {
    try {
      const { pin } = req.query;
      if (!pin || !/^\d{6}$/.test(pin)) {
        return res.status(400).json({ error: 'Enter a valid 6-digit PIN code.', field: 'pin' });
      }
      const metro = ['110001','400001','560001','600001','700001','500001'];
      const days = metro.includes(pin) ? '3-5 days' : '5-8 days';
      res.json({ pin, estimated_days: days, free_delivery_threshold: 3000 });
    } catch (e) {
      res.status(500).json({ error: 'Delivery check failed.' });
    }
  });

  // ---- API: Server-side cart price ----
  app.post('/api/cart/price', (req, res) => {
    try {
      const { items, promo } = req.body || {};
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items required.' });
      }
      let subtotal = 0;
      const validated = [];
      for (const it of items) {
        const product = get('SELECT * FROM products WHERE slug = ? AND active = 1', [it.slug]);
        if (!product) continue;
        const qty = Math.min(Math.max(parseInt(it.quantity, 10) || 1, 1), 10);
        const lineTotal = product.price * qty;
        subtotal += lineTotal;
        validated.push({ slug: product.slug, name: product.name, size: product.size, quantity: qty, unit_price: product.price, total: lineTotal });
      }
      let discount = 0;
      if (promo) {
        const row = get('SELECT * FROM promo_codes WHERE code = ? AND active = 1', [promo.toUpperCase()]);
        if (row) discount = Math.round(subtotal * row.discount_percent / 100);
      }
      const deliveryFee = subtotal >= 3000 ? 0 : 99;
      const total = subtotal - discount + deliveryFee;
      res.json({ items: validated, subtotal, discount, delivery_fee: deliveryFee, total });
    } catch (e) {
      res.status(500).json({ error: 'Price calculation failed.' });
    }
  });

  // ---- API: Create order ----
  app.post('/api/orders', orderLimiter, (req, res) => {
    try {
      const {
        customer_name, email, phone, address_line1, address_line2,
        city, state, pin, dog_name, dog_size, delivery_notes,
        payment_method, items, promo, subtotal, discount, delivery_fee, total
      } = req.body || {};

      const required = { customer_name, email, phone, address_line1, city, state, pin, payment_method };
      for (const [k, v] of Object.entries(required)) {
        if (!v || String(v).trim() === '') {
          return res.status(400).json({ error: `${k} is required.`, field: k });
        }
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email.', field: 'email' });
      }
      if (!/^\d{10}$/.test(phone.replace(/\s/g, ''))) {
        return res.status(400).json({ error: 'Enter a valid 10-digit mobile number.', field: 'phone' });
      }
      if (!/^\d{6}$/.test(pin)) {
        return res.status(400).json({ error: 'Enter a valid 6-digit PIN.', field: 'pin' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty.', field: 'items' });
      }

      let serverSubtotal = 0;
      const orderItems = [];
      for (const it of items) {
        const product = get('SELECT * FROM products WHERE slug = ? AND active = 1', [it.slug]);
        if (!product) continue;
        const qty = Math.min(Math.max(parseInt(it.quantity, 10) || 1, 1), 10);
        const lineTotal = product.price * qty;
        serverSubtotal += lineTotal;
        orderItems.push({ ...product, quantity: qty, unit_price: product.price, total: lineTotal });
      }
      let serverDiscount = 0;
      if (promo) {
        const row = get('SELECT * FROM promo_codes WHERE code = ? AND active = 1', [promo.toUpperCase()]);
        if (row) serverDiscount = Math.round(serverSubtotal * row.discount_percent / 100);
      }
      const serverDelivery = serverSubtotal >= 3000 ? 0 : 99;
      const serverTotal = serverSubtotal - serverDiscount + serverDelivery;

      const orderNumber = `HC-${new Date().getFullYear()}-${String(Math.floor(10000 + Math.random() * 90000))}`;

      const insertRes = run(
        `INSERT INTO orders (order_number, customer_name, email, phone, address_line1, address_line2, city, state, pin, dog_name, dog_size, delivery_notes, payment_method, subtotal, discount, delivery_fee, total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderNumber, customer_name.trim(), email.trim(), phone.trim(),
         address_line1.trim(), address_line2 ? address_line2.trim() : null,
         city.trim(), state.trim(), pin.trim(),
         dog_name ? dog_name.trim() : null, dog_size ? dog_size.trim() : null,
         delivery_notes ? delivery_notes.trim() : null, payment_method,
         serverSubtotal, serverDiscount, serverDelivery, serverTotal]
      );
      const orderId = insertRes.meta.last_insert_rowid;

      for (const it of orderItems) {
        run('INSERT INTO order_items (order_id, product_slug, size, disc_level, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [orderId, it.slug, it.size, it.disc_level || null, it.quantity, it.unit_price, it.total]);
      }

      run('INSERT INTO order_status_history (order_id, status) VALUES (?, ?)', [orderId, 'Placed']);

      res.json({ success: true, order_number: orderNumber, total: serverTotal });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Order could not be placed. Try again.' });
    }
  });

  // ---- API: Get order ----
  app.get('/api/orders/:orderNumber', (req, res) => {
    try {
      const order = get('SELECT * FROM orders WHERE order_number = ?', [req.params.orderNumber]);
      if (!order) return res.status(404).json({ error: 'Order not found.' });
      const items = all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      const history = all('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY changed_at ASC', [order.id]);
      res.json({ ...order, items, history });
    } catch (e) {
      res.status(500).json({ error: 'Could not load order.' });
    }
  });

  // ---- API: Track ----
  app.post('/api/track', (req, res) => {
    try {
      const { order_number, email } = req.body || {};
      if (!order_number || !email) {
        return res.status(400).json({ error: 'Order number and email required.' });
      }
      const order = get('SELECT * FROM orders WHERE order_number = ? AND email = ?', [order_number, email]);
      if (!order) return res.status(404).json({ error: 'No order matches those details.' });
      const history = all('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY changed_at ASC', [order.id]);
      res.json({ ...order, history });
    } catch (e) {
      res.status(500).json({ error: 'Tracking lookup failed.' });
    }
  });

  // ---- API: Newsletter ----
  app.post('/api/newsletter', (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email.', field: 'email' });
      }
      run('INSERT OR IGNORE INTO newsletter (email) VALUES (?)', [email.trim().toLowerCase()]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Signup failed.' });
    }
  });

  // ---- Admin ----
  app.post('/api/admin/login', loginLimiter, (req, res) => {
    try {
      const { password } = req.body || {};
      if (password === process.env.ADMIN_PASSWORD) {
        res.json({ success: true, token: 'admin-' + Date.now() });
      } else {
        res.status(401).json({ error: 'Incorrect password.' });
      }
    } catch (e) {
      res.status(500).json({ error: 'Login failed.' });
    }
  });

  app.get('/api/admin/orders', (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth || auth !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
        return res.status(401).json({ error: 'Unauthorized.' });
      }
      const orders = all('SELECT * FROM orders ORDER BY created_at DESC');
      res.json(orders);
    } catch (e) {
      res.status(500).json({ error: 'Could not load orders.' });
    }
  });

  app.patch('/api/admin/orders/:id/status', (req, res) => {
    try {
      const auth = req.headers.authorization;
      if (!auth || auth !== `Bearer ${process.env.ADMIN_PASSWORD}`) {
        return res.status(401).json({ error: 'Unauthorized.' });
      }
      const { status } = req.body || {};
      if (!['Placed', 'Packed', 'Shipped', 'Delivered'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
      }
      run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
      run(`INSERT INTO order_status_history (order_id, status) VALUES (?, ?)`, [req.params.id, status]);
      res.json({ success: true, status });
    } catch (e) {
      res.status(500).json({ error: 'Update failed.' });
    }
  });

  // 404 for API
  app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));

  // Serve HTML pages
  const PAGES = ['index.html','shop.html','demo.html','subscription.html','cart.html','checkout.html','confirmation.html','track.html','faq.html','admin.html','404.html'];
  app.get(['/','/index.html'], (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
  app.get('/:page.html', (req, res) => {
    const page = req.params.page + '.html';
    if (PAGES.includes(page)) {
      res.sendFile(path.join(__dirname, 'public', page));
    } else {
      res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
  });
  app.get('*', (req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

  app.listen(PORT, () => {
    console.log(`HuntClock server running on http://localhost:${PORT}`);
  });
