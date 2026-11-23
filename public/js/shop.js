/* ============================================================
   HuntClock - shop.js
   Product selection, price, delivery check
   ============================================================ */

const SIZES = {
  S: { name: 'HuntClock S', price: 2999, slug: 'huntclock-s', weight: 'up to 10 kg' },
  M: { name: 'HuntClock M', price: 3499, slug: 'huntclock-m', weight: '10-25 kg' },
  L: { name: 'HuntClock L', price: 3999, slug: 'huntclock-l', weight: '25 kg+' },
};

let selectedSize = 'S';
let selectedDisc = 'Easy';
let extraDisc = false;
let qty = 1;

const sizeRadios = document.querySelectorAll('#size-options input');
const discRadios = document.querySelectorAll('#disc-options input');
const extraCheckbox = document.getElementById('extra-disc');
const qtyInput = document.getElementById('qty');
const qtyDisplay = document.getElementById('qty-display');
const priceDisplay = document.getElementById('price-display');
const btnAdd = document.getElementById('btn-add');
const btnBuy = document.getElementById('btn-buy');
const pinInput = document.getElementById('pin-input');
const btnCheckPin = document.getElementById('btn-check-pin');
const deliveryResult = document.getElementById('delivery-result');
const dogWeight = document.getElementById('dog-weight');
const btnSizeRec = document.getElementById('btn-size-rec');
const sizeRecMsg = document.getElementById('size-rec-msg');

function recompute() {
  const size = SIZES[selectedSize];
  let subtotal = size.price * qty;
  if (extraDisc) subtotal += 499;
  priceDisplay.textContent = `Rs ${subtotal.toLocaleString('en-IN')}`;
  const line = `HuntClock ${selectedSize} (${size.weight}) &bull; ${selectedDisc} disc &bull; x${qty}`;
  btnAdd.dataset.line = line;
  btnAdd.dataset.price = String(subtotal);
  btnAdd.dataset.slug = size.slug;
  btnAdd.dataset.size = selectedSize;
  btnAdd.dataset.disc = selectedDisc;
  btnAdd.dataset.qty = String(qty);
  btnAdd.disabled = false;
  btnBuy.href = `/checkout.html?line=${encodeURIComponent(line)}&price=${subtotal}&slug=${size.slug}&size=${selectedSize}&disc=${selectedDisc}&qty=${qty}`;
}

sizeRadios.forEach(r => r.addEventListener('change', (e) => {
  selectedSize = e.target.value;
  document.querySelectorAll('#size-options .radio-card').forEach(c => c.classList.toggle('selected', c.dataset.size === selectedSize));
  recompute();
}));
discRadios.forEach(r => r.addEventListener('change', (e) => {
  selectedDisc = e.target.value;
  document.querySelectorAll('#disc-options .radio-card').forEach(c => c.classList.toggle('selected', c.dataset.disc === selectedDisc));
  recompute();
}));
extraCheckbox.addEventListener('change', (e) => { extraDisc = e.target.checked; recompute(); });

// Quantity stepper
const qtyMinus = document.querySelector('#qty-step button:first-child');
const qtyPlus = document.querySelector('#qty-step button:last-child');
qtyMinus.addEventListener('click', () => { qty = Math.max(qty - 1, 1); qtyInput.value = qty; recompute(); });
qtyPlus.addEventListener('click', () => { qty = Math.min(qty + 1, 10); qtyInput.value = qty; recompute(); });
qtyInput.addEventListener('input', () => { qty = Math.min(Math.max(parseInt(qtyInput.value, 10) || 1, 1), 10); qtyInput.value = qty; recompute(); });

btnAdd.addEventListener('click', () => {
  window.hc.addToCart({
    slug: btnAdd.dataset.slug,
    name: SIZES[selectedSize].name,
    size: selectedSize,
    disc_level: selectedDisc,
    quantity: qty,
    unit_price: SIZES[selectedSize].price,
    total: parseInt(btnAdd.dataset.price, 10),
  });
});

// Delivery PIN check
async function checkPin() {
  const pin = pinInput.value.trim();
  if (!/^\d{6}$/.test(pin)) {
    deliveryResult.textContent = 'Enter a valid 6-digit PIN code.';
    deliveryResult.style.color = '#C2410C';
    return;
  }
  try {
    const res = await fetch(`/api/delivery?pin=${pin}`);
    const j = await res.json();
    if (res.ok) {
      deliveryResult.textContent = `Estimated delivery: ${j.estimated_days} (metro: 3&ndash;5 days, other: 5&ndash;8 days). Free delivery above Rs 3,000.`;
      deliveryResult.style.color = '#2F855A';
    } else {
      deliveryResult.textContent = j.error || 'Check failed.';
      deliveryResult.style.color = '#C2410C';
    }
  } catch {
    deliveryResult.textContent = 'Could not check delivery. Try again.';
    deliveryResult.style.color = '#C2410C';
  }
}
btnCheckPin.addEventListener('click', checkPin);
pinInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') checkPin(); });

// Size recommendation
btnSizeRec.addEventListener('click', () => {
  const w = parseInt(dogWeight.value, 10);
  if (!w || w < 1) { sizeRecMsg.textContent = 'Enter a valid weight.'; sizeRecMsg.style.color = '#C2410C'; return; }
  let rec = 'S';
  if (w > 10 && w <= 25) rec = 'M';
  if (w > 25) rec = 'L';
  const radio = document.querySelector(`#size-options input[value="${rec}"]`);
  if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); }
  sizeRecMsg.textContent = `Recommended: HuntClock ${rec} (${SIZES[rec].weight})`;
  sizeRecMsg.style.color = '#2F855A';
});

recompute();
