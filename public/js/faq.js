/* ============================================================
   HuntClock - faq.js
   Accessible accordion
   ============================================================ */

document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.setAttribute('aria-expanded', String(!expanded));
    panel.hidden = expanded;
  });
});
