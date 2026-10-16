const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/validate', auth, (req, res) => {
  const { code, cart_total } = req.body;
  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(code);
  if (!coupon) return res.status(404).json({ error: 'Cupón inválido' });
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return res.status(400).json({ error: 'Cupón expirado' });
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return res.status(400).json({ error: 'Cupón agotado' });
  if (cart_total < coupon.min_purchase) return res.status(400).json({ error: `Mínimo de compra: $${coupon.min_purchase}` });
  const discount = coupon.type === 'percent' ? cart_total * (coupon.value / 100) : coupon.value;
  res.json({ valid: true, discount, type: coupon.type, value: coupon.value });
});

module.exports = router;   