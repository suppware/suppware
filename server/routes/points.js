const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const user = db.prepare('SELECT points, total_spent FROM users WHERE id = ?').get(req.user.id);
  const history = db.prepare('SELECT * FROM points_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json({ points: user.points, total_spent: user.total_spent, history });
});

module.exports = router;   