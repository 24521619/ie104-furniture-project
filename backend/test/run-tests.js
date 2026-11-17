// Chạy:  node test/run-tests.js   (trong thư mục backend, sau khi đã `npm install express`)
// Không cần chạy server — gọi thẳng các hàm và route handler với req/res giả.

const assert = require('node:assert/strict');
const os = require('node:os'), fs = require('node:fs'), path = require('node:path');
process.env.USERS_FILE = path.join(os.tmpdir(), `akio-users-test-${process.pid}.json`); // không đụng vào dữ liệu thật
const { validateOrder, normPhone, cleanOrder } = require('../lib/validate');
const { plain, filterProducts, paginate } = require('../lib/filter');
const { ApiError, errorHandler, notFoundApi } = require('../lib/errors');
const { products } = require('./products.sample.json');
const { cartSummary, sampleCart } = require('./fake-cart');

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + e.message.split('\n').join('\n      ')); }
}

// Response giả để thử route và errorHandler
function fakeRes() {
  return { statusCode: 200, body: undefined, headersSent: false,
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; this.headersSent = true; return this; } };
}
// Gọi handler; lỗi được chuyển sang errorHandler giống Express
function call(handler, req) {
  const res = fakeRes();
  handler(req, res, err => { if (err) errorHandler(err, req, res, () => {}); });
  return res;
}

const GOOD = { name: 'Bùi Đức Phúc', phone: '0912 345 678', email: 'phuc@example.com', city: 'TP. Hồ Chí Minh', address: '12 Lê Lợi, Bến Thành', note: '', payment: 'cod' };

console.log('\nlib/validate.js');
test('đơn hợp lệ → không có lỗi', () => assert.deepEqual(validateOrder(GOOD), {}));
test('body trống → báo đủ 5 trường bắt buộc', () => assert.deepEqual(Object.keys(validateOrder({})).sort(), ['address', 'city', 'name', 'payment', 'phone']));
test('không phải object → lỗi chung', () => { assert.ok(validateOrder(null)._); assert.ok(validateOrder([1])._); assert.ok(validateOrder('abc')._); });
test('số điện thoại sai: 123, 0123456789, 091234567, chữ', () => {
  for (const phone of ['123', '0123456789', '091234567', 'abcdefghij', '09123456789']) assert.ok(validateOrder({ ...GOOD, phone }).phone, phone);
});
test('số điện thoại đúng: có khoảng trắng / dấu chấm / +84', () => {
  for (const phone of ['0912345678', '0912 345 678', '0912.345.678', '+84912345678', '0388-123-456']) assert.equal(validateOrder({ ...GOOD, phone }).phone, undefined, phone);
});
test('email không bắt buộc, nhưng có thì phải đúng', () => {
  assert.equal(validateOrder({ ...GOOD, email: '' }).email, undefined);
  assert.ok(validateOrder({ ...GOOD, email: 'abc@' }).email);
});
test('địa chỉ < 5 ký tự, ghi chú > 500 ký tự, payment lạ → lỗi', () => {
  assert.ok(validateOrder({ ...GOOD, address: '12' }).address);
  assert.ok(validateOrder({ ...GOOD, note: 'a'.repeat(501) }).note);
  assert.ok(validateOrder({ ...GOOD, payment: 'momo' }).payment);
});
test('tên toàn khoảng trắng → lỗi', () => assert.ok(validateOrder({ ...GOOD, name: '   ' }).name));
test('normPhone + cleanOrder chuẩn hoá dữ liệu', () => {
  assert.equal(normPhone('0912 345.678'), '0912345678');
  assert.deepEqual(cleanOrder({ ...GOOD, name: '  Phúc  ' }), { name: 'Phúc', phone: '0912345678', email: 'phuc@example.com', city: 'TP. Hồ Chí Minh', address: '12 Lê Lợi, Bến Thành', note: '' });
});

