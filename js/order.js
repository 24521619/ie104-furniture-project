// Trang xác nhận đơn hàng: GET /api/orders/:code, mã đơn nằm trên địa chỉ: order-success.html#<mã đơn>
const box = document.getElementById('ok');
const PAY = { cod: 'Thanh toán khi nhận hàng (COD)', bank: 'Chuyển khoản ngân hàng' };

async function load() {
  const code = decodeURIComponent(location.hash.slice(1));
  if (!code) { notFound('Thiếu mã đơn hàng.'); return; }
  try {
    const o = await API.getOrder(code);
    const c = o.customer || {};
    const time = o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '';
    box.innerHTML = `
      <div class="ok-top">
        <div class="ok-ic" aria-hidden="true">✓</div>
        <h1>Đặt hàng thành công!</h1>
        <p>Cảm ơn ${esc(c.name || 'bạn')}. Chúng tôi sẽ gọi đến số ${esc(c.phone || '')} để xác nhận đơn trong thời gian sớm nhất.</p>
        <div class="ok-code">Mã đơn: ${esc(o.code)}</div>
      </div>
      <div class="ok-grid">
        <div class="ok-box"><h3>Giao đến</h3><p><b>${esc(c.name || '')}</b> · ${esc(c.phone || '')}</p><p>${esc(c.address || '')}${c.city ? ', ' + esc(c.city) : ''}</p>${c.email ? `<p>${esc(c.email)}</p>` : ''}${c.note ? `<p><i>Ghi chú: ${esc(c.note)}</i></p>` : ''}</div>
        <div class="ok-box"><h3>Thanh toán</h3><p>${esc(PAY[o.payment] || o.payment || '')}</p>
          ${o.payment === 'bank' ? `<p>Chuyển khoản với nội dung <b>${esc(o.code)}</b>. Nhân viên sẽ gửi số tài khoản khi gọi xác nhận.</p>` : ''}
          ${time ? `<p>Đặt lúc: ${esc(time)}</p>` : ''}</div>
      </div>
      <div class="sum" style="position:static">
        <h2>Sản phẩm đã đặt</h2>
        <ul>${(o.items || []).map(i => `<li><img src="${esc(i.img)}" alt=""><div><b>${esc(i.name)}</b><small>${esc(i.color || '')}${i.color ? ' · ' : ''}SL: ${i.qty}</small></div><span>${money(i.lineTotal)}</span></li>`).join('')}</ul>
        <div class="ln"><span>Tạm tính</span><span>${money(o.subtotal)}</span></div>
        <div class="ln"><span>Phí vận chuyển</span><span class="${o.shippingFee ? '' : 'free'}">${o.shippingFee ? money(o.shippingFee) : 'Miễn phí'}</span></div>
        <div class="tot" style="margin-bottom:0"><span>Tổng cộng</span><span>${money(o.total)}</span></div>
      </div>
      <div class="ok-act"><a class="btn-main" href="products.html">Tiếp tục mua sắm</a><a class="btn-line" href="orders.html" style="display:inline-grid;place-items:center">Đơn hàng của tôi</a></div>`;
    document.title = `Akio — Đơn hàng ${o.code}`;
  } catch (e) {
    notFound(e.status === 404 ? (User.get() ? 'Không tìm thấy đơn hàng này trong tài khoản của bạn.' : 'Không tìm thấy đơn hàng. Nếu bạn đặt đơn khi đã đăng nhập, hãy đăng nhập để xem lại.') : e.message);
  }
}

function notFound(msg) {
  box.innerHTML = `<div class="ok-top"><h1>Không xem được đơn hàng</h1><p>${esc(msg)}</p></div><div class="ok-act"><a class="btn-main" href="products.html">Xem sản phẩm</a></div>`;
}

window.addEventListener('hashchange', load);
document.addEventListener('user:change', load); // đăng nhập xong thì tải lại đơn
