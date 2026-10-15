const statusLabels = { pending: 'Pendiente', confirmed: 'Confirmado', shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado' };

document.addEventListener('DOMContentLoaded', async () => {
  const orders = await api('/api/orders');
  if (!orders) return;
  const list = document.getElementById('ordersList');
  if (orders.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);padding:40px;text-align:center;">Aún no tienes pedidos. <a href="/products.html" style="color:var(--accent)">Ver productos →</a></p>';
    return;
  }
  list.innerHTML = orders.map(o => `
    <div class="order-card">
      <div class="order-header">
        <span class="order-id">Pedido #${o.id}</span>
        <span class="order-date">${o.created_at}</span>
        <span class="order-status status-${o.status}">${statusLabels[o.status] || o.status}</span>
      </div>
      <div class="order-items">
        ${o.items.map(i => `<div class="order-item-row"><span>${i.name} × ${i.quantity}</span><span>$${(i.price * i.quantity).toFixed(2)}</span></div>`).join('')}
      </div>
      <div class="order-footer">
        <span class="order-total">$${o.total.toFixed(2)} MXN</span>
        <span style="font-size:0.85rem;color:var(--text-muted);">${o.address}, ${o.city}</span>
      </div>
    </div>
  `).join('');
});   