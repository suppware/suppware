// ─── UTILS ──────────────────────────────────────────────────
function getToken() { return localStorage.getItem('token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }
function setAuth(token, user) { localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); }
function clearAuth() { localStorage.removeItem('token'); localStorage.removeItem('user'); }

async function api(url, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
    const data = await res.json();
    if (res.status === 401) { clearAuth(); location.href = '/login.html'; return null; }
    return data;
  } catch (e) { console.error(e); return null; }
}

function toast(msg, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function toggleUserMenu() {
  const dd = document.getElementById('userDropdown');
  if (dd) dd.classList.toggle('open');
}

function logout() { clearAuth(); location.href = '/'; }

async function updateCartCount() {
  const token = getToken();
  if (!token) return;
  const cart = await api('/api/cart');
  if (cart) {
    const count = cart.items.reduce((s, i) => s + i.quantity, 0);
    const badge = document.getElementById('cartCount');
    if (badge) badge.textContent = count;
  }
}

function productCard(p) {
  const badge = p.old_price ? `<span class="product-card-badge badge-sale">-${Math.round((1-p.price/p.old_price)*100)}%</span>` : (p.featured ? '<span class="product-card-badge badge-new">Top</span>' : '');
  return `
    <a href="/product-detail.html?slug=${p.slug}" class="product-card">
      <div class="product-card-img">${p.image ? `<img src="${p.image}" alt="${p.name}">` : '📦'}${badge}</div>
      <div class="product-card-body">
        <span class="product-card-category">${p.category_name}</span>
        <h3 class="product-card-name">${p.name}</h3>
        <p class="product-card-brand">${p.brand || ''}</p>
        <div class="product-card-footer">
          <div class="product-card-price">${p.old_price ? `<span class="old">$${p.old_price.toFixed(0)}</span>` : ''}$${p.price.toFixed(0)}</div>
          <div class="product-card-rating">★ ${p.rating || '—'}</div>
        </div>
      </div>
    </a>`;
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('userDropdown');
    if (dd && dd.classList.contains('open') && !e.target.closest('.user-menu')) dd.classList.remove('open');
  });
});   