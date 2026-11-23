/* ============================================================
   HuntClock - subscription.js
   Disc of the Month subscription
   ============================================================ */

const cards = document.querySelectorAll('.sub-card');
const freqRadios = document.querySelectorAll('input[name="freq"]');
const btnAdd = document.getElementById('btn-add-sub');
const sumLevel = document.getElementById('sum-level');
const sumFreq = document.getElementById('sum-freq');
const sumPrice = document.getElementById('sum-price');
const sumDate = document.getElementById('sum-date');

let selectedLevel = 'Easy';
let selectedFreq = 'monthly';

const LEVEL_PRICE = { Easy: 399, Medium: 399, Genius: 399 };

const dateOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
function nextNDates(n, freq) {
  const dates = [];
  let d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 1; dates.length < n; i++) {
    const cand = new Date(d);
    cand.setDate(cand.getDate() + i * (freq === 'monthly' ? 30 : 60));
    dates.push(cand.toLocaleDateString('en-IN', dateOptions));
  }
  return dates;
}

function updateCardUI() {
  cards.forEach(c => {
    const sel = c.dataset.level === selectedLevel;
    c.classList.toggle('selected', sel);
  });
  const freqMult = selectedFreq === 'monthly' ? 1 : 2;
  const price = LEVEL_PRICE[selectedLevel];
  sumLevel.textContent = selectedLevel;
  sumFreq.textContent = selectedFreq === 'monthly' ? 'Monthly' : 'Every 2 months';
  sumPrice.textContent = `Rs ${price.toLocaleString('en-IN')}/${selectedFreq === 'monthly' ? 'month' : '2 months'}`;
  const dates = nextNDates(3, selectedFreq);
  sumDate.textContent = dates[0];
  // Update per-card dates too
  cards.forEach(c => {
    const d = nextNDates(3, selectedFreq);
    c.querySelector('.dates').innerHTML = `Next deliveries: ${d.map(x => `<span>${x}</span>`).join(', ')}`;
  });
}

cards.forEach(c => c.addEventListener('click', () => {
  selectedLevel = c.dataset.level;
  updateCardUI();
}));
freqRadios.forEach(r => r.addEventListener('change', (e) => {
  selectedFreq = e.target.value;
  updateCardUI();
}));

btnAdd.addEventListener('click', () => {
  window.hc.addToCart({
    slug: 'subscription',
    name: `Disc of the Month &mdash; ${selectedLevel}`,
    size: 'subscription',
    disc_level: selectedLevel,
    quantity: 1,
    unit_price: LEVEL_PRICE[selectedLevel],
    total: LEVEL_PRICE[selectedLevel],
    subscription: true,
    frequency: selectedFreq,
  });
});

updateCardUI();
