/* ============================================================
   HuntClock - confirmation.js
   Order confirmation page
   ============================================================ */

const params = new URLSearchParams(location.search);
const orderNoEl = document.getElementById('d-order-no');
const totalEl = document.getElementById('d-total');
const estimateEl = document.getElementById('d-estimate');

const orderNumber = params.get('order');
const total = params.get('total');

if (orderNumber) {
  orderNoEl.textContent = orderNumber;
  if (total) totalEl.textContent = `Rs ${parseInt(total, 10).toLocaleString('en-IN')}`;
}

// Fetch full order from server if we have an order number
async function loadOrder() {
  if (!orderNumber) return;
  try {
    const res = await fetch(`/api/orders/${orderNumber}`);
    if (res.ok) {
      const j = await res.json();
      if (j.total) totalEl.textContent = `Rs ${j.total.toLocaleString('en-IN')}`;
      // estimate based on subtotal
      estimateEl.textContent = j.subtotal >= 3000 ? '3&ndash;5 days' : '5&ndash;8 days';
    }
  } catch { /* silent */ }
}
loadOrder();
