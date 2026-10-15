const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { auth } = require('../middleware/auth');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const router = express.Router();

router.post('/register', (req, res) => {
  const { name, email, phone, password, address, city } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Faltan campos' });
  try {
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('INSERT INTO users (name, email, phone, password, address, city) VALUES (?, ?, ?, ?, ?, ?)')
      .run(name, email, phone || '', hash, address || '', city || 'Torreón');
    const user = db.prepare('SELECT id, name, email, phone, role, points, total_spent FROM users WHERE email = ?').get(email);
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });
    res.json({ token, user });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email ya registrado' });
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, points: user.points, total_spent: user.total_spent } });
});

router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, phone, role, points, total_spent, address, city FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

router.put('/profile', auth, (req, res) => {
  const { name, phone, address, city } = req.body;
  db.prepare('UPDATE users SET name=?, phone=?, address=?, city=? WHERE id=?')
    .run(name, phone, address, city, req.user.id);
  res.json({ ok: true });
});

module.exports = router;   