console.log('\nlib/filter.js');
const names = list => list.map(p => p.id).sort();
test('plain bỏ dấu tiếng Việt', () => { assert.equal(plain('Gỗ Sồi ĐẸP'), 'go soi dep'); assert.equal(plain(undefined), ''); });
test('không lọc → đủ 9 sản phẩm', () => assert.equal(filterProducts(products, {}).length, 9));
test('"go soi" không dấu → tìm ra sản phẩm gỗ sồi', () => assert.deepEqual(names(filterProducts(products, { q: 'go soi' })), ['oak-armchair', 'oak-cabinet']));
test('"SOFA" viết hoa → ra đủ sofa', () => assert.ok(filterProducts(products, { q: 'SOFA' }).length >= 2));
test('cat=sofa → 2, cat=all → 9, cat lạ → 0', () => {
  assert.equal(filterProducts(products, { cat: 'sofa' }).length, 2);
  assert.equal(filterProducts(products, { cat: 'all' }).length, 9);
  assert.equal(filterProducts(products, { cat: 'xyz' }).length, 0);
});
test('khoảng giá (query string là chuỗi) bao gồm hai đầu', () => {
  assert.equal(filterProducts(products, { min: '10000000' }).length, 2);
  assert.ok(filterProducts(products, { max: '2000000' }).every(p => p.price <= 2000000));
  assert.deepEqual(names(filterProducts(products, { min: '2290000', max: '2290000' })), ['lounge-chair']);
});
test('min/max rỗng hoặc không phải số → bỏ qua', () => {
  assert.equal(filterProducts(products, { min: '', max: 'abc' }).length, 9);
});
test('kết hợp cat + q + giá', () => assert.deepEqual(names(filterProducts(products, { cat: 'table', q: 'ban', max: '5000000' })), ['office-desk', 'side-table']));
test('list không phải mảng → trả mảng rỗng', () => assert.deepEqual(filterProducts(null, {}), []));
test('paginate: trang 1 & trang cuối', () => {
  const p1 = paginate(products, { page: '1', limit: '8' });
  assert.deepEqual([p1.items.length, p1.page, p1.total, p1.totalPages], [8, 1, 9, 2]);
  assert.equal(paginate(products, { page: '2', limit: '8' }).items.length, 1);
});
test('paginate: page quá lớn → trang cuối, giá trị lạ → mặc định', () => {
  assert.equal(paginate(products, { page: '99', limit: '8' }).page, 2);
  const d = paginate(products, { page: 'abc', limit: '-5' });
  assert.deepEqual([d.page, d.limit], [1, 1]);
  assert.equal(paginate(products, {}).limit, 12);
  assert.equal(paginate(products, { limit: '1000' }).limit, 100);
});

console.log('\nlib/errors.js');
test('ApiError 422 → trả message + fields', () => {
  const res = fakeRes(); errorHandler(new ApiError('Sai', 422, { phone: 'x' }), {}, res, () => {});
  assert.equal(res.statusCode, 422); assert.deepEqual(res.body, { error: { message: 'Sai', fields: { phone: 'x' } } });
});
test('lỗi lạ → 500, không lộ chi tiết', () => {
  const orig = console.error; console.error = () => {};
  const res = fakeRes(); errorHandler(new Error('db password leaked'), {}, res, () => {});
  console.error = orig;
  assert.equal(res.statusCode, 500); assert.equal(res.body.error.message, 'Có lỗi xảy ra, vui lòng thử lại sau.');
});
test('JSON hỏng → 400 thân thiện', () => {
  const res = fakeRes(); errorHandler(Object.assign(new Error('x'), { type: 'entity.parse.failed', status: 400 }), {}, res, () => {});
  assert.equal(res.statusCode, 400); assert.equal(res.body.error.message, 'Dữ liệu gửi lên không hợp lệ.');
});
test('API không tồn tại → 404', () => { const res = fakeRes(); notFoundApi({}, res); assert.equal(res.statusCode, 404); });

