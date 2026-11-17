// =====================================================================
//  LỚP GỌI API — mọi trang đều lấy dữ liệu qua đối tượng API ở cuối file.
//  Hợp đồng API (đường dẫn, dữ liệu gửi/nhận) xem file API.md.
// =====================================================================

// ---------------- CẤU HÌNH ----------------
// 'mock'   : chạy không cần backend. Dữ liệu lấy từ js/data.js, giỏ hàng/đơn hàng/tài khoản
//            lưu trong localStorage. Dùng để làm và demo frontend.
// 'server' : gọi API thật của backend tại API_BASE (backend dùng session + cookie).
const API_MODE = 'server';
const API_BASE = '/api';
// Nếu frontend và backend chạy khác địa chỉ (vd. Live Server :5500 và Express :3000),
// đặt API_BASE = 'http://localhost:3000/api' và backend phải bật CORS với credentials.
// Cách khuyên dùng: để Express phục vụ luôn thư mục frontend → cùng địa chỉ, không cần CORS.

// ---------------- Lưu trữ an toàn (localStorage có thể bị chặn) ----------------
const Store = {
  mem: {},
  get(k, fallback) {
    try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); }
    catch (e) { return k in this.mem ? this.mem[k] : fallback; }
  },
  set(k, v) {
    this.mem[k] = v;
    try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
};

// Lỗi trả về từ API: message hiển thị cho người dùng, fields = lỗi theo từng ô nhập
class ApiError extends Error {
  constructor(message, status = 400, fields = null) { super(message); this.status = status; this.fields = fields; }
}

// ---------------- Gọi server thật ----------------
async function request(method, path, body) {
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      credentials: 'include', // gửi kèm cookie session
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    throw new ApiError('Không kết nối được máy chủ. Vui lòng kiểm tra backend đã chạy chưa.', 0);
  }
  let json = null;
  try { json = await res.json(); } catch (e) { /* không phải JSON */ }
  if (!json) {
    // Server trả HTML / rỗng thay vì JSON → API chưa có hoặc sai đường dẫn
    if (!res.ok || res.status !== 204) throw new ApiError(`Không đọc được dữ liệu từ máy chủ (API ${method} ${API_BASE + path}, mã ${res.status}).`, 0);
    return null;
  }
  if (!res.ok || json.error) {
    const err = (json && json.error) || {};
    throw new ApiError(err.message || `Máy chủ báo lỗi (${res.status}).`, res.status, err.fields || null);
  }
  return json ? json.data : null;
}

const qs = params => {
  const s = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return s ? '?' + s : '';
};

// ---------------- Kiểm tra dữ liệu (dùng chung cho form và cho mock) ----------------
const RULES = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  phone: /^(0|\+84)(3|5|7|8|9)\d{8}$/ // số di động Việt Nam, vd. 0912345678 hoặc +84912345678
};
const normPhone = s => String(s || '').replace(/[\s.-]/g, '');

function validateOrder(o) {
  const f = {};
  if (!o || typeof o !== 'object') return { _: 'Dữ liệu đơn hàng không hợp lệ.' };
  if (!String(o.name || '').trim() || String(o.name).trim().length < 2) f.name = 'Vui lòng nhập họ tên người nhận.';
  if (!normPhone(o.phone)) f.phone = 'Vui lòng nhập số điện thoại.';
  else if (!RULES.phone.test(normPhone(o.phone))) f.phone = 'Số điện thoại không hợp lệ (vd. 0912345678).';
  if (o.email && !RULES.email.test(String(o.email).trim())) f.email = 'Email không đúng định dạng.';
  if (!String(o.city || '').trim()) f.city = 'Vui lòng chọn tỉnh / thành phố.';
  if (String(o.address || '').trim().length < 5) f.address = 'Vui lòng nhập địa chỉ cụ thể (số nhà, đường, phường/xã).';
  if (!['cod', 'bank'].includes(o.payment)) f.payment = 'Vui lòng chọn phương thức thanh toán.';
  if (String(o.note || '').length > 500) f.note = 'Ghi chú tối đa 500 ký tự.';
  return f;
}

// =====================================================================
//  MOCK — mô phỏng đúng hành vi backend để frontend chạy được khi chưa có server
// =====================================================================
const plain = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const wait = (ms = 120) => new Promise(r => setTimeout(r, ms));
// Băm đơn giản cho bản demo (không dùng cho server thật — server dùng scrypt)
const demoHash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };

