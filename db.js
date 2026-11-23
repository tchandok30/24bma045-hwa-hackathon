const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbFile = path.join(dataDir, 'huntclock.json');

let DB = { products: [], promo_codes: [], orders: [], order_items: [], subscriptions: [], newsletter: [], order_status_history: [], _seq: {} };

function load() {
  try {
    if (fs.existsSync(dbFile)) {
      DB = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    }
  } catch { DB = { products: [], promo_codes: [], orders: [], order_items: [], subscriptions: [], newsletter: [], order_status_history: [], _seq: {} }; }
  ensureSeq();
}
function save() {
  fs.writeFileSync(dbFile, JSON.stringify(DB, null, 2));
}
function ensureSeq() {
  ['products','promo_codes','orders','order_items','subscriptions','newsletter','order_status_history'].forEach(t => {
    if (!DB._seq[t]) DB._seq[t] = (DB[t] && DB[t].length) ? Math.max(...DB[t].map(r => r.id || 0), 0) : 0;
  });
}
function nextId(t) { DB._seq[t] = (DB._seq[t] || 0) + 1; return DB._seq[t]; }

function run(sql, params = []) {
  const s = sql.trim();
  const sl = s.toLowerCase();
  if (sl.startsWith('insert into')) {
    const m = s.match(/insert into (\w+) \((.*?)\)/i);
    const table = m[1];
    const cols = m[2].split(',').map(c => c.trim());
    const id = nextId(table);
    const row = { id };
    cols.forEach((c, i) => { row[c] = params[i]; });
    // add timestamps and defaults
    if (table === 'orders') {
      if (!row.created_at) row.created_at = new Date().toISOString();
      if (!row.changed_at) row.changed_at = new Date().toISOString();
      if (!row.status) row.status = 'Placed';
    } else if (table === 'order_status_history' || table === 'newsletter' || table === 'subscriptions') {
      if (!row.created_at) row.created_at = new Date().toISOString();
      if (!row.changed_at) row.changed_at = new Date().toISOString();
    }
    DB[table].push(row);
    save();
    return { meta: { last_insert_rowid: id, changes: 1 } };
  }
  if (s.startsWith('update')) {
    const m = s.match(/update (\w+) set (.+) where (\w+)=(\?|')/);
    // simple: UPDATE orders SET status = ? WHERE id = ?
    if (s.includes('set status = ? where id = ?')) {
      const table = 'orders';
      const [status, id] = params;
      const row = DB[table].find(r => r.id == id);
      if (row) { row.status = status; save(); return { meta: { changes: 1 } }; }
      return { meta: { changes: 0 } };
    }
    return { meta: { changes: 0 } };
  }
  if (sl.startsWith('insert or ignore')) {
    const m = s.match(/insert or ignore into (\w+) \((.*?)\)/i);
    const table = m[1];
    const cols = m[2].split(',').map(c => c.trim());
    const [email] = params;
    const exists = DB[table].find(r => r.email === email);
    if (!exists) {
      const id = nextId(table);
      const row = { id };
      cols.forEach((c, i) => { row[c] = params[i]; });
      row.subscribed_at = new Date().toISOString();
      DB[table].push(row);
      save();
    }
    return { meta: { changes: 1 } };
  }
  return { meta: { changes: 0 } };
}

function get(sql, params = []) {
  const s = sql.trim().toLowerCase();
  if (s.startsWith('select count(*)')) {
    const m = s.match(/from (\w+)/);
    const table = m[1];
    return { c: DB[table].length };
  }
  if (s.includes('where code = ?')) {
    return DB.promo_codes.find(r => r.code === params[0]) || null;
  }
  if (s.includes('where order_number = ?')) {
    return DB.orders.find(r => r.order_number === params[0]) || null;
  }
  if (s.includes('where order_number = ? and email = ?')) {
    return DB.orders.find(r => r.order_number === params[0] && r.email === params[1]) || null;
  }
  if (s.includes('where slug = ?')) {
    return DB.products.find(r => r.slug === params[0] && r.active === 1) || null;
  }
  return null;
}

function all(sql, params = []) {
  const s = sql.trim().toLowerCase();
  if (s.includes('products where active = 1 order by size')) {
    return DB.products.filter(r => r.active === 1).sort((a, b) => a.size.localeCompare(b.size));
  }
  if (s.includes('order_items where order_id = ?')) {
    return DB.order_items.filter(r => r.order_id == params[0]);
  }
  if (s.includes('order_status_history where order_id = ? order by changed_at asc')) {
    return DB.order_status_history.filter(r => r.order_id == params[0]).sort((a, b) => new Date(a.changed_at) - new Date(b.changed_at));
  }
  if (s.includes('orders order by created_at desc')) {
    return [...DB.orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  if (s.includes('newsletter')) return DB.newsletter;
  if (s.includes('select * from orders where')) {
    // generic fallback
    return DB.orders;
  }
  return [];
}

function exec(sql) {
  // used for CREATE TABLE IF NOT EXISTS - no-op since we create arrays in load
  save();
}

function init() {
  load();
  if (!DB.products.length) {
    DB.products.push({ id: nextId('products'), slug: 'huntclock-s', name: 'HuntClock S', size: 'S', weight_range: 'up to 10 kg', price: 2999, description: 'Compact wind-up timer for small dogs. Three hours of treat hunting.', active: 1 });
    DB.products.push({ id: nextId('products'), slug: 'huntclock-m', name: 'HuntClock M', size: 'M', weight_range: '10-25 kg', price: 3499, description: 'Mid-size for medium dogs. More treat capacity, same battery-free clockwork.', active: 1 });
    DB.products.push({ id: nextId('products'), slug: 'huntclock-l', name: 'HuntClock L', size: 'L', weight_range: '25 kg+', price: 3999, description: 'Large for big dogs. Biggest treat capacity and sturdiest base.', active: 1 });
    DB.products.push({ id: nextId('products'), slug: 'disc-pack', name: 'Extra Disc Pack (3 discs)', size: 'accessory', weight_range: 'Easy/Medium/Genius', price: 499, description: 'Swap discs to rearrange puzzle stations. Keeps your dog guessing.', active: 1 });
  }
  if (!DB.promo_codes.length) {
    DB.promo_codes.push({ code: 'HUNT10', discount_percent: 10, active: 1 });
  }
  save();
}

module.exports = { init, run, get, all, exec };