console.log('\nroutes/orders.js');
let orders;
try {
  orders = require('../routes/orders');
  orders.useCartSummary(cartSummary);
} catch (e) {
  console.log('  ! Bỏ qua: chưa cài express (chạy `npm install express` rồi thử lại)');
}
if (orders) {
  const { createOrder, getOrder } = orders.handlers;
  test('giỏ trống → 400', () => {
    const res = call(createOrder, { body: GOOD, session: { cart: [] } });
    assert.equal(res.statusCode, 400); assert.match(res.body.error.message, /Giỏ hàng đang trống/);
  });
  test('body rỗng / mảng → 400', () => {
    assert.equal(call(createOrder, { body: {}, session: { cart: sampleCart() } }).statusCode, 400);
    assert.equal(call(createOrder, { body: [], session: { cart: sampleCart() } }).statusCode, 400);
    assert.equal(call(createOrder, { body: undefined, session: { cart: sampleCart() } }).statusCode, 400);
  });
  test('số điện thoại sai → 422 kèm fields.phone, giỏ hàng KHÔNG bị xoá', () => {
    const session = { cart: sampleCart() };
    const res = call(createOrder, { body: { ...GOOD, phone: '123' }, session });
    assert.equal(res.statusCode, 422); assert.ok(res.body.error.fields.phone);
    assert.equal(session.cart.length, 2);
  });
  test('đơn hợp lệ → 201, mã AKIO-…, tổng tiền đúng, giỏ bị xoá', () => {
    const session = { cart: sampleCart() };
    const res = call(createOrder, { body: { ...GOOD, total: 1 /* giá giả từ client bị bỏ qua */ }, session });
    assert.equal(res.statusCode, 201);
    const o = res.body.data;
    assert.match(o.code, /^AKIO-\d{8}-[A-Z0-9]{4}$/);
    assert.equal(o.total, 7190000 * 2 + 1590000);
    assert.equal(o.items.length, 2);
    assert.equal(o.customer.phone, '0912345678');
    assert.equal(o.status, 'pending');
    assert.deepEqual(session.cart, []);
    assert.ok(session.orders[o.code]);
  });
  test('GET /orders/:code xem lại được đơn trong cùng session', () => {
    const session = { cart: sampleCart() };
    const code = call(createOrder, { body: GOOD, session }).body.data.code;
    const res = call(getOrder, { params: { code }, session });
    assert.equal(res.statusCode, 200); assert.equal(res.body.data.code, code);
  });
  test('đơn của session khác / mã sai → 404', () => {
    const s1 = { cart: sampleCart() };
    const code = call(createOrder, { body: GOOD, session: s1 }).body.data.code;
    assert.equal(call(getOrder, { params: { code }, session: {} }).statusCode, 404);
    assert.equal(call(getOrder, { params: { code: 'AKIO-SAI' }, session: s1 }).statusCode, 404);
  });
  test('đặt 2 đơn liên tiếp → 2 mã khác nhau', () => {
    const session = { cart: sampleCart() };
    const a = call(createOrder, { body: GOOD, session }).body.data.code;
    session.cart = sampleCart();
    const b = call(createOrder, { body: GOOD, session }).body.data.code;
    assert.notEqual(a, b); assert.equal(Object.keys(session.orders).length, 2);
  });
}

