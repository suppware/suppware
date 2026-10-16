const express = require('express');
const db = require('../db');
const { admin, owner } = require('../middleware/admin');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Upload
const uploadDir = path.join(__dirname, '..', '..', 'public', 'img', 'products');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 5 * 1024 * 1024 } });

// ─── DASHBOARD ────────────────────────────────────────────
router.get('/stats', admin, (req, res) => {
  const stats = {
    total_users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    total_products: db.prepare('SELECT COUNT(*) as c FROM products WHERE active = 1').get().c,
    total_orders: db.prepare('SELECT COUNT(*) as c FROM orders').get().c,
    revenue: db.prepare('SELECT COALESCE(SUM(total), 0) as r FROM orders WHERE status != "cancelled"').get().r,
    pending_orders: db.prepare('SELECT COUNT(*) as c FROM orders WHERE status = "pending"').get().c,
    low_stock: db.prepare('SELECT COUNT(*) as c FROM products WHERE stock < 5 AND active = 1').get().c
  };
  const recentOrders = db.prepare(`
    SELECT o.*, u.name as user_name FROM orders o JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC LIMIT 10
  `).all();
  res.json({ stats, recentOrders });
});

// ─── PRODUCTS CRUD ────────────────────────────────────────
router.get('/products', admin, (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC
  `).all();
  res.json(products);
});

router.post('/products', admin, upload.single('image'), (req, res) => {
  const { name, slug, description, price, old_price, stock, category_id, subcategory, brand, size, featured, active } = req.body;
  const image = req.file ? `/img/products/${req.file.filename}` : '';
  db.prepare(`INSERT INTO products (name, slug, description, price, old_price, stock, image, category_id, subcategory, brand, size, featured, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(name, slug, description, price, old_price || null, stock, image, category_id, subcategory || null, brand || null, size || null, Number(featured) === 1 ? 1 : 0, Number(active) === 1 ? 1 : 0);
  res.json({ ok: true });
});

router.put('/products/:id', admin, upload.single('image'), (req, res) => {
  const { name, slug, description, price, old_price, stock, category_id, subcategory, brand, size, featured, active } = req.body;
  const existing = db.prepare('SELECT image FROM products WHERE id = ?').get(req.params.id);
  const image = req.file ? `/img/products/${req.file.filename}` : existing?.image || '';
  db.prepare(`UPDATE products SET name=?, slug=?, description=?, price=?, old_price=?, stock=?, image=?, category_id=?, subcategory=?, brand=?, size=?, featured=?, active=? WHERE id=?`)
    .run(name, slug, description, price, old_price || null, stock, image, category_id, subcategory || null, brand || null, size || null, Number(featured) === 1 ? 1 : 0, Number(active) === 1 ? 1 : 0, req.params.id);   
});

router.delete('/products/:id', admin, (req, res) => {
  db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.delete('/products/:id/permanent', admin, (req, res) => {
  const id = req.params.id;
  db.prepare('DELETE FROM cart_items WHERE product_id = ?').run(id);
  db.prepare('DELETE FROM order_items WHERE product_id = ?').run(id);
  db.prepare('DELETE FROM reviews WHERE product_id = ?').run(id);
  db.prepare('DELETE FROM wishlist WHERE product_id = ?').run(id);
  db.prepare('DELETE FROM products WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ─── ORDERS ───────────────────────────────────────────────
router.get('/orders', admin, (req, res) => {
  const { status } = req.query;
  let sql = `SELECT o.*, u.name as user_name, u.email as user_email, u.phone as user_phone
    FROM orders o JOIN users u ON o.user_id = u.id`;
  if (status) sql += ` WHERE o.status = ?`;
  sql += ' ORDER BY o.created_at DESC';
  const orders = db.prepare(sql).all(...(status ? [status] : []));
  orders.forEach(o => { o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id); });
  res.json(orders);
});

router.put('/orders/:id/status', admin, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// ─── USERS ────────────────────────────────────────────────
router.get('/users', admin, (req, res) => {
  const users = db.prepare('SELECT id, name, email, phone, role, points, total_spent, city, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

router.put('/users/:id/role', owner, (req, res) => {
  const { role } = req.body;
  const allowed = ['customer', 'wholesale', 'admin', 'owner'];
  if (!allowed.includes(role)) return res.status(400).json({ error: 'Rol inválido' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ ok: true });
});

router.put('/users/:id/points', owner, (req, res) => {
  const { points, reason } = req.body;
  if (typeof points !== 'number' || points === 0) return res.status(400).json({ error: 'Puntos inválidos' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (user.points + points < 0) return res.status(400).json({ error: 'No puede quedar en negativo' });
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(points, req.params.id);
  db.prepare('INSERT INTO points_history (user_id, points, reason) VALUES (?, ?, ?)').run(req.params.id, points, reason || 'Ajuste manual');
  res.json({ ok: true, new_points: user.points + points });
});

// ─── COUPONS ──────────────────────────────────────────────
router.get('/coupons', admin, (req, res) => {
  res.json(db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all());
});

router.post('/coupons', admin, (req, res) => {
  const { code, type, value, min_purchase, max_uses, expires_at } = req.body;
  db.prepare('INSERT INTO coupons (code, type, value, min_purchase, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(code.toUpperCase(), type, value, min_purchase || 0, max_uses || null, expires_at || null);
  res.json({ ok: true });
});

router.delete('/coupons/:id', admin, (req, res) => {
  db.prepare('UPDATE coupons SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── CATEGORIES ───────────────────────────────────────────
router.get('/categories', admin, (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

router.post('/categories', admin, (req, res) => {
  const { name, slug, parent_id } = req.body;
  db.prepare('INSERT INTO categories (name, slug, parent_id) VALUES (?, ?, ?)').run(name, slug, parent_id || null);
  res.json({ ok: true });
});

module.exports = router;    