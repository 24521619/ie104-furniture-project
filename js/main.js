// Code dùng chung cho mọi trang: header & footer, giỏ hàng, cửa sổ đăng nhập / đăng ký, thông báo.
// Thứ tự nạp: js/data.js → js/api.js → js/main.js → file JS của từng trang.

const EMAIL_RE = RULES.email;

/* ---------- Giỏ hàng: dữ liệu lấy từ API (session) ---------- */
const Cart = {
  state: { items: [], count: 0, subtotal: 0, shippingFee: 0, total: 0 },
  set(state) {
    if (state) this.state = state;
    this.render();
    document.dispatchEvent(new CustomEvent('cart:change', { detail: this.state }));
    return this.state;
  },
  async load() {
    try { return this.set(await API.getCart()); }
    catch (e) { console.warn('Không tải được giỏ hàng:', e.message); this.render(); return this.state; }
  },
  async add(productId, qty = 1, color) {
    try {
      this.set(await API.addToCart(productId, qty, color));
      const it = this.state.items.find(i => i.productId === productId);
      toast(`Đã thêm ${qty > 1 ? qty + ' × ' : ''}${it ? it.name : 'sản phẩm'} vào giỏ hàng`);
      return true;
    } catch (e) { toast(e.message); return false; }
  },
  async update(lineId, qty) {
    try { return this.set(await API.updateCartItem(lineId, qty)); } catch (e) { toast(e.message); }
  },
  async remove(lineId) {
    try { return this.set(await API.removeCartItem(lineId)); } catch (e) { toast(e.message); }
  },
  render() {
    const n = this.state.count || 0;
    document.querySelectorAll('[data-cart-count]').forEach(b => { b.textContent = n; b.dataset.n = n; });
    const btn = document.getElementById('cart');
    if (btn) btn.setAttribute('aria-label', `Mở giỏ hàng, ${n} sản phẩm`);
  }
};

/* ---------- Người dùng đang đăng nhập ---------- */
const User = {
  current: null,
  get() { return this.current; },
  set(u) { this.current = u || null; renderHeader(); document.dispatchEvent(new CustomEvent('user:change', { detail: this.current })); },
  async load() { try { this.set(await API.me()); } catch (e) { this.set(null); } }
};

/* ---------- Thông báo nhỏ (toast) ---------- */
let toastTimer;
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
}

/* ---------- Header & footer ---------- */
const NAV = [
  ['home', 'index.html', 'Trang chủ'],
  ['about', 'index.html#about', 'Giới thiệu'],
  ['furniture', 'products.html', 'Sản phẩm'],
  ['gallery', 'index.html#gallery', 'Thư viện ảnh'],
  ['faq', 'index.html#faq', 'Hỏi đáp']
];

function renderHeader() {
  const host = document.getElementById('site-header'); if (!host) return;
  const page = host.dataset.page, u = User.get();
  const open = host.querySelector('.site-menu.open') !== null;
  host.innerHTML = `<div class="site-head">
    <div class="site-w"><div class="site-top">
      <div><span><i>☎</i>+84 123 456 789</span><span><i>✉</i>support@example.com</span></div>
      <div class="site-soc"><a href="https://www.instagram.com" aria-label="Instagram">ig</a><a href="https://www.facebook.com" aria-label="Facebook">f</a><a href="https://www.tiktok.com" aria-label="TikTok">t</a><a href="https://www.linkedin.com" aria-label="LinkedIn">in</a></div>
    </div>
    <header class="site-nav">
      <button class="site-burger" type="button" aria-label="${open ? 'Đóng menu' : 'Mở menu'}" aria-controls="site-menu" aria-expanded="${open}">${open ? '✕' : '☰'}</button>
      <a class="site-logo" href="index.html" aria-label="Akio – Trang chủ">AKIO</a>
      <nav class="site-menu${open ? ' open' : ''}" id="site-menu" aria-label="Menu chính">
        ${NAV.map(([k, href, label]) => `<a href="${href}"${k === page ? ' class="on" aria-current="page"' : ''}>${label}</a>`).join('')}
        ${u ? `<a href="orders.html" class="m-only">Đơn hàng của tôi</a><a href="#" class="m-only" data-signout>Đăng xuất (${esc(u.name)})</a>` : `<a href="#" class="m-only" data-auth="signup">Tạo tài khoản</a>`}
      </nav>
      <div class="site-sign">
        ${u
          ? `<span class="site-user">Xin chào, <b>${esc(u.name)}</b></span><a class="site-orders${page === 'orders' ? ' on' : ''}" href="orders.html">Đơn hàng</a><button type="button" class="site-out" data-signout>Đăng xuất</button>`
          : `<button type="button" class="site-in" data-auth="signin">Đăng nhập</button><button type="button" class="site-su" data-auth="signup">Đăng ký</button>`}
        <button type="button" class="site-cart" id="cart">🛒<span class="badge" data-cart-count>0</span></button>
      </div>
    </header></div></div>`;
  Cart.render();
}

