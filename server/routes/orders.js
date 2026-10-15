const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, (req, res) => {
  const { address, city, shipping_method, notes, coupon_code, points_to_use } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const cart = db.prepare(`
    SELECT ci.*, p.name, p.price, p.stock FROM cart_items ci
    JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?
  `).all(req.user.id);

  if (cart.length === 0) return res.status(400).json({ error: 'Carrito vacío' });

  let total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  let discount = 0;

  let wholesaleDiscount = 0;
  if (user.role === 'wholesale' && total >= 2000) {
  wholesaleDiscount = total * 0.10;
  }   

  // Aplicar cupón
  if (coupon_code) {
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(coupon_code);
    if (coupon) {
      if (total >= coupon.min_purchase) {
        discount = coupon.type === 'percent' ? total * (coupon.value / 100) : coupon.value;
        db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(coupon.id);
      }
    }
  }

  // Aplicar puntos (100 puntos = $10 MXN)
  let pointsUsed = 0;
  if (points_to_use > 0 && user.points >= points_to_use) {
    const pointsDiscount = points_to_use * 0.10;
    discount += pointsDiscount;
    pointsUsed = points_to_use;
    db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(points_to_use, req.user.id);
    db.prepare('INSERT INTO points_history (user_id, points, reason, order_id) VALUES (?, ?, ?, ?)')
      .run(req.user.id, -points_to_use, 'Uso en compra', 0);
  }

  const finalTotal = Math.max(0, total - discount - wholesaleDiscount);

  // Crear orden
  const orderInfo = db.prepare(`INSERT INTO orders (user_id, total, discount, points_used, address, city, shipping_method, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`).run(req.user.id, finalTotal, discount, pointsUsed, address, city || 'Torreón', shipping_method || 'local', notes || '');
  const orderId = orderInfo.lastInsertRowid;

  // Items
  const insertItem = db.prepare('INSERT INTO order_items (order_id, product_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)');
  const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
  db.exec('BEGIN');
try {
  cart.forEach(item => {
    insertItem.run(orderId, item.product_id, item.name, item.price, item.quantity);
    updateStock.run(item.quantity, item.product_id);
  });
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
  db.exec('COMMIT');
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
}

  // Ganar puntos (1 punto por cada $10 gastado)
  const earnedPoints = Math.floor(finalTotal / 10);
  db.prepare('UPDATE users SET points = points + ?, total_spent = total_spent + ? WHERE id = ?')
    .run(earnedPoints, finalTotal, req.user.id);
  db.prepare('INSERT INTO points_history (user_id, points, reason, order_id) VALUES (?, ?, ?, ?)')
    .run(req.user.id, earnedPoints, 'Compra', orderId);

  res.json({ order_id: orderId, total: finalTotal, discount, points_earned: earnedPoints });
});

router.get('/', auth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  orders.forEach(o => {
    o.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(o.id);
  });
  res.json(orders);
});

router.get('/:id', auth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'No encontrado' });
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json(order);
}); 

module.exports = router;   