const Mock = {
  cartRaw() { const c = Store.get('mock-cart', []); return Array.isArray(c) ? c : []; },
  saveCart(c) { Store.set('mock-cart', c); },

  // Giỏ hàng trả về đúng định dạng của GET /api/cart
  cart() {
    const items = this.cartRaw().map(l => {
      const p = findProduct(l.productId); if (!p) return null;
      return { lineId: l.lineId, productId: p.id, name: p.name, img: p.img, color: l.color, price: p.price, qty: l.qty, lineTotal: p.price * l.qty };
    }).filter(Boolean);
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    return { items, count: items.reduce((s, i) => s + i.qty, 0), subtotal, shippingFee: 0, total: subtotal };
  },

  products({ cat, q, min, max, page = 1, limit = 12 } = {}) {
    let list = PRODUCTS.slice();
    if (cat && cat !== 'all') list = list.filter(p => p.cat === cat);
    if (q) { const k = plain(q.trim()); list = list.filter(p => plain(p.name + ' ' + p.desc).includes(k)); }
    if (min !== undefined && min !== '') list = list.filter(p => p.price >= +min);
    if (max !== undefined && max !== '') list = list.filter(p => p.price <= +max);
    limit = Math.max(1, Math.min(100, +limit || 12));
    const total = list.length, totalPages = Math.max(1, Math.ceil(total / limit));
    page = Math.min(Math.max(1, +page || 1), totalPages);
    return { items: list.slice((page - 1) * limit, page * limit), page, limit, total, totalPages };
  },

  product(id) {
    const p = findProduct(id);
    if (!p) throw new ApiError('Không tìm thấy sản phẩm.', 404);
    return p;
  },

  addToCart({ productId, qty = 1, color } = {}) {
    const p = findProduct(productId);
    if (!p) throw new ApiError('Sản phẩm không tồn tại.', 404);
    qty = Math.floor(+qty);
    if (!(qty >= 1 && qty <= 99)) throw new ApiError('Số lượng phải từ 1 đến 99.', 400, { qty: 'Số lượng phải từ 1 đến 99.' });
    color = color || p.colors[0][0];
    if (!p.colors.some(c => c[0] === color)) throw new ApiError('Màu sắc không hợp lệ.', 400, { color: 'Màu sắc không hợp lệ.' });
    const lineId = `${p.id}__${plain(color).replace(/[^a-z0-9]+/g, '-')}`;
    const c = this.cartRaw(), line = c.find(l => l.lineId === lineId);
    if (line) line.qty = Math.min(99, line.qty + qty); else c.push({ lineId, productId: p.id, color, qty });
    this.saveCart(c);
    return this.cart();
  },

  updateCart(lineId, qty) {
    const c = this.cartRaw(), line = c.find(l => l.lineId === lineId);
    if (!line) throw new ApiError('Sản phẩm không có trong giỏ hàng.', 404);
    qty = Math.floor(+qty);
    if (!(qty >= 0 && qty <= 99)) throw new ApiError('Số lượng phải từ 0 đến 99.', 400);
    if (qty === 0) c.splice(c.indexOf(line), 1); else line.qty = qty;
    this.saveCart(c);
    return this.cart();
  },

  removeFromCart(lineId) {
    this.saveCart(this.cartRaw().filter(l => l.lineId !== lineId));
    return this.cart();
  },

  createOrder(body) {
    const cart = this.cart();
    if (!cart.items.length) throw new ApiError('Giỏ hàng đang trống, không thể đặt hàng.', 400);
    const fields = validateOrder(body);
    if (Object.keys(fields).length) throw new ApiError('Vui lòng kiểm tra lại thông tin đặt hàng.', 422, fields);
    const now = new Date(), d = now.toISOString().slice(0, 10).replace(/-/g, '');
    const code = `AKIO-${d}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const order = {
      code, createdAt: now.toISOString(), status: 'pending',
      customer: { name: body.name.trim(), phone: normPhone(body.phone), email: (body.email || '').trim(), city: body.city, address: body.address.trim(), note: (body.note || '').trim() },
      payment: body.payment, items: cart.items, subtotal: cart.subtotal, shippingFee: cart.shippingFee, total: cart.total
    };
    const u = Store.get('mock-user', null); if (u) order.userEmail = u.email;
    const orders = Store.get('mock-orders', {}); orders[code] = order; Store.set('mock-orders', orders);
    this.saveCart([]); // đặt hàng xong thì xoá giỏ
    return order;
  },

  orders() {
    const u = Store.get('mock-user', null);
    return Object.values(Store.get('mock-orders', {}))
      .filter(o => !o.userEmail || (u && o.userEmail === u.email))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  },

  order(code) {
    const o = Store.get('mock-orders', {})[code];
    if (!o) throw new ApiError('Không tìm thấy đơn hàng.', 404);
    return o;
  },

  me() { return Store.get('mock-user', null); },

  register({ name, email, password } = {}) {
    const f = {};
    name = String(name || '').trim(); email = String(email || '').trim().toLowerCase();
    if (name.length < 2) f.name = 'Vui lòng nhập họ tên.';
    if (!RULES.email.test(email)) f.email = 'Email không đúng định dạng.';
    if (String(password || '').length < 6) f.password = 'Mật khẩu cần ít nhất 6 ký tự.';
    if (Object.keys(f).length) throw new ApiError('Vui lòng kiểm tra lại thông tin.', 422, f);
    const acc = Store.get('mock-accounts', {});
    if (acc[email]) throw new ApiError('Email này đã được đăng ký.', 409, { email: 'Email này đã được đăng ký. Bạn hãy đăng nhập.' });
    acc[email] = { name, pw: demoHash(email + '|' + password) }; Store.set('mock-accounts', acc); // chỉ lưu bản băm
    const user = { name, email }; Store.set('mock-user', user);
    return user;
  },

  login({ email, password } = {}) {
    email = String(email || '').trim().toLowerCase();
    if (!email || !password) throw new ApiError('Vui lòng nhập email và mật khẩu.', 422);
    const a = Store.get('mock-accounts', {})[email];
    if (!a || (a.pw && a.pw !== demoHash(email + '|' + password))) throw new ApiError('Email hoặc mật khẩu không đúng.', 401);
    const user = { name: a.name, email }; Store.set('mock-user', user);
    return user;
  },

  logout() { Store.set('mock-user', null); return null; }
};

// Bọc mock thành bất đồng bộ giống fetch thật
async function viaMock(fn) { await wait(); return JSON.parse(JSON.stringify(fn() ?? null)); }

// =====================================================================
//  API dùng trong các trang
// =====================================================================
const isMock = API_MODE === 'mock';
const API = {
  // Sản phẩm
  getProducts: (params = {}) => isMock ? viaMock(() => Mock.products(params)) : request('GET', '/products' + qs(params)),
  getProduct: id => isMock ? viaMock(() => Mock.product(id)) : request('GET', '/products/' + encodeURIComponent(id)),
  // Giỏ hàng (lưu trong session)
  getCart: () => isMock ? viaMock(() => Mock.cart()) : request('GET', '/cart'),
  addToCart: (productId, qty = 1, color) => isMock ? viaMock(() => Mock.addToCart({ productId, qty, color })) : request('POST', '/cart', { productId, qty, color }),
  updateCartItem: (lineId, qty) => isMock ? viaMock(() => Mock.updateCart(lineId, qty)) : request('PATCH', '/cart/items/' + encodeURIComponent(lineId), { qty }),
  removeCartItem: lineId => isMock ? viaMock(() => Mock.removeFromCart(lineId)) : request('DELETE', '/cart/items/' + encodeURIComponent(lineId)),
  // Đơn hàng
  createOrder: body => isMock ? viaMock(() => Mock.createOrder(body)) : request('POST', '/orders', body),
  getOrders: () => isMock ? viaMock(() => Mock.orders()) : request('GET', '/orders'),
  getOrder: code => isMock ? viaMock(() => Mock.order(code)) : request('GET', '/orders/' + encodeURIComponent(code)),
  // Tài khoản
  me: () => isMock ? viaMock(() => Mock.me()) : request('GET', '/auth/me'),
  register: body => isMock ? viaMock(() => Mock.register(body)) : request('POST', '/auth/register', body),
  login: body => isMock ? viaMock(() => Mock.login(body)) : request('POST', '/auth/login', body),
  logout: () => isMock ? viaMock(() => Mock.logout()) : request('POST', '/auth/logout')
};
