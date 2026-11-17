// Trang "Đơn hàng của tôi": GET /api/orders
// Đã đăng nhập → mọi đơn của tài khoản. Chưa đăng nhập → chỉ các đơn đặt trong phiên này.
const list = document.getElementById('ol'), note = document.getElementById('ol-note');
const PAY_SHORT = { cod: 'COD', bank: 'Chuyển khoản' };
const STATUS = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao', done: 'Hoàn tất', cancelled: 'Đã huỷ' };

async function load() {
  const u = User.get();
  note.hidden = !!u;
  note.innerHTML = u ? '' : `Bạn chưa đăng nhập nên chỉ thấy đơn đặt trong lần truy cập này.
    <button type="button" class="linkbtn" data-auth="signin">Đăng nhập</button> để xem mọi đơn của tài khoản.`;
  list.innerHTML = '<p class="ol-empty">Đang tải…</p>';
  const sub = document.getElementById('ol-sub'); sub.textContent = 'Xem lại các đơn bạn đã đặt.';
  try {
    const orders = await API.getOrders();
    if (!orders.length) {
      list.innerHTML = `<div class="ol-empty"><h2>Chưa có đơn hàng nào</h2><p>Khi bạn đặt hàng, đơn sẽ hiện ở đây.</p>
        <p><a class="btn-main" href="products.html" style="display:inline-grid;place-items:center;width:auto;padding:0 28px">Mua sắm ngay</a></p></div>`;
      return;
    }
    list.innerHTML = orders.map(o => {
      const items = o.items || [];
      const count = items.reduce((s, i) => s + i.qty, 0);
      const when = o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '';
      return `<a class="ol-row" href="order-success.html#${encodeURIComponent(o.code)}">
        <div class="ol-imgs">${items.slice(0, 3).map(i => `<img src="${esc(i.img)}" alt="">`).join('')}</div>
        <div class="ol-main"><b>${esc(o.code)}</b><small>${esc(when)} · ${count} sản phẩm · ${esc(PAY_SHORT[o.payment] || o.payment || '')}</small>
          <small>${esc(items.map(i => i.name).slice(0, 2).join(', '))}${items.length > 2 ? '…' : ''}</small></div>
        <div class="ol-side"><span class="ol-st">${esc(STATUS[o.status] || o.status || '')}</span><b>${money(o.total)}</b></div>
      </a>`;
    }).join('');
    sub.textContent = `${orders.length} đơn hàng`;
  } catch (e) {
    list.innerHTML = `<div class="ol-empty"><p>${esc(e.message)}</p><button type="button" class="retry" data-retry>Thử lại</button></div>`;
  }
}

list.addEventListener('click', e => { if (e.target.closest('[data-retry]')) load(); });
// Tải lại khi đăng nhập / đăng xuất (main.js phát sự kiện user:change)
document.addEventListener('user:change', load);