function renderFooter() {
  const host = document.getElementById('site-footer'); if (!host) return;
  const pop = ['everyday-sofa', 'oak-cabinet', 'oak-armchair', 'dining-table'].map(findProduct).filter(Boolean);
  host.innerHTML = `<footer class="site-foot"><div class="site-w">
    <div class="site-fg">
      <div><a class="site-logo" href="index.html">AKIO</a><p>Nội thất êm ái, bền đẹp cho mọi không gian trong ngôi nhà của bạn.</p></div>
      <div><h5>Danh mục</h5>${Object.entries(CATEGORIES).map(([k, v]) => `<a href="products.html#${k}">${v}</a>`).join('')}</div>
      <div><h5>Sản phẩm nổi bật</h5>${pop.map(p => `<a href="product.html#${p.id}">${esc(p.name)}</a>`).join('')}</div>
      <div><h5>Liên kết</h5><a href="index.html">Trang chủ</a><a href="products.html">Sản phẩm</a><a href="orders.html">Đơn hàng của tôi</a><a href="index.html#faq">Hỏi đáp</a></div>
      <div><h5>Theo dõi chúng tôi</h5><a href="https://www.facebook.com">Facebook</a><a href="https://www.instagram.com">Instagram</a><a href="https://www.tiktok.com">TikTok</a><a href="https://www.youtube.com">Youtube</a></div>
    </div>
    <div class="site-cp">© 2026 Akio — Đồ án môn IE104. Bảo lưu mọi quyền.</div>
  </div></footer>`;
}

