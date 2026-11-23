/* ============================================================
   HuntClock - cart.js
   Cart page: line items, promo, totals, checkout
   ============================================================ */

const itemsEl = document.getElementById('cart-items');
const emptyEl = document.getElementById('cart-empty');
const promoInput = document.getElementById('promo-input');
const btnPromo = document.getElementById('btn-promo');
const promoMsg = document.getElementById('promo-msg');
const sumSubtotal = document.getElementById('sum-subtotal');
const sumDiscount = document.getElementById('sum-discount');
const sumDelivery = document.getElementById('sum-delivery');
const sumTotal = document.getElementById('sum-total');
const btnCheckout = document.getElementById('btn-checkout');
const freeBar = document.getElementById('free-delivery-bar');
const freeFill = document.getElementById('free-fill');
const freeText = document.getElementById('free-text');
const freeGap = document.getElementById('free-gap');

let appliedPromo = null;

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }

function render() {
  const cart = window.hc.cart;
  if (cart.length === 0) {
    emptyEl.style.display = 'block';
    itemsEl.style.display = 'none';
    btnCheckout.style.display = 'none';
    updateTotals({ subtotal: 0, discount: 0, delivery_fee: 99, total: 99 });
    return;
  }
  emptyEl.style.display = 'none';
  itemsEl.style.display = 'block';
  btnCheckout.style.display = 'block';
  itemsEl.innerHTML = '';
  cart.forEach(it => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div class="item-thumb"><svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><path d="M2 12c0-1.1 0.9-2 2-2s2 0.9 2 2 0.9 2 2 2 2-0.9 2-2 0.9-2 2-2 2c-1.1 0-2 0.9-2 2M12 2c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2M12 14c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2M12 10c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2M22 12c0-1.1 0.9-2 2-2s2 0.9 2 2 0.9 2 2 2 2-0.9 2-2 0.9-2 2-2 2c-1.1 0-2 0.9-2 2M14 22c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2M10 22c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2M18 10c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2M18 14c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2" fill="none" stroke="#14625F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="item-info">
        <h4>${escapeHtml(it.name)}</h4>
        <p>${escapeHtml(it.size)} &bull; ${it.disc_level || 'standard'} disc &bull; ${it.subscription ? 'Subscription: ' + it.frequency : 'One-time'}</p>
      </div>
      <div class="item-qty">
        <button data-action="minus" data-slug="${escapeHtml(it.slug)}" data-size="${escapeHtml(it.size)}" data-disc="${escapeHtml(it.disc_level || '')}">&#8722;</button>
        <input type="number" value="${it.quantity}" min="1" max="10" data-slug="${escapeHtml(it.slug)}" data-size="${escapeHtml(it.size)}" data-disc="${escapeHtml(it.disc_level || '')}">
        <button data-action="plus" data-slug="${escapeHtml(it.slug)}" data-size="${escapeHtml(it.size)}" data-disc="${escapeHtml(it.disc_level || '')}">&#43;</button>
      </div>
      <div class="item-total">Rs ${(it.total).toLocaleString('en-IN')}</div>
      <button class="remove-btn" data-slug="${escapeHtml(it.slug)}" data-size="${escapeHtml(it.size)}" data-disc="${escapeHtml(it.disc_level || '')}" title="Remove">Remove</button>
    `;
    itemsEl.appendChild(row);
  });

  itemsEl.querySelectorAll('button[data-action]').forEach(b => {
    b.addEventListener('click', () => {
      const slug = b.dataset.slug;
      const size = b.dataset.size;
      const disc = b.dataset.disc || null;
      const delta = b.dataset.action === 'plus' ? 1 : -1;
      window.hc.updateQty(slug, size, disc, delta);
      render();
    });
  });
  itemsEl.querySelectorAll('input[type="number"]').forEach(inp => {
    inp.addEventListener('change', () => {
      const slug = inp.dataset.slug;
      const size = inp.dataset.size;
      const disc = inp.dataset.disc || null;
      const val = Math.min(Math.max(parseInt(inp.value, 10) || 1, 1), 10);
      window.hc.setQty(slug, size, disc, val);
      render();
    });
  });
  itemsEl.querySelectorAll('.remove-btn').forEach(b => {
    b.addEventListener('click', () => {
      const slug = b.dataset.slug;
      const size = b.dataset.size;
      const disc = b.dataset.disc || null;
      const removed = window.hc.removeItem(slug, size, disc);
      render();
      if (removed) toast(`Removed ${escapeHtml(removed.name)}`, 'info');
    });
  });

  fetch('/api/cart/price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: cart.map(c => ({ slug: c.slug, quantity: c.quantity, size: c.size, disc_level: c.disc_level }) }), promo: appliedPromo }),
  }).then(r => r.json()).then(j => {
    if (j.error) { toast(j.error, 'error'); return; }
    updateTotals(j);
  }).catch(() => toast('Could not calculate totals.', 'error'));
}

function updateTotals(j) {
  const sub = j.subtotal || 0;
  const disc = j.discount || 0;
  const del = j.delivery_fee || 0;
  const tot = j.total || 0;
  sumSubtotal.textContent = `Rs ${sub.toLocaleString('en-IN')}`;
  sumDiscount.textContent = `&minus; Rs ${disc.toLocaleString('en-IN')}`;
  sumDelivery.textContent = del === 0 ? 'Free' : `Rs ${del.toLocaleString('en-IN')}`;
  sumTotal.textContent = `Rs ${tot.toLocaleString('en-IN')}`;

  const gap = Math.max(3000 - sub, 0);
  if (sub >= 3000) {
    freeBar.style.display = 'none';
  } else {
    freeBar.style.display = 'block';
    freeGap.textContent = gap.toLocaleString('en-IN');
    const pct = Math.min(100, (sub / 3000) * 100);
    freeFill.style.width = `${pct}%`;
    freeText.textContent = `Add Rs ${gap.toLocaleString('en-IN')} more for free delivery`;
  }
}

btnPromo.addEventListener('click', async () => {
  const code = promoInput.value.trim();
  if (!code) return;
  try {
    const res = await fetch('/api/promo/validate', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ code }) });
    const j = await res.json();
    if (res.ok) {
      appliedPromo = j.code;
      promoMsg.textContent = `Promo ${j.code} applied: ${j.discount_percent}% off.`;
      promoMsg.style.color = '#2F855A';
      render();
    } else {
      appliedPromo = null;
      promoMsg.textContent = j.error || 'Invalid promo code.';
      promoMsg.style.color = '#C2410C';
      render();
    }
  } catch {
    promoMsg.textContent = 'Promo check failed. Try again.';
    promoMsg.style.color = '#C2410C';
  }
});

window.cartChanged = render;
render();
