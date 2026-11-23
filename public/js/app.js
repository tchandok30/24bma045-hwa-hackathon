/* ============================================================
   HuntClock - app.js (shared)
   Cart, nav drawer, toasts, currency formatting
   ============================================================ */

const API = '';
const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 });

/* ---------- Cart (localStorage) ---------- */
const STORAGE_KEY = 'hc_cart';
let cart = [];

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cart = raw ? JSON.parse(raw) : [];
  } catch (e) {
    cart = [];
  }
  syncCartBadge();
}
function saveCart() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (e) { /* localStorage unavailable */ }
  syncCartBadge();
  if (window.cartChanged) window.cartChanged();
}
function cartCount() { return cart.reduce((s, i) => s + i.quantity, 0); }

function addToCart(item) {
  const existing = cart.find(c => c.slug === item.slug && c.size === item.size && c.disc_level === (item.disc_level || null));
  if (existing) {
    existing.quantity = Math.min(existing.quantity + item.quantity, 10);
  } else {
    cart.push({ ...item, quantity: Math.min(item.quantity || 1, 10) });
  }
  saveCart();
  toast('Added to cart', 'success');
}
function updateQty(slug, size, discLevel, delta) {
  const idx = cart.findIndex(c => c.slug === slug && c.size === size && c.disc_level === (discLevel || null));
  if (idx === -1) return;
  cart[idx].quantity = Math.min(Math.max(cart[idx].quantity + delta, 1), 10);
  if (cart[idx].quantity <= 0) cart.splice(idx, 1);
  saveCart();
}
function setQty(slug, size, discLevel, val) {
  const idx = cart.findIndex(c => c.slug === slug && c.size === size && c.disc_level === (discLevel || null));
  if (idx === -1) return;
  val = Math.min(Math.max(val, 1), 10);
  cart[idx].quantity = val;
  saveCart();
}
function removeItem(slug, size, discLevel) {
  const idx = cart.findIndex(c => c.slug === slug && c.size === size && c.disc_level === (discLevel || null));
  if (idx === -1) return;
  const removed = cart.splice(idx, 1)[0];
  saveCart();
  return removed;
}
function clearCart() { cart = []; saveCart(); }

/* ---------- Toasts ---------- */
function toast(message, type = 'info') {
  const container = document.getElementById('toast-container') || createToastContainer();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `<span class="sr-only">${type}</span>${escapeHtml(message)}`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; setTimeout(() => el.remove(), 200); }, 2600);
}
function createToastContainer() {
  const c = document.createElement('div');
  c.id = 'toast-container';
  c.className = 'toast-container';
  document.body.appendChild(c);
  return c;
}

/* ---------- Nav badge ---------- */
function syncCartBadge() {
  const count = cartCount();
  document.querySelectorAll('.cart-count').forEach(badge => {
    badge.textContent = count;
    badge.hidden = count === 0;
    if (count > 0) { badge.classList.add('bump'); setTimeout(() => badge.classList.remove('bump'), 200); }
  });
}

/* ---------- Currency ---------- */
function formatPrice(n) { return CURRENCY.format(n || 0); }

/* ---------- Escape HTML ---------- */
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

/* ---------- Mobile nav drawer ---------- */
function initNav() {
  const toggle = document.getElementById('nav-toggle');
  const overlay = document.getElementById('drawer-overlay');
  const close = document.getElementById('drawer-close');
  if (!toggle || !overlay) return;
  toggle.addEventListener('click', () => { overlay.classList.toggle('open'); toggle.setAttribute('aria-expanded', overlay.classList.contains('open')); });
  close.addEventListener('click', () => { overlay.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { overlay.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); } });
  overlay.querySelectorAll('a').forEach(a => a.addEventListener('click', () => { overlay.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }));
}

/* ---------- Fade-up on scroll ---------- */
function initReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
}

/* ---------- Bootstrap ---------- */
document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  initNav();
  initReveal();
});

/* Expose for page scripts */
window.hc = { cart, addToCart, updateQty, setQty, removeItem, clearCart, cartCount, formatPrice, toast, loadCart, saveCart };