/* ---------- Cửa sổ nổi (mỗi lúc một cửa sổ) ---------- */
const Modal = {
  el: null, lastFocus: null,
  open(html, wide) {
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'mdl'; this.el.hidden = true;
      this.el.innerHTML = '<div class="mdl-bg" data-close></div><div class="mdl-box" role="dialog" aria-modal="true" aria-labelledby="mdl-title"></div>';
      document.body.appendChild(this.el);
      this.el.addEventListener('click', e => { if (e.target.closest('[data-close]')) this.close(); });
      this.el.addEventListener('keydown', e => this.trap(e));
    }
    if (this.el.hidden) this.lastFocus = document.activeElement;
    const box = this.el.querySelector('.mdl-box');
    const fresh = box.cloneNode(false); box.replaceWith(fresh); // bỏ các listener cũ
    fresh.classList.toggle('wide', !!wide);
    fresh.innerHTML = '<button type="button" class="mdl-x" data-close aria-label="Đóng">×</button>' + html;
    this.el.hidden = false; document.body.classList.add('mdl-open');
    (fresh.querySelector('input,[autofocus]') || fresh.querySelector('.mdl-x')).focus();
    return fresh;
  },
  isOpen() { return this.el && !this.el.hidden; },
  close() {
    if (!this.isOpen()) return;
    this.el.hidden = true; document.body.classList.remove('mdl-open');
    if (this.lastFocus && document.contains(this.lastFocus)) this.lastFocus.focus();
  },
  trap(e) {
    if (e.key === 'Escape') { this.close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...this.el.querySelectorAll('button,input,a[href]')].filter(x => !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
};

// Hiện lỗi theo từng ô nhập. map: tên trường từ API → id ô nhập
function showFieldErrors(root, fields, map) {
  root.querySelectorAll('[aria-invalid=true]').forEach(i => i.setAttribute('aria-invalid', 'false'));
  root.querySelectorAll('.msg').forEach(m => { m.textContent = ''; });
  let first = null;
  Object.entries(fields || {}).forEach(([k, msg]) => {
    const id = map[k] || k, input = root.querySelector('#' + id), m = root.querySelector('#' + id + '-msg');
    if (input) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', id + '-msg'); first = first || input; }
    if (m) m.textContent = msg;
  });
  if (first) first.focus();
  return Object.keys(fields || {}).length === 0;
}

/* ---------- Cửa sổ Đăng nhập / Đăng ký ---------- */
function field(id, label, type, extra = '') {
  const pw = type === 'password';
  return `<div class="fld"><label for="${id}">${label}</label><div class="in">
    <input id="${id}" name="${id}" type="${type}" ${extra}${pw ? ' style="padding-right:64px"' : ''}>
    ${pw ? `<button type="button" class="eye" data-eye="${id}" aria-label="Hiện mật khẩu">Hiện</button>` : ''}
  </div><span class="msg" id="${id}-msg"></span></div>`;
}

function openAuth(mode = 'signin') {
  const up = mode === 'signup';
  const box = Modal.open(`
    <div class="auth-tabs" role="tablist">
      <button type="button" role="tab" aria-selected="${!up}" data-auth="signin">Đăng nhập</button>
      <button type="button" role="tab" aria-selected="${up}" data-auth="signup">Đăng ký</button>
    </div>
    <h2 id="mdl-title">${up ? 'Tạo tài khoản mới' : 'Chào mừng trở lại'}</h2>
    <p class="muted">${up ? 'Lưu giỏ hàng và nhận ưu đãi dành riêng cho thành viên.' : 'Đăng nhập để tiếp tục mua sắm.'}</p>
    <form id="auth-form" novalidate>
      <p class="form-err" id="auth-err" hidden></p>
      ${up ? field('a-name', 'Họ và tên', 'text', 'autocomplete="name" placeholder="Nguyễn Văn A"') : ''}
      ${field('a-email', 'Email', 'email', 'autocomplete="email" placeholder="ban@example.com"')}
      ${field('a-pass', 'Mật khẩu', 'password', `autocomplete="${up ? 'new-password' : 'current-password'}" placeholder="${up ? 'Ít nhất 6 ký tự' : 'Mật khẩu của bạn'}"`)}
      ${up ? field('a-pass2', 'Nhập lại mật khẩu', 'password', 'autocomplete="new-password" placeholder="Nhập lại mật khẩu"') : ''}
      ${up
        ? `<div class="auth-row"><label><input type="checkbox" id="a-terms"> Tôi đồng ý với điều khoản sử dụng</label></div><span class="msg" id="a-terms-msg" style="margin:-12px 0 12px"></span>`
        : `<div class="auth-row" style="justify-content:flex-end"><button type="button" class="linkbtn" data-forgot>Quên mật khẩu?</button></div>`}
      <button type="submit" class="btn-main">${up ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
    </form>
    <p class="auth-sw">${up ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <button type="button" data-auth="${up ? 'signin' : 'signup'}">${up ? 'Đăng nhập' : 'Đăng ký ngay'}</button></p>`);

  const form = box.querySelector('#auth-form'), err = box.querySelector('#auth-err'), btn = form.querySelector('.btn-main');
  const v = id => (box.querySelector('#' + id)?.value || '').trim();
  const MAP = { name: 'a-name', email: 'a-email', password: 'a-pass' };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.hidden = true;
    // Kiểm tra ở trình duyệt trước, backend vẫn kiểm tra lại
    const f = {};
    if (up && v('a-name').length < 2) f.name = 'Vui lòng nhập họ tên.';
    if (!v('a-email')) f.email = 'Vui lòng nhập email.'; else if (!EMAIL_RE.test(v('a-email'))) f.email = 'Email không đúng định dạng.';
    if (!v('a-pass')) f.password = 'Vui lòng nhập mật khẩu.'; else if (up && v('a-pass').length < 6) f.password = 'Mật khẩu cần ít nhất 6 ký tự.';
    if (up && v('a-pass2') !== v('a-pass')) f['a-pass2'] = 'Mật khẩu nhập lại không khớp.';
    if (up && !box.querySelector('#a-terms').checked) f['a-terms'] = 'Vui lòng đồng ý với điều khoản để tiếp tục.';
    if (!showFieldErrors(box, f, MAP)) return;

    btn.disabled = true; const label = btn.textContent; btn.textContent = 'Đang xử lý…';
    try {
      const user = up
        ? await API.register({ name: v('a-name'), email: v('a-email'), password: v('a-pass') })
        : await API.login({ email: v('a-email'), password: v('a-pass') });
      User.set(user);
      Modal.close();
      toast(up ? `Chào mừng ${user.name}! Tài khoản đã được tạo.` : `Đã đăng nhập: ${user.name}`);
      Cart.load(); // backend có thể gộp giỏ hàng sau khi đăng nhập
    } catch (ex) {
      if (ex.fields) showFieldErrors(box, ex.fields, MAP);
      // 404 = server đang chạy là bản cũ chưa có /api/auth
      const msg = ex.status === 404
        ? 'Server đang chạy là bản cũ, chưa có chức năng tài khoản. Hãy tắt server (Ctrl + C) rồi chạy lại "npm start" trong thư mục backend của bản mới nhất.'
        : ex.message;
      if (!ex.fields || ex.status >= 500) { err.textContent = msg; err.hidden = false; }
    } finally { btn.disabled = false; btn.textContent = label; }
  });

  box.addEventListener('click', e => {
    const eye = e.target.closest('[data-eye]');
    if (eye) {
      const i = box.querySelector('#' + eye.dataset.eye), show = i.type === 'password';
      i.type = show ? 'text' : 'password'; eye.textContent = show ? 'Ẩn' : 'Hiện';
      eye.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    }
    if (e.target.closest('[data-forgot]')) { err.textContent = 'Chức năng đặt lại mật khẩu sẽ có trong phiên bản sau.'; err.hidden = false; }
  });
}

