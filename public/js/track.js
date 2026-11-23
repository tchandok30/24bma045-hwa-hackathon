/* ============================================================
   HuntClock - track.js
   Order tracking lookup
   ============================================================ */

const form = document.getElementById('track-form');
const result = document.getElementById('track-result');
const msg = document.getElementById('track-msg');
const btnTrack = document.getElementById('btn-track');

const trOrder = document.getElementById('tr-order');
const trStatus = document.getElementById('tr-status');
const trTotal = document.getElementById('tr-total');
const trDate = document.getElementById('tr-date');
const steps = {
  Placed: document.getElementById('ts-placed'),
  Packed: document.getElementById('ts-packed'),
  Shipped: document.getElementById('ts-shipped'),
  Delivered: document.getElementById('ts-delivered'),
};
const stepDots = {
  Placed: document.querySelector('.track-step:nth-child(1) .dot'),
  Packed: document.querySelector('.track-step:nth-child(2) .dot'),
  Shipped: document.getElementById ? document.querySelector('.track-step:nth-child(3) .dot') : null,
  Delivered: document.querySelector('.track-step:nth-child(4) .dot'),
};

const orderStatusOrder = ['Placed', 'Packed', 'Shipped', 'Delivered'];

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.textContent = '';
  result.style.display = 'none';
  const orderNumber = document.getElementById('t-order').value.trim();
  const email = document.getElementById('t-email').value.trim();

  try {
    const res = await fetch('/api/track', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ order_number: orderNumber, email }) });
    const j = await res.json();
    if (res.ok) {
      trOrder.textContent = j.order_number;
      trStatus.textContent = j.status;
      trStatus.style.color = j.status === 'Delivered' ? '#2F855A' : j.status === 'Shipped' ? '#14625F' : '#5E6E6C';
      trTotal.textContent = `Rs ${j.total.toLocaleString('en-IN')}`;
      trDate.textContent = new Date(j.created_at).toLocaleDateString('en-IN');

      // Timeline
      orderStatusOrder.forEach(s => {
        steps[s].textContent = '';
        stepDots[s].className = 'dot';
      });
      let reached = false;
      orderStatusOrder.forEach(s => {
        if (j.status === s) { reached = true; stepDots[s].className = 'dot current'; steps[s].textContent = new Date(j.created_at).toLocaleDateString('en-IN'); break; }
        stepDots[s].className = 'dot done';
        steps[s].textContent = new Date(j.created_at).toLocaleDateString('en-IN');
      });
      if (j.history) {
        j.history.forEach(h => {
          if (steps[h.status]) steps[h.status].textContent = new Date(h.changed_at).toLocaleDateString('en-IN');
        });
      }
      result.style.display = 'block';
      result.scrollIntoView({ behavior: 'smooth' });
    } else {
      msg.textContent = j.error || 'Order not found.';
      msg.style.color = '#C2410C';
    }
  } catch {
    msg.textContent = 'Tracking lookup failed. Try again.';
    msg.style.color = '#C2410C';
  }
});
