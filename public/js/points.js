document.addEventListener('DOMContentLoaded', async () => {
  const data = await api('/api/points');
  if (!data) return;
  document.getElementById('pointsBalance').innerHTML = `${data.points} <span>puntos</span>`;
  document.getElementById('pointsValue').textContent = (data.points * 0.10).toFixed(2);
  document.getElementById('pointsBody').innerHTML = data.history.map(h => `
    <tr>
      <td>${h.created_at}</td>
      <td>${h.order_id ? `Pedido #${h.order_id}` : '—'}</td>
      <td>${h.reason}</td>
      <td class="${h.points >= 0 ? 'positive' : 'negative'}">${h.points >= 0 ? '+' : ''}${h.points}</td>
    </tr>
  `).join('');
});   