/* ---------- Cửa sổ giỏ hàng ---------- */
function cartBody(c) {
  if (!c.items.length) return `<div class="cart-empty">Giỏ hàng đang trống.<br><br><a class="btn-main" style="display:inline-grid;place-items:center;width:auto;padding:0 28px" href="products.html">Xem sản phẩm</a></div>`;
  return `<ul class="cart-list">${c.items.map(i => `
      <li><img src="${esc(i.img)}" alt="">
        <div><a href="product.html#${encodeURIComponent(i.productId)}">${esc(i.name)}</a><small>${esc(i.color || '')}${i.color ? ' · ' : ''}${money(i.price)}</small>
          <div class="cart-q"><button type="button" data-q="${esc(i.lineId)}" data-n="${i.qty - 1}" aria-label="Giảm số lượng ${esc(i.name)}">−</button><span>${i.qty}</span><button type="button" data-q="${esc(i.lineId)}" data-n="${i.qty + 1}" aria-label="Tăng số lượng ${esc(i.name)}"${i.qty >= 99 ? ' disabled' : ''}>+</button></div></div>
        <button type="button" class="cart-rm" data-rm="${esc(i.lineId)}">Xoá</button></li>`).join('')}</ul>
    <div class="cart-sum"><span>Tạm tính</span><span>${money(c.subtotal)}</span></div>
    <div class="cart-act"><button type="button" class="btn-line" data-close>Tiếp tục mua sắm</button><a class="btn-main" href="checkout.html" style="display:grid;place-items:center">Thanh toán</a></div>`;
}

async function openCart() {
  const box = Modal.open(`<h2 id="mdl-title">Giỏ hàng của bạn</h2><p class="muted" id="cart-sub">Đang tải…</p><div id="cart-body"></div>`, true);
  const paint = c => {
    if (!document.contains(box)) return;
    box.querySelector('#cart-sub').textContent = c.items.length ? `${c.count} sản phẩm` : 'Chưa có sản phẩm nào.';
    box.querySelector('#cart-body').innerHTML = cartBody(c);
  };
  paint(Cart.state);
  paint(await Cart.load());
  box.addEventListener('click', async e => {
    const q = e.target.closest('[data-q]'), rm = e.target.closest('[data-rm]');
    if (!q && !rm) return;
    box.querySelectorAll('.cart-list button').forEach(b => { b.disabled = true; });
    const st = q ? await Cart.update(q.dataset.q, +q.dataset.n) : await Cart.remove(rm.dataset.rm);
    paint(st || Cart.state);
  });
}

/* ---------- Bắt sự kiện click toàn trang ---------- */
document.addEventListener('click', async e => {
  const a = e.target.closest('[data-auth]');
  if (a) { e.preventDefault(); closeMenu(); openAuth(a.dataset.auth); return; }
  if (e.target.closest('[data-signout]')) {
    e.preventDefault(); closeMenu();
    try {
      await API.logout(); User.set(null); toast('Bạn đã đăng xuất'); Cart.load();
      document.dispatchEvent(new CustomEvent('user:signout'));
    } catch (ex) { toast(ex.message); }
    return;
  }
  if (e.target.closest('#cart')) { openCart(); return; }
  const add = e.target.closest('[data-add]');
  if (add) {
    e.preventDefault();
    add.disabled = true; await Cart.add(add.dataset.add, 1); add.disabled = false;
    return;
  }
  const burger = e.target.closest('.site-burger');
  if (burger) {
    const m = document.getElementById('site-menu'), open = !m.classList.contains('open');
    m.classList.toggle('open', open); burger.setAttribute('aria-expanded', open);
    burger.textContent = open ? '✕' : '☰'; burger.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    return;
  }
  if (e.target.closest('#site-menu a')) closeMenu();
});

function closeMenu() {
  const m = document.getElementById('site-menu'), b = document.querySelector('.site-burger');
  if (!m || !m.classList.contains('open')) return;
  m.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); b.textContent = '☰'; b.setAttribute('aria-label', 'Mở menu');
}

renderHeader();
renderFooter();
User.load();
Cart.load();
