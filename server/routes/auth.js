const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../db');
const { auth } = require('../middleware/auth');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const router = express.Router();

const transporter = nodemailer.createTransport({
  host: 'in-v3.mailjet.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAILJET_API_KEY,
    pass: process.env.MAILJET_SECRET_KEY
  }
});

// ─── ENVIAR EMAIL DE VERIFICACIÓN ─────────────────────────
async function sendVerificationEmail(name, email, token) {
  const verifyUrl = `http://localhost:3000/verify.html?token=${token}`;
  await transporter.sendMail({
  from: `"SUPP WARE" <${process.env.MAILJET_SENDER}>`,
    to: email,
    subject: 'Verifica tu cuenta - SUPP WARE',
    html: `
      <div style="font-family:Arial,sans-serif; max-width:500px; margin:0 auto; padding:40px 20px;">
        <h1 style="font-size:24px; color:#0a0a0f; margin-bottom:8px;">SUPP WARE</h1>
        <p style="color:#666; margin-bottom:24px;">Hola ${name},</p>
        <p style="color:#333; margin-bottom:24px;">Casi listo. Haz clic en el botón para verificar tu correo y activar tu cuenta:</p>
        <a href="${verifyUrl}" style="display:inline-block; background:#ff6600; color:#fff; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:16px;">Verificar mi correo</a>
        <p style="color:#999; font-size:12px; margin-top:32px;">Si no funcionó, copia este enlace en tu navegador:<br>${verifyUrl}</p>
        <p style="color:#999; font-size:12px; margin-top:16px;">Este enlace expira en 24 horas.</p>
      </div>
    `
  });
}

// ─── REGISTER ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, phone, password, address, city } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Faltan campos' });
  if (password.length < 8) return res.status(400).json({ error: 'Contraseña mínima 8 caracteres' });

  try {
    const hash = bcrypt.hashSync(password, 12);
    const token = crypto.randomBytes(32).toString('hex');

    db.prepare('INSERT INTO users (name, email, phone, password, address, city, verify_token, verified) VALUES (?, ?, ?, ?, ?, ?, ?, 0)')
      .run(name, email, phone || '', hash, address || '', city || 'Torreón', token);

    await sendVerificationEmail(name, email, token);

    res.json({ ok: true, message: 'Revisa tu correo para verificar tu cuenta' });

  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email ya registrado' });
    console.error(e);
    res.status(500).json({ error: 'Error al registrarse. Intenta de nuevo.' });
  }
});

// ─── VERIFY ───────────────────────────────────────────────
router.get('/verify', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token inválido' });

  const user = db.prepare('SELECT * FROM users WHERE verify_token = ? AND verified = 0').get(token);
  if (!user) return res.status(400).json({ error: 'Token inválido o ya verificado' });

  db.prepare('UPDATE users SET verified = 1, verify_token = NULL WHERE id = ?').run(user.id);
  res.json({ ok: true, message: 'Correo verificado. Ya puedes iniciar sesión.' });
});

// ─── LOGIN ────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  if (!user.verified) {
    return res.status(403).json({ error: 'Verifica tu correo antes de iniciar sesión' });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, points: user.points, total_spent: user.total_spent, address: user.address, city: user.city } });
});

// ─── RESEND VERIFICATION ──────────────────────────────────
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND verified = 0').get(email);
  if (!user) return res.status(404).json({ error: 'No se encontró la cuenta o ya está verificada' });

  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('UPDATE users SET verify_token = ? WHERE id = ?').run(token, user.id);

  await sendVerificationEmail(user.name, email, token);

  res.json({ ok: true, message: 'Email de verificación reenviado' });
});

// ─── ME ───────────────────────────────────────────────────
router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, phone, role, points, total_spent, address, city FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ─── PROFILE ──────────────────────────────────────────────
router.put('/profile', auth, (req, res) => {
  const { name, phone, address, city } = req.body;
  db.prepare('UPDATE users SET name=?, phone=?, address=?, city=? WHERE id=?')
    .run(name, phone, address, city, req.user.id);
  res.json({ ok: true });
});

module.exports = router;      