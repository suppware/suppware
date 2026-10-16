const express = require('express');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Rutas literales PRIMERO
router.get('/categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories WHERE parent_id IS NULL ORDER BY name').all();
  const subcats = db.prepare('SELECT * FROM categories WHERE parent_id IS NOT NULL ORDER BY name').all();
  const tree = cats.map(c => ({ ...c, children: subcats.filter(s => s.parent_id === c.id) }));
  res.json(tree);
});

router.get('/featured', (req, res) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name FROM products p JOIN categories c ON p.category_id = c.id
    WHERE p.featured = 1 AND p.active = 1 LIMIT 8
  `).all();
  res.json(products);
});

// Ruta genérica
router.get('/', (req, res) => {
  const { search, category, subcategory, brand, min_price, max_price, sort, page = 1, limit = 24 } = req.query;
  let where = ['p.active = 1'];
  let params = [];

  if (search) { where.push('(p.name LIKE ? OR p.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (category) { where.push('(c.slug = ? OR c.parent_id = (SELECT id FROM categories WHERE slug = ?))'); params.push(category, category); }
  if (subcategory) { where.push('c.slug = ?'); params.push(subcategory); }
  if (brand) { where.push('p.brand = ?'); params.push(brand); }
  if (min_price) { where.push('p.price >= ?'); params.push(min_price); }
  if (max_price) { where.push('p.price <= ?'); params.push(max_price); }

  const sortMap = { price_asc: 'p.price ASC', price_desc: 'p.price DESC', rating: 'p.rating DESC', newest: 'p.created_at DESC' };
  const orderBy = sortMap[sort] || 'p.created_at DESC';
  const offset = (page - 1) * limit;

  const sql = `SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p JOIN categories c ON p.category_id = c.id
    WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const products = db.prepare(sql).all(...params);
  const total = db.prepare(`SELECT COUNT(*) as count FROM products p JOIN categories c ON p.category_id = c.id WHERE ${where.join(' AND ')}`).get(...params.slice(0, -2)).count;

  res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// Ruta parametrizada AL FINAL
router.get('/:slug', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p JOIN categories c ON p.category_id = c.id WHERE p.slug = ?
  `).get(req.params.slug);
  if (!product) return res.status(404).json({ error: 'No encontrado' });
  const reviews = db.prepare(`
    SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ? ORDER BY r.created_at DESC LIMIT 10
  `).all(product.id);
  res.json({ product, reviews });
});

module.exports = router;   