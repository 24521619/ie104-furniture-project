// Kiểm tra toàn bộ API trên server ĐANG CHẠY (giống trình duyệt: có cookie session).
// Cách chạy: mở 1 terminal chạy `npm start`, terminal khác chạy `npm run check`
// Đổi địa chỉ:  BASE=http://localhost:4000 npm run check

const BASE = (process.env.BASE || 'http://localhost:3000').replace(/\/$/, '');

let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name + (extra ? '\n      ' + extra : '')); }
};

// Mỗi "khách" có cookie riêng → session riêng
function client() {
  let cookie = '';
  return async (method, path, body, raw) => {
    const res = await fetch(BASE + path, {
      method,
      headers: { ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    let json = null; try { json = await res.json(); } catch (e) {}
    return { status: res.status, json };
  };
}

const GOOD = { name: 'Bùi Đức Phúc', phone: '0912 345 678', email: '', city: 'TP. Hồ Chí Minh', address: '12 Lê Lợi, Bến Thành', note: '', payment: 'cod' };

(async () => {
  const A = client(), B = client();
  try { await A('GET', '/api/health'); }
  catch (e) { console.log(`Không kết nối được ${BASE}. Hãy chạy "npm start" trước.`); process.exit(1); }

  console.log(`\nKiểm tra API tại ${BASE}\n\nSản phẩm`);
  let r = await A('GET', '/api/products?limit=8');
  ok(r.status === 200 && r.json.data.items.length === 8 && r.json.data.total === 9 && r.json.data.totalPages === 2, 'danh sách: 8/trang, tổng 9, 2 trang');
  r = await A('GET', '/api/products?q=' + encodeURIComponent('go soi'));
  ok(r.json.data.items.length === 2, 'tìm "go soi" (không dấu) → 2 sản phẩm gỗ sồi');
  r = await A('GET', '/api/products?cat=sofa');
  ok(r.json.data.items.every(p => p.cat === 'sofa') && r.json.data.total === 2, 'lọc danh mục sofa → 2');
  r = await A('GET', '/api/products?min=10000000');
  ok(r.json.data.items.every(p => p.price >= 10000000) && r.json.data.total === 2, 'lọc giá từ 10 triệu → 2');
  r = await A('GET', '/api/products?page=99&limit=8');
  ok(r.json.data.page === 2, 'trang quá lớn → trả trang cuối');
  r = await A('GET', '/api/products?min=5000000&max=1000000');
  ok(r.status === 400 && r.json.error.message, 'min > max → 400 có câu báo lỗi');
  r = await A('GET', '/api/products/everyday-sofa');
  ok(r.status === 200 && r.json.data.name, 'chi tiết sản phẩm');
  r = await A('GET', '/api/products/khong-co');
  ok(r.status === 404, 'sản phẩm không tồn tại → 404');

  console.log('\nGiỏ hàng');
  r = await A('GET', '/api/cart');
  ok(r.status === 200 && r.json.data.count === 0, 'giỏ ban đầu trống');
  r = await A('POST', '/api/cart', { productId: 'everyday-sofa', qty: 2, color: 'Xanh navy' });
  ok(r.status === 200 && r.json.data.count === 2, 'thêm 2 sofa xanh navy');
  r = await A('POST', '/api/cart', { productId: 'everyday-sofa', qty: 1 });
  ok(r.json.data.items.length === 2 && r.json.data.count === 3, 'cùng sản phẩm khác màu → 2 dòng');
  r = await A('POST', '/api/cart', { productId: 'everyday-sofa', qty: 1, color: 'Xanh navy' });
  ok(r.json.data.items.find(i => i.color === 'Xanh navy').qty === 3, 'cùng màu → cộng dồn');
  ok(r.json.data.subtotal === 7190000 * 4, 'tổng tiền tính theo giá server', `subtotal = ${r.json.data.subtotal}`);
  for (const [body, name] of [[{ productId: 'everyday-sofa', qty: -5 }, 'qty âm'], [{ productId: 'everyday-sofa', qty: '2' }, 'qty là chuỗi'], [{ productId: 'everyday-sofa', qty: 1, color: 'Hồng' }, 'màu không có'], [{ productId: 'khong-co', qty: 1 }, 'sản phẩm lạ']]) {
    r = await A('POST', '/api/cart', body);
    ok(r.status >= 400 && r.status < 500 && r.json.error.message, `${name} → lỗi ${r.status}`);
  }
  const line = (await A('GET', '/api/cart')).json.data.items[0].lineId;
  r = await A('PATCH', '/api/cart/items/' + encodeURIComponent(line), { qty: 1 });
  ok(r.json.data.count === 2, 'đổi số lượng');
  r = await A('GET', '/api/cart'); const B0 = await B('GET', '/api/cart');
  ok(B0.json.data.count === 0 && r.json.data.count === 2, 'khách khác có giỏ riêng (session riêng)');

  console.log('\nĐặt hàng');
  r = await B('POST', '/api/orders', GOOD);
  ok(r.status === 400 && /trống/.test(r.json.error.message), 'giỏ trống → 400');
  r = await A('POST', '/api/orders', undefined, '{name:');
  ok(r.status === 400 && r.json.error.message === 'Dữ liệu gửi lên không hợp lệ.', 'JSON hỏng → 400 thân thiện');
  r = await A('POST', '/api/orders', { ...GOOD, phone: '123', address: '' });
  ok(r.status === 422 && r.json.error.fields.phone && r.json.error.fields.address, 'sai số điện thoại + thiếu địa chỉ → 422 kèm fields');
  ok((await A('GET', '/api/cart')).json.data.count === 2, 'đặt lỗi thì giỏ hàng vẫn còn');
  r = await A('POST', '/api/orders', { ...GOOD, total: 1 });
  const order = r.json && r.json.data;
  ok(r.status === 201 && /^AKIO-\d{8}-[A-Z0-9]{4}$/.test(order.code), 'đặt hàng đúng → 201 + mã AKIO-…', JSON.stringify(r.json));
  ok(order && order.total === 7190000 * 2, 'tổng tiền đơn lấy từ server, bỏ qua "total" gửi lên');
  const today = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10).replace(/-/g, '');
  ok(order && order.code.includes(today), 'mã đơn theo ngày giờ Việt Nam');
  ok((await A('GET', '/api/cart')).json.data.count === 0, 'đặt xong giỏ hàng về 0');
  r = await A('GET', '/api/orders/' + order.code);
  ok(r.status === 200 && r.json.data.code === order.code, 'xem lại đơn vừa đặt');
  r = await B('GET', '/api/orders/' + order.code);
  ok(r.status === 404, 'khách khác không xem được đơn → 404');

  console.log('\nTài khoản');
  const C = client(), D = client();
  const email = `kiemtra-${Date.now()}@example.com`; // tài khoản thử, mỗi lần chạy một email mới
  r = await C('GET', '/api/auth/me');
  ok(r.status === 200 && r.json.data === null, 'chưa đăng nhập → /me trả null');
  r = await C('POST', '/api/auth/register', { name: 'A', email: 'sai', password: '1' });
  ok(r.status === 422 && r.json.error.fields.email && r.json.error.fields.password, 'đăng ký sai → 422 kèm fields');
  await C('POST', '/api/cart', { productId: 'side-table', qty: 1 });
  r = await C('POST', '/api/auth/register', { name: 'Kiểm Tra', email, password: 'matkhau123' });
  ok(r.status === 201 && r.json.data.email === email && !('password' in r.json.data) && !('hash' in r.json.data), 'đăng ký đúng → 201, không trả mật khẩu');
  ok((await C('GET', '/api/cart')).json.data.count === 1, 'đăng ký xong vẫn giữ giỏ hàng');
  r = await C('POST', '/api/auth/register', { name: 'Trùng', email: email.toUpperCase(), password: 'matkhau123' });
  ok(r.status === 409, 'email trùng (khác hoa thường) → 409');
  r = await C('POST', '/api/orders', GOOD);
  const myCode = r.json && r.json.data && r.json.data.code;
  ok(r.status === 201, 'đặt hàng khi đã đăng nhập');
  r = await C('POST', '/api/auth/logout');
  ok(r.status === 200 && (await C('GET', '/api/auth/me')).json.data === null, 'đăng xuất');
  ok((await C('GET', '/api/orders/' + myCode)).status === 404, 'đăng xuất rồi thì không xem được đơn');
  r = await D('POST', '/api/auth/login', { email, password: 'saimatkhau' });
  ok(r.status === 401 && r.json.error.message === 'Email hoặc mật khẩu không đúng.', 'sai mật khẩu → 401');
  r = await D('POST', '/api/auth/login', { email: email.toUpperCase(), password: 'matkhau123' });
  ok(r.status === 200 && r.json.data.name === 'Kiểm Tra', 'đăng nhập ở máy khác → 200');
  r = await D('GET', '/api/orders');
  ok(r.status === 200 && r.json.data.some(o => o.code === myCode), 'thấy lại đơn cũ trong "Đơn hàng của tôi"');
  ok((await D('GET', '/api/orders/' + myCode)).status === 200, 'mở được chi tiết đơn cũ');
  ok((await B('GET', '/api/orders')).json.data.every(o => o.code !== myCode), 'người khác không thấy đơn này');

  console.log('\nKhác');
  r = await A('GET', '/api/khong-co');
  ok(r.status === 404 && r.json.error.message, 'API không tồn tại → 404 JSON');
  const src = await fetch(BASE + '/backend/server.js');
  ok(src.status === 404, 'không xem được mã nguồn backend qua trình duyệt');
  for (const pg of ['index.html', 'products.html', 'product.html', 'checkout.html', 'order-success.html', 'orders.html']) {
    ok((await fetch(BASE + '/' + pg)).status === 200, `trang ${pg} mở được`);
  }
  const big = await A('POST', '/api/orders', undefined, JSON.stringify({ note: 'x'.repeat(30000) }));
  ok(big.status === 413, 'gửi dữ liệu quá lớn → 413');

  console.log(`\n${pass} đạt, ${fail} lỗi`);
  process.exit(fail ? 1 : 0);
})();
