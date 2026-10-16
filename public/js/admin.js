// ─── DASHBOARD ──────────────────────────────────────────────
async function loadDashboard() {
  const data = await api('/api/admin/stats');
  if (!data) return;
  const s = data.stats;
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card"><div class="label">Ingresos</div><div class="value">$${s.revenue.toLocaleString()}</div></div>
    <div class="stat-card"><div class="label">Pedidos</div><div class="value">${s.total_orders}</div><div class="change ${s.pending_orders > 0 ? 'up' : ''}">${s.pending_orders} pendientes</div></div>
    <div class="stat-card"><div class="label">Usuarios</div><div class="value">${s.total_users}</div></div>
    <div class="stat-card"><div class="label">Productos</div><div class="value">${s.total_products}</div><div class="change ${s.low_stock > 0 ? 'down' : ''}">${s.low_stock} stock bajo</div></div>
  `;
  document.getElementById('recentBody').innerHTML = data.recentOrders.map(o => `
    <tr><td>#${o.id}</td><td>${o.user_name}</td><td>$${o.total.toFixed(2)}</td>
    <td><span class="order-status status-${o.status}">${o.status}</span></td><td>${o.created_at}</td></tr>
  `).join('');
}

// ─── PRODUCTS ───────────────────────────────────────────────
async function loadProducts() {
  const products = await api('/api/admin/products');
  if (!products) return;
  document.getElementById('productsBody').innerHTML = products.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.category_name}</td>
      <td>$${p.price.toFixed(2)}</td>
      <td style="color:${p.stock < 5 ? 'var(--accent-tertiary)' : 'var(--accent-secondary)'}">${p.stock}</td>
      <td>${p.active ? '✅' : '❌'}</td>
      <td class="actions">
        <button class="btn btn-outline btn-sm" onclick="editProduct(${p.id})">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">Desactivar</button>
        <button class="btn btn-danger btn-sm" style="background:#900;color:#fff;" onclick="deleteProductPermanent(${p.id})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

async function loadCategoriesForSelect() {
  const cats = await fetch('/api/products/categories').then(r => r.json());
  const sel = document.getElementById('pCategory');
  if (!sel) return;
  sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('') +
    (cats.flatMap(c => c.children || []).map(s => `<option value="${s.id}">  ${s.name}</option>`).join(''));
}

function openProductModal() {
  document.getElementById('productModal').classList.add('open');
  document.getElementById('modalTitle').textContent = 'Nuevo Producto';
  document.getElementById('pId').value = '';
  ['pName','pSlug','pDesc','pPrice','pOldPrice','pStock','pSubcat','pBrand','pSize'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pImage').value = '';
  document.getElementById('pFeatured').value = '0';
  document.getElementById('pActive').value = '1';
}

function editProduct(id) {
  api('/api/admin/products').then(products => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    document.getElementById('productModal').classList.add('open');
    document.getElementById('modalTitle').textContent = 'Editar Producto';
    document.getElementById('pId').value = p.id;
    document.getElementById('pName').value = p.name;
    document.getElementById('pSlug').value = p.slug;
    document.getElementById('pDesc').value = p.description || '';
    document.getElementById('pPrice').value = p.price;
    document.getElementById('pOldPrice').value = p.old_price || '';
    document.getElementById('pStock').value = p.stock;
    document.getElementById('pCategory').value = p.category_id;
    document.getElementById('pSubcat').value = p.subcategory || '';
    document.getElementById('pBrand').value = p.brand || '';
    document.getElementById('pSize').value = p.size || '';
    document.getElementById('pFeatured').value = p.featured ? '1' : '0';
    document.getElementById('pActive').value = p.active ? '1' : '0';
  });
}

function closeModal() {
  document.getElementById('productModal').classList.remove('open');
  const btn = document.querySelector('#productModal .btn-primary');
  if (btn) { btn.textContent = 'Guardar'; btn.disabled = false; }
}

async function saveProduct() {
  const btn = document.querySelector('#productModal .btn-primary');
  if (btn) { btn.textContent = 'Guardando...'; btn.disabled = true; }

  try {
    const id = document.getElementById('pId').value;
    const data = {
      name: document.getElementById('pName').value,
      slug: document.getElementById('pSlug').value,
      description: document.getElementById('pDesc').value,
      price: parseFloat(document.getElementById('pPrice').value),
      old_price: document.getElementById('pOldPrice').value || null,
      stock: parseInt(document.getElementById('pStock').value),
      category_id: parseInt(document.getElementById('pCategory').value),
      subcategory: document.getElementById('pSubcat').value,
      brand: document.getElementById('pBrand').value,
      size: document.getElementById('pSize').value,
      featured: document.getElementById('pFeatured').value,
      active: document.getElementById('pActive').value
    };
    const file = document.getElementById('pImage').files[0];

    let result;
    if (file) {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => fd.append(k, v));
      fd.append('image', file);
      const url = id ? `/api/admin/products/${id}` : '/api/admin/products';
      const method = id ? 'PUT' : 'POST';
      const headers = { 'Authorization': `Bearer ${getToken()}` };
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { method, headers, body: fd, signal: controller.signal });
      clearTimeout(timeout);
      result = await res.json();
    } else {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
      const res = await fetch(id ? `/api/admin/products/${id}` : '/api/admin/products', {
        method: id ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal
      });
      clearTimeout(timeout);
      result = await res.json();
    }

    if (result && !result.error) {
      toast('Producto guardado ✓', 'success');
    } else {
      toast(result?.error || 'Error al guardar', 'error');
    }
  } catch (e) {
    console.error(e);
    toast('Error al guardar', 'error');
  } finally {
    closeModal();
    loadProducts();
  }
}   

async function deleteProduct(id) {
  if (!confirm('¿Desactivar este producto?')) return;
  await api(`/api/admin/products/${id}`, 'DELETE');
  toast('Producto desactivado', 'success');
  loadProducts();
}

async function deleteProductPermanent(id) {
  if (!confirm('⚠️ Esto ELIMINA el producto permanentemente. No se puede recuperar. ¿Seguro?')) return;
  const res = await api(`/api/admin/products/${id}/permanent`, 'DELETE');
  if (res?.ok) {
    toast('Producto eliminado permanentemente', 'success');
    loadProducts();
  } else {
    toast(res?.error || 'Error al eliminar', 'error');
  }
}

// ─── ORDERS ─────────────────────────────────────────────────
const statusLabels = { pending: 'Pendiente', confirmed: 'Confirmado', shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado' };

async function loadOrders() {
  const filter = document.getElementById('orderFilter')?.value;
  const url = filter ? `/api/admin/orders?status=${filter}` : '/api/admin/orders';
  const orders = await api(url);
  if (!orders) return;
  document.getElementById('ordersList').innerHTML = orders.map(o => `
    <div class="order-card" style="margin-bottom:16px;">
      <div class="order-header">
        <span class="order-id">Pedido #${o.id}</span>
        <span style="color:var(--text-secondary)">${o.user_name} · ${o.user_email}</span>
        <span class="order-date">${o.created_at}</span>
        <select onchange="updateOrderStatus(${o.id}, this.value)" style="padding:6px 12px;border-radius:var(--radius-sm);background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-primary);">
          ${Object.entries(statusLabels).map(([k,v]) => `<option value="${k}" ${o.status===k?'selected':''}>${v}</option>`).join('')}
        </select>
      </div>
      <div class="order-items">
        ${o.items.map(i => `<div class="order-item-row"><span>${i.name} × ${i.quantity}</span><span>$${(i.price*i.quantity).toFixed(2)}</span></div>`).join('')}
      </div>
      <div class="order-footer">
        <span class="order-total">$${o.total.toFixed(2)}</span>
        <span style="font-size:0.85rem;color:var(--text-muted);">${o.address}, ${o.city} · ${o.shipping_method}</span>
      </div>
    </div>
  `).join('');
}

async function updateOrderStatus(id, status) {
  await api(`/api/admin/orders/${id}/status`, 'PUT', { status });
  toast(`Pedido #${id} → ${statusLabels[status]}`, 'success');
}

