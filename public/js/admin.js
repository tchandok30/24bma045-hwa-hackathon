/* ============================================================
   HuntClock - admin.js
   Admin login, orders list, status update
   ============================================================ */

const ADMIN_TOKEN_KEY = 'hc_admin_token';
const loginEl = document.getElementById('admin-login');
const viewEl = document.getElementById('admin-view');
const btnLogin = document.getElementById('btn-admin-login');
const btnLogout = document.getElementById('btn-admin-logout');
const adminMsg = document.getElementById('admin-msg');
const ordersBody = document.getElementById('admin-orders');
const detailEl = document.getElementById('admin-detail');
const btnBack = document.getElementById('btn-back-list');
const btnUpdate = document.getElementById('btn-update-status');

const statOrders = document.getElementById('stat-orders');
const statRevenue = document.getElementById('stat-revenue');
const statNewsletter = document.getElementById('stat-newsletter');

function token() { return localStorage.getItem(ADMIN_TOKEN_KEY); }
function authHeaders() { return { 'Authorization': `Bearer ${token()}` }; }

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]); }

async function loadStats() {
  try {
    const res = await fetch('/api/admin/orders', { headers: authHeaders() });
    if (!res.ok) return;
    const orders = await res.json();
    let revenue = 0;
    orders.forEach(o => { revenue += o.total || 0; });
    statOrders.textContent = orders.length;
    statRevenue.textContent = `Rs ${revenue.toLocaleString('en-IN')}`;
  } catch {}
}
async function loadNewsletterCount() {
  try {
    // newsletter count via orders endpoint doesn't include it; skip if endpoint missing
  } catch {}
}

async function loadOrders() {
  try {
    const res = await fetch('/api/admin/orders', { headers: authHeaders() });
    if (res.status === 401) { showLogin(); return; }
    if (!res.ok) throw new Error('Failed');
    const orders = await res.json();
    ordersBody.innerHTML = '';
    orders.forEach(o => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(o.order_number)}</strong></td>
        <td>${escapeHtml(o.customer_name)}</td>
        <td>Rs ${(o.total || 0).toLocaleString('en-IN')}</td>
        <td>${escapeHtml(o.status)}</td>
        <td>${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
        <td><button class="btn btn-outline" style="padding:2px 8px; font-size:0.8rem" data-id="${o.id}">View</button></td>
      `;
      ordersBody.appendChild(tr);
    });
    ordersBody.querySelectorAll('button[data-id]').forEach(b => {
      b.addEventListener('click', () => loadOrderDetail(b.dataset.id));
    });
    loadStats();
  } catch {
    adminMsg.textContent = 'Could not load orders.';
    adminMsg.style.color = '#C2410C';
  }
}

async function loadOrderDetail(id) {
  try {
    const res = await fetch(`/api/orders/${id}`);
    // orders endpoint returns by order_number; use admin list instead
    const listRes = await fetch('/api/admin/orders', { headers: authHeaders() });
    const orders = await listRes.json();
    const o = orders.find(x => x.id == id);
    if (!o) return;
    document.getElementById('det-no').textContent = o.order_number;
    document.getElementById('det-cust').textContent = o.customer_name;
    document.getElementById('det-email').textContent = o.email;
    document.getElementById('det-phone').textContent = o.phone;
    document.getElementById('det-total').textContent = `Rs ${(o.total || 0).toLocaleString('en-IN')}`;
    document.getElementById('det-status').textContent = o.status;
    document.getElementById('det-status-select').value = o.status;
    const itemsRes = await fetch(`/api/orders/${o.order_number}`);
    const j = await itemsRes.json();
    const tbody = document.getElementById('det-items');
    tbody.innerHTML = (j.items || []).map(it => `<tr><td>${escapeHtml(it.name)}</td><td>${escapeHtml(it.size)}</td><td>${it.quantity}</td><td>Rs ${it.unit_price.toLocaleString('en-IN')}</td><td>Rs ${it.total.toLocaleString('en-IN')}</td></tr>`).join('');
    viewEl.style.display = 'none';
    detailEl.style.display = 'block';
  } catch {
    document.getElementById('det-msg').textContent = 'Could not load order details.';
    document.getElementById('det-msg').style.color = '#C2410C';
  }
}

btnLogin.addEventListener('click', async () => {
  const pass = document.getElementById('admin-pass').value;
  try {
    const res = await fetch('/api/admin/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ password: pass }) });
    const j = await res.json();
    if (res.ok) {
      localStorage.setItem(ADMIN_TOKEN_KEY, j.token);
      adminMsg.textContent = '';
      loginEl.style.display = 'none';
      viewEl.style.display = 'block';
      loadOrders();
    } else {
      adminMsg.textContent = j.error || 'Login failed.';
      adminMsg.style.color = '#C2410C';
    }
  } catch {
    adminMsg.textContent = 'Login failed. Try again.';
    adminMsg.style.color = '#C2410C';
  }
});

btnLogout.addEventListener('click', () => {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  viewEl.style.display = 'none';
  loginEl.style.display = 'block';
  detailEl.style.display = 'none';
});

btnBack.addEventListener('click', () => {
  detailEl.style.display = 'none';
  viewEl.style.display = 'block';
  loadOrders();
});

btnUpdate.addEventListener('click', async () => {
  const id = document.getElementById('det-no').textContent;
  const status = document.getElementById('det-status-select').value;
  const msgEl = document.getElementById('det-msg');
  try {
    const listRes = await fetch('/api/admin/orders', { headers: authHeaders() });
    const orders = await listRes.json();
    const o = orders.find(x => x.order_number === id);
    if (!o) return;
    const res = await fetch(`/api/admin/orders/${o.id}/status`, { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (res.ok) {
      msgEl.textContent = 'Status updated.';
      msgEl.style.color = '#2F855A';
      document.getElementById('det-status').textContent = status;
      loadOrders();
    } else {
      msgEl.textContent = 'Update failed.';
      msgEl.style.color = '#C2410C';
    }
  } catch {
    msgEl.textContent = 'Update failed.';
    msgEl.style.color = '#C2410C';
  }
});

function showLogin() {
  loginEl.style.display = 'block';
  viewEl.style.display = 'none';
  detailEl.style.display = 'none';
}

if (token()) {
  loginEl.style.display = 'none';
  viewEl.style.display = 'block';
  loadOrders();
} else {
  showLogin();
}
