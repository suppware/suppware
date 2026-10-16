const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const items = db.prepare(`
    SELECT ci.*, p.name, p.price, p.image, p.stock
    FROM cart_items ci JOIN products p ON ci.product_id = p.id
    WHERE ci.user_id = ?
  `).all(req.user.id);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  res.json({ items, total });
});

router.post('/items', auth, (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(product_id);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
  if (product.stock < quantity) return res.status(400).json({ error: 'Stock insuficiente' });
  db.prepare(`INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)
    ON CONFLICT DO UPDATE SET quantity = quantity + ?
  `).run(req.user.id, product_id, quantity, quantity);
  res.json({ ok: true });
});

router.put('/items/:id', auth, (req, res) => {
  const { quantity } = req.body;
  db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?')
    .run(quantity, req.params.id, req.user.id);
  res.json({ ok: true });
});

router.delete('/items/:id', auth, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

router.delete('/', auth, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

module.exports = router;   