// Trang thanh toán: hiện tóm tắt giỏ hàng, kiểm tra form, gửi POST /api/orders.
// Thành công → chuyển sang order-success.html#<mã đơn>
const $ = id => document.getElementById(id);
const form = $('co');

// 34 tỉnh, thành phố (sau sắp xếp đơn vị hành chính 2025)
const CITIES = ['TP. Hà Nội', 'TP. Hồ Chí Minh', 'TP. Hải Phòng', 'TP. Đà Nẵng', 'TP. Cần Thơ', 'TP. Huế',
  'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Tĩnh',
  'Hưng Yên', 'Khánh Hoà', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Nghệ An', 'Ninh Bình', 'Phú Thọ',
  'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh', 'Thái Nguyên', 'Thanh Hoá', 'Tuyên Quang', 'Vĩnh Long'];
$('c-city').insertAdjacentHTML('beforeend', CITIES.map(c => `<option>${c}</option>`).join(''));

// Tên trường API → id ô nhập
const MAP = { name: 'c-name', phone: 'c-phone', email: 'c-email', city: 'c-city', address: 'c-address', note: 'c-note', payment: 'c-payment' };
let loaded = false, submitting = false;

function paint(c) {
  if (submitting) return;
  loaded = true;
  const empty = !c.items.length;
  $('co-empty').hidden = !empty; form.hidden = empty;
  if (empty) return;
  $('sum-list').innerHTML = c.items.map(i => `<li><img src="${esc(i.img)}" alt=""><div><b>${esc(i.name)}</b><small>${esc(i.color || '')}${i.color ? ' · ' : ''}SL: ${i.qty}</small></div><span>${money(i.lineTotal)}</span></li>`).join('');
  $('sum-sub').textContent = money(c.subtotal);
  $('sum-ship').textContent = c.shippingFee ? money(c.shippingFee) : 'Miễn phí';
  $('sum-ship').className = c.shippingFee ? '' : 'free';
  $('sum-tot').textContent = money(c.total);
}
document.addEventListener('cart:change', e => paint(e.detail));

// Điền sẵn tên và email nếu đã đăng nhập
document.addEventListener('user:change', e => {
  const u = e.detail; if (!u) return;
  if (!$('c-name').value) $('c-name').value = u.name || '';
  if (!$('c-email').value) $('c-email').value = u.email || '';
});

const data = () => ({
  name: $('c-name').value.trim(),
  phone: $('c-phone').value.trim(),
  email: $('c-email').value.trim(),
  city: $('c-city').value,
  address: $('c-address').value.trim(),
  note: $('c-note').value.trim(),
  payment: (form.querySelector('[name=payment]:checked') || {}).value || ''
});

// Kiểm tra ngay khi rời khỏi ô nhập
form.addEventListener('focusout', e => {
  const key = Object.keys(MAP).find(k => MAP[k] === e.target.id); if (!key) return;
  const msg = validateOrder(data())[key] || '';
  if (!msg || e.target.value) { e.target.setAttribute('aria-invalid', msg ? 'true' : 'false'); $(e.target.id + '-msg').textContent = msg; }
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  $('co-err').hidden = true;
  const body = data();
  const errs = validateOrder(body); // cùng quy tắc với backend (js/api.js)
  if (!showFieldErrors(form, errs, MAP)) { $('co-err').textContent = 'Vui lòng kiểm tra lại các ô được đánh dấu.'; $('co-err').hidden = false; return; }

  submitting = true;
  const btn = $('co-btn'); btn.disabled = true; btn.textContent = 'Đang đặt hàng…';
  try {
    const order = await API.createOrder(body);
    Cart.set({ items: [], count: 0, subtotal: 0, shippingFee: 0, total: 0 });
    location.href = 'order-success.html#' + encodeURIComponent(order.code);
  } catch (ex) {
    submitting = false;
    if (ex.fields) showFieldErrors(form, ex.fields, MAP);
    $('co-err').textContent = ex.message; $('co-err').hidden = false;
    $('co-err').scrollIntoView({ behavior: 'smooth', block: 'center' });
    Cart.load(); // giỏ hàng có thể đã thay đổi ở tab khác
  } finally {
    if (!submitting) { btn.disabled = false; btn.textContent = 'Đặt hàng'; }
  }
});

$('co-edit').addEventListener('click', e => { e.preventDefault(); openCart(); });

// main.js đã gọi Cart.load(); nếu kết quả về trước khi file này chạy thì vẽ lại từ state
if (Cart.state.items.length) paint(Cart.state);
Cart.load().then(paint);
