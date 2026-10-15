const { DatabaseSync: Database } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(process.env.DB_PATH || path.join(dataDir, 'store.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ─── SCHEMA ───────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'customer',
  points INTEGER DEFAULT 0,
  total_spent REAL DEFAULT 0,
  address TEXT,
  city TEXT DEFAULT 'Torreón',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id INTEGER REFERENCES categories(id),
  image TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  old_price REAL,
  stock INTEGER DEFAULT 0,
  image TEXT,
  category_id INTEGER REFERENCES categories(id),
  subcategory TEXT,
  brand TEXT,
  size TEXT,
  rating REAL DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  featured INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  added_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total REAL NOT NULL,
  discount REAL DEFAULT 0,
  points_used INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  address TEXT,
  city TEXT DEFAULT 'Torreón',
  shipping_method TEXT DEFAULT 'local',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  name TEXT,
  price REAL,
  quantity INTEGER
);

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  value REAL NOT NULL,
  min_purchase REAL DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TEXT,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  coupon_id INTEGER NOT NULL REFERENCES coupons(id),
  used INTEGER DEFAULT 0,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS points_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  points INTEGER NOT NULL,
  reason TEXT,
  order_id INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wishlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  added_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, product_id)
);
`);

// ─── SEED CATEGORIES ──────────────────────────────────────
const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name, slug, parent_id) VALUES (?, ?, ?)');
const cats = [
  ['Proteínas', 'proteinas', null],
  ['Creatina', 'creatina', null],
  ['Pre-Entreno', 'pre-entreno', null],
  ['Aminoácidos', 'aminoacidos', null],
  ['Multivitamínicos', 'multivitaminicos', null],
  ['Grasas Saludables', 'grasas', null],
  ['Bebidas', 'bebidas', null],
  ['Accesorios', 'accesorios', null],
  // Subcategorías de proteínas
  ['Whey Protein', 'whey-protein', 1],
  ['Caseína', 'caseina', 1],
  ['Proteína Vegetal', 'proteina-vegetal', 1],
  ['Proteína Híbrida', 'proteina-hibrida', 1],
  // Subcategorías de creatina
  ['Creatina Monohidratada', 'creatina-monohidratada', 2],
  ['Creatina HCL', 'creatina-hcl', 2],
];
db.exec('BEGIN');
try {
  cats.forEach(c => insertCat.run(c[0], c[1], c[2]));
  db.exec('COMMIT');
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
}   

module.exports = db;   