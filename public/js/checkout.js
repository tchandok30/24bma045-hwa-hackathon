/* ============================================================
   HuntClock - checkout.js
   Checkout form validation, payment methods, order submit
   ============================================================ */

const form = document.getElementById('checkout-form');
const btnSubmit = document.getElementById('btn-submit');
const formMsg = document.getElementById('form-msg');
const cart = window.hc.cart;

// Sidebar summary
const sbItems = document.getElementById('sidebar-items');
const sbSubtotal = document.getElementById('sb-subtotal');
const sbDelivery = document.getElementById('sb-delivery');
const sbTotal = document.getElementById('sb-total');
const sbEstimate = document.getElementById('sb-estimate');

function loadSummary() {
  fetch('/api/cart/price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: cart.map(c => ({ slug: c.slug, quantity: c.quantity, size: c.size, disc_level: c.disc_level })) }),
  }).then(r => r.json()).then(j => {
    if (j.error) return;
    sbItems.innerHTML = j.items.map(it => `<div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px"><span>${escapeHtml(it.name)} x${it.quantity}</span><span>Rs ${it.total.toLocaleString('en-IN')}</span></div>`).join('');
    sbSubtotal.textContent = `Rs ${j.subtotal.toLocaleString('en-IN')}`;
    sbDelivery.textContent = j.delivery_fee === 0 ? 'Free' : `Rs ${j.delivery_fee.toLocaleString('en-IN')}`;
    sbTotal.textContent = `Rs ${j.total.toLocaleString('en-IN')}`;
    sbEstimate.textContent = j.subtotal >= 3000 ? '3&ndash;5 days' : '5&ndash;8 days';
  });
}
if (cart.length === 0) { location.href = '/cart.html'; }
loadSummary();

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }

const fields = {
  c-name: { required: true },
  c-email: { required: true, validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email.' },
  c-phone: { required: true, validate: v => /^\d{10}$/.test(v.replace(/\s/g, '')) || 'Enter a valid 10-digit mobile number.' },
  c-addr1: { required: true },
  c-city: { required: true },
  c-state: { required: true },
  c-pin: { required: true, validate: v => /^\d{6}$/.test(v) || 'Enter a valid 6-digit PIN.' },
};

function showError(id, msg) {
  const el = document.getElementById(id);
  const input = document.getElementById(id.replace('err-', ''));
  if (el) el.textContent = msg || '';
  if (input) input.classList.toggle('error', !!msg);
}
function clearErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.textContent = '');
  document.querySelectorAll('input.error, select.error').forEach(e => e.classList.remove('error'));
}

function validateField(id) {
  const input = document.getElementById(id);
  const val = input.value.trim();
  const spec = fields[id];
  if (!spec) return true;
  if (spec.required && !val) { showError(`err-${id}`, 'This field is required.'); return false; }
  if (val && spec.validate) {
    const r = spec.validate(val);
    if (r !== true) { showError(`err-${id}`, r); return false; }
  }
  showError(`err-${id}`, '');
  return true;
}

Object.keys(fields).forEach(id => {
  document.getElementById(id).addEventListener('blur', () => validateField(id));
  document.getElementById(id).addEventListener('input', () => validateField(id));
});

// Payment method fields
const payRadios = document.querySelectorAll('input[name="payment"]');
const upiField = document.getElementById('upi-field');
const cardField = document.getElementById('card-field');
const upiInput = document.getElementById('c-upi');
const cardInput = document.getElementById('c-card');
const expiryInput = document.getElementById('c-expiry');
const cvvInput = document.getElementById('c-cvv');

function togglePayment() {
  upiField.classList.toggle('show', document.querySelector('input[name="payment"]:checked').value === 'upi');
  cardField.classList.toggle('show', document.querySelector('input[name="payment"]:checked').value === 'card');
}
payRadios.forEach(r => r.addEventListener('change', togglePayment));
togglePayment();

function validatePayment() {
  const method = document.querySelector('input[name="payment"]:checked').value;
  if (method === 'upi') {
    const v = upiInput.value.trim();
    if (!/^[a-zA-Z0-9.-]{2,256}@[a-zA-Z]{2,64}$/.test(v)) {
      showError('err-c-upi', 'Enter a valid UPI ID (e.g. name@upi).');
      return false;
    }
    showError('err-c-upi', '');
  }
  if (method === 'card') {
    let ok = true;
    const cn = cardInput.value.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cn) || !luhn(cn)) { showError('err-c-card', 'Invalid card number.'); ok = false; } else showError('err-c-card', '');
    const exp = expiryInput.value.trim();
    if (!/^\d{2}\/\d{2}$/.test(exp)) { showError('err-c-card', 'Expiry must be MM/YY.'); ok = false; }
    const cvv = cvvInput.value.trim();
    if (!/^\d{3}$/.test(cvv)) { showError('err-c-card', 'CVV must be 3 digits.'); ok = false; }
    return ok;
  }
  return true;
}

function luhn(cardNo) {
  let sum = 0, alternate = false;
  for (let i = cardNo.length - 1; i >= 0; i--) {
    let n = parseInt(cardNo[i], 10);
    if (alternate) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function formValid() {
  let ok = true;
  Object.keys(fields).forEach(id => { if (!validateField(id)) ok = false; });
  if (!validatePayment()) ok = false;
  btnSubmit.disabled = !ok;
  return ok;
}

Object.keys(fields).forEach(id => {
  document.getElementById(id).addEventListener('blur', formValid);
  document.getElementById(id).addEventListener('input', formValid);
});
upiInput.addEventListener('input', formValid);
cardInput.addEventListener('input', formValid);
expiryInput.addEventListener('input', formValid);
cvvInput.addEventListener('input', formValid);
cardInput.addEventListener('input', (e) => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 16);
  v = v.match(/.{1,4}/g)?.join(' ') || v;
  e.target.value = v;
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  if (!formValid()) return;
  const method = document.querySelector('input[name="payment"]:checked').value;
  if (method === 'upi' && !validatePayment()) return;
  if (method === 'card' && !validatePayment()) return;

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Placing order&hellip;';
  formMsg.textContent = '';

  const payload = {
    customer_name: document.getElementById('c-name').value.trim(),
    email: document.getElementById('c-email').value.trim(),
    phone: document.getElementById('c-phone').value.trim().replace(/\s/g, ''),
    address_line1: document.getElementById('c-addr1').value.trim(),
    address_line2: document.getElementById('c-addr2').value.trim() || null,
    city: document.getElementById('c-city').value.trim(),
    state: document.getElementById('c-state').value,
    pin: document.getElementById('c-pin').value.trim(),
    dog_name: document.getElementById('c-dog').value.trim() || null,
    dog_size: document.getElementById('c-dogsize').value || null,
    delivery_notes: document.getElementById('c-notes').value.trim() || null,
    payment_method: method,
    items: cart.map(c => ({ slug: c.slug, quantity: c.quantity, size: c.size, disc_level: c.disc_level })),
  };

  try {
    const res = await fetch('/api/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const j = await res.json();
    if (res.ok) {
      window.hc.clearCart();
      location.href = `/confirmation.html?order=${j.order_number}&total=${j.total}`;
    } else {
      if (j.field) showError(`err-${j.field}`, j.error);
      else formMsg.textContent = j.error || 'Order could not be placed.';
      formMsg.style.color = '#C2410C';
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Place order';
    }
  } catch {
    formMsg.textContent = 'Network error. Please try again.';
    formMsg.style.color = '#C2410C';
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Place order';
  }
});

formValid();
