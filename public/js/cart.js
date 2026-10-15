async function loadCart() {
  const cart = await api('/api/cart');
  if (!cart) return;
  const items = document.getElementById('cartItems');
  if (cart.items.length === 0) {
    items.innerHTML = '<p style="color:var(--text-muted);padding:40px;text-align:center;">Tu carrito está vacío. <a href="/products.html" style="color:var(--accent)">Ver productos →</a></p>';
  } else {
    items.innerHTML = cart.items.map(i => `
      <div class="cart-item">
        <div class="cart-item-img">${i.image ? `<img src="${i.image}" alt="">` : '📦'}</div>
        <div class="cart-item-info">
          <h4>${i.name}</h4>
          <p class="meta">$${i.price.toFixed(2)} c/u</p>
        </div>
        <div class="cart-item-actions">
          <div class="qty-control">
            <button onclick="updateQty(${i.id}, ${i.quantity - 1})">−</button>
            <span>${i.quantity}</span>
            <button onclick="updateQty(${i.id}, ${i.quantity + 1})">+</button>
          </div>
          <span class="cart-item-price">$${(i.price * i.quantity).toFixed(2)}</span>
          <button class="remove-btn" onclick="removeItem(${i.id})">Eliminar</button>
        </div>
      </div>
    `).join('');
  }
  document.getElementById('sumSubtotal').textContent = '$' + cart.total.toFixed(2);
  document.getElementById('sumTotal').textContent = '$' + cart.total.toFixed(2);
  updateCartCount();
  // Load points
  const user = getUser();
  if (user?.points) {
    document.getElementById('availPoints').textContent = user.points;
    document.getElementById('pointsValue').textContent = (user.points * 0.10).toFixed(2);
  }
}

async function updateQty(itemId, qty) {
  if (qty < 1) return;
  await api(`/api/cart/items/${itemId}`, 'PUT', { quantity: qty });
  loadCart();
}

async function removeItem(itemId) {
  await api(`/api/cart/items/${itemId}`, 'DELETE');
  loadCart();
}

async function applyCoupon() {
  const code = document.getElementById('couponCode').value.trim();
  if (!code) return;
  const cart = await api('/api/cart');
  const res = await api('/api/coupons/validate', 'POST', { code, cart_total: cart.total });
  if (res?.valid) {
    document.getElementById('sumDiscount').textContent = '-$' + res.discount.toFixed(2);
    document.getElementById('sumTotal').textContent = '$' + (cart.total - res.discount).toFixed(2);
    toast('Cupón aplicado ✓', 'success');
  } else {
    toast(res?.error || 'Cupón inválido', 'error');
  }
}

function togglePoints() {
  const use = document.getElementById('usePoints').checked;
  const cart = api('/api/cart');
  if (use) {
    // Placeholder: en checkout se aplican
    toast('Puntos se aplicarán en el checkout', 'success');
  }
}

document.addEventListener('DOMContentLoaded', loadCart);   