// ---------------- Tài khoản (bất đồng bộ) ----------------
async function atest(name, fn) {
  try { await fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { fail++; console.log('  ✗ ' + name + '\n      ' + e.message.split('\n').join('\n      ')); }
}
// Session giả có regenerate giống express-session
function fakeSession(data = {}) {
  const s = { id: Math.random().toString(36).slice(2), ...data };
  s.regenerate = cb => { const old = s.id; Object.keys(s).forEach(k => { if (k !== 'regenerate') delete s[k]; }); s.id = old + '-new'; cb(); };
  return s;
}
function acall(handler, req) {
  return new Promise(resolve => {
    const res = fakeRes();
    const origJson = res.json.bind(res);
    res.json = b => { origJson(b); resolve(res); return res; };
    handler(req, res, err => { if (err) errorHandler(err, req, res, () => {}); });
  });
}
function route(router, method, p) {
  const layer = router.stack.find(l => l.route && l.route.path === p && l.route.methods[method]);
  return layer.route.stack[0].handle;
}

(async () => {
  let auth, users;
  try { auth = require('../routes/auth'); users = require('../lib/users'); users._reset(); }
  catch (e) { console.log('\n  ! Bỏ qua phần tài khoản: ' + e.message); }
  if (auth) {
    console.log('\nlib/users.js + routes/auth.js');
    const register = route(auth, 'post', '/register'), login = route(auth, 'post', '/login');
    const logout = route(auth, 'post', '/logout'), me = route(auth, 'get', '/me');

    await atest('mật khẩu được băm, không lưu chữ thường', async () => {
      const u = users.createUser({ name: 'Test', email: 'Hash@Test.com', password: 'secret123' });
      assert.equal(u.email, 'hash@test.com');
      assert.ok(u.hash && u.salt && !JSON.stringify(u).includes('secret123'));
      assert.ok(users.verify('HASH@test.com', 'secret123'));
      assert.equal(users.verify('hash@test.com', 'sai'), null);
      assert.equal(users.verify('khongco@test.com', 'secret123'), null);
    });
    await atest('tài khoản được ghi ra file (khởi động lại vẫn còn)', async () => {
      const saved = JSON.parse(fs.readFileSync(process.env.USERS_FILE, 'utf8'));
      assert.ok(saved.users['hash@test.com']);
    });
    await atest('đăng ký sai dữ liệu → 422 kèm fields', async () => {
      const res = await acall(register, { body: { name: 'A', email: 'abc', password: '123' }, session: fakeSession() });
      assert.equal(res.statusCode, 422); assert.deepEqual(Object.keys(res.body.error.fields).sort(), ['email', 'name', 'password']);
    });
    await atest('đăng ký đúng → 201, đăng nhập luôn, giữ giỏ hàng, không trả mật khẩu', async () => {
      const session = fakeSession({ cart: [{ lineId: 'x', productId: 'side-table', qty: 1 }], orders: {} });
      const res = await acall(register, { body: { name: 'Phúc', email: 'phuc@test.com', password: 'abc12345' }, session });
      assert.equal(res.statusCode, 201); assert.deepEqual(res.body.data, { name: 'Phúc', email: 'phuc@test.com' });
      assert.deepEqual(session.user, { name: 'Phúc', email: 'phuc@test.com' });
      assert.equal(session.cart.length, 1); assert.match(session.id, /-new$/);
    });
    await atest('email đã có (khác hoa thường) → 409', async () => {
      const res = await acall(register, { body: { name: 'Phúc 2', email: 'PHUC@test.com', password: 'abc12345' }, session: fakeSession() });
      assert.equal(res.statusCode, 409); assert.ok(res.body.error.fields.email);
    });
    await atest('đăng nhập sai mật khẩu → 401, đúng → 200', async () => {
      assert.equal((await acall(login, { body: { email: 'phuc@test.com', password: 'sai' }, session: fakeSession() })).statusCode, 401);
      const session = fakeSession();
      const res = await acall(login, { body: { email: ' Phuc@Test.com ', password: 'abc12345' }, session });
      assert.equal(res.statusCode, 200); assert.equal(session.user.email, 'phuc@test.com');
    });
    await atest('thiếu email/mật khẩu → 422, body sai kiểu → 400', async () => {
      assert.equal((await acall(login, { body: { email: 'phuc@test.com' }, session: fakeSession() })).statusCode, 422);
      assert.equal((await acall(login, { body: [], session: fakeSession() })).statusCode, 400);
      assert.equal((await acall(login, { body: { email: 1, password: {} }, session: fakeSession() })).statusCode, 422);
    });
    await atest('sai 5 lần → khoá tạm (429), kể cả khi nhập đúng', async () => {
      users.createUser({ name: 'Lock', email: 'lock@test.com', password: 'abc12345' });
      for (let i = 0; i < 5; i++) await acall(login, { body: { email: 'lock@test.com', password: 'sai' + i }, session: fakeSession() });
      const res = await acall(login, { body: { email: 'lock@test.com', password: 'abc12345' }, session: fakeSession() });
      assert.equal(res.statusCode, 429);
      auth._resetFails();
      assert.equal((await acall(login, { body: { email: 'lock@test.com', password: 'abc12345' }, session: fakeSession() })).statusCode, 200);
    });
    await atest('/me trả người đang đăng nhập; đăng xuất xoá user + đơn trong phiên, giữ giỏ', async () => {
      const session = fakeSession({ user: { name: 'Phúc', email: 'phuc@test.com' }, cart: [1], orders: { A: {} } });
      assert.equal((await acall(me, { session })).body.data.email, 'phuc@test.com');
      await acall(logout, { session });
      assert.equal(session.user, null); assert.deepEqual(session.orders, {}); assert.equal(session.cart.length, 1);
      assert.equal((await acall(me, { session })).body.data, null);
    });
    if (orders) {
      const { createOrder, getOrder, listOrders } = orders.handlers;
      await atest('đơn đặt khi đã đăng nhập được lưu vào tài khoản, xem lại ở phiên khác', async () => {
        const s1 = { cart: sampleCart(), orders: {}, user: { name: 'Phúc', email: 'phuc@test.com' } };
        const code = call(createOrder, { body: GOOD, session: s1 }).body.data.code;
        const s2 = { cart: [], orders: {}, user: { name: 'Phúc', email: 'phuc@test.com' } };
        assert.equal(call(getOrder, { params: { code }, session: s2 }).statusCode, 200);
        assert.ok(call(listOrders, { session: s2 }).body.data.some(o => o.code === code));
        assert.equal(call(getOrder, { params: { code }, session: { orders: {}, user: { email: 'lock@test.com' } } }).statusCode, 404);
        assert.equal(call(listOrders, { session: { orders: {}, user: null } }).body.data.length, 0);
      });
    }
  }
  try { fs.unlinkSync(process.env.USERS_FILE); } catch (e) {}
  console.log(`\n${pass} đạt, ${fail} lỗi`);
  process.exit(fail ? 1 : 0);
})();