// ─── USERS ──────────────────────────────────────────────────
async function loadUsers() {
  const users = await api('/api/admin/users');
  if (!users) return;
  const user = getUser();
  const isOwner = user?.role === 'owner';
  document.getElementById('usersBody').innerHTML = users.map(u => `
    <tr>
      <td>${u.id}</td>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td>${u.phone || '—'}</td>
      <td>${u.points}</td>
      <td>$${u.total_spent.toFixed(2)}</td>
      <td>${u.city}</td>
      <td>${isOwner ? `
        <select onchange="updateUserRole(${u.id}, this.value)" style="padding:4px 8px;border-radius:var(--radius-sm);background:var(--bg-secondary);border:1px solid var(--border);color:var(--text-primary);">
          <option value="customer" ${u.role==='customer'?'selected':''}>Cliente</option>
          <option value="wholesale" ${u.role==='wholesale'?'selected':''}>Mayorista</option>
          <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
          <option value="owner" ${u.role==='owner'?'selected':''}>Owner</option>
        </select>
      ` : `<span style="color:var(--text-muted);">${u.role}</span>`}</td>
      <td class="actions">
        ${isOwner ? `<button class="btn btn-outline btn-sm" onclick="adjustPoints(${u.id}, '${u.name}')">± Puntos</button>` : ''}
      </td>
    </tr>
  `).join('');
}

async function updateUserRole(id, role) {
  await api(`/api/admin/users/${id}/role`, 'PUT', { role });
  toast('Rol actualizado', 'success');
  loadUsers();
}

function adjustPoints(id, name) {
  const input = prompt(`¿Cuántos puntos dar/quitar a ${name}?\n\nEjemplo:\n+50 (dar 50)\n-20 (quitar 20)`);
  if (!input) return;
  const points = parseInt(input);
  if (isNaN(points) || points === 0) { toast('Número inválido', 'error'); return; }
  const reason = prompt('Motivo (opcional):') || 'Ajuste manual';
  api(`/api/admin/users/${id}/points`, 'PUT', { points, reason }).then(res => {
    if (res?.ok) {
      toast(`${name}: ${points > 0 ? '+' : ''}${points} puntos → Total: ${res.new_points}`, 'success');
      loadUsers();
    } else {
      toast(res?.error || 'Error', 'error');
    }
  });
}

// ─── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const page = location.pathname;
  if (page.includes('/admin/products.html')) { loadProducts(); loadCategoriesForSelect(); }
  else if (page.includes('/admin/orders.html')) { loadOrders(); }
  else if (page.includes('/admin/users.html')) { loadUsers(); }
  else { loadDashboard(); }
});     