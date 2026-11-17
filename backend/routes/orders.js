// API đặt hàng (mục 5 của API.md)
//   POST /api/orders        → tạo đơn từ giỏ hàng trong session, xoá giỏ, trả 201 + đơn hàng
//   GET  /api/orders/:code  → xem lại đơn đã đặt trong session hiện tại
//
// Gắn vào server.js:   app.use('/api/orders', require('./routes/orders'));
// Cần: express.json() và express-session đã được cấu hình TRƯỚC dòng trên.

const express = require('express');
const { validateOrder, cleanOrder } = require('../lib/validate');
const { ApiError } = require('../lib/errors');
const users = require('../lib/users');

// Hàm của Thành Phan: trả về giỏ hàng đúng cấu trúc mục 4 API.md
//   { items: [{ lineId, productId, name, img, color, price, qty, lineTotal }], count, subtotal, shippingFee, total }
// Khi Thành Phan chưa xong, tạm dùng cartSummary giả trong test/fake-cart.js để thử.
let cartSummary;
try { ({ cartSummary } = require('./cart')); } catch (e) { cartSummary = null; }

const router = express.Router();

// Mã đơn: AKIO-YYYYMMDD-XXXX (chỉ chữ in hoa, số và "-" để đặt được lên địa chỉ trang)
function newOrderCode(existing) {
  // Ngày theo giờ Việt Nam (UTC+7), không phải giờ UTC của máy chủ
  const d = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
  let code;
  do { code = `AKIO-${d}-${Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0')}`; }
  while (existing && existing[code]);
  return code;
}

// Cho phép test thay hàm giỏ hàng
router.useCartSummary = fn => { cartSummary = fn; };

function createOrder(req, res, next) {
  try {
    if (typeof cartSummary !== 'function') throw new Error('Chưa có hàm cartSummary (routes/cart.js).');
    if (!req.session) throw new Error('Chưa cấu hình express-session.');

    const body = req.body;
    // 1. Body phải là object JSON
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length) {
      throw new ApiError('Vui lòng điền thông tin đặt hàng.', 400);
    }
    // 2. Giỏ hàng không được trống
    const cart = cartSummary(req.session);
    if (!cart || !Array.isArray(cart.items) || !cart.items.length) {
      throw new ApiError('Giỏ hàng đang trống, không thể đặt hàng.', 400);
    }
    // 3. Kiểm tra từng trường
    const fields = validateOrder(body);
    if (fields._) throw new ApiError(fields._, 400);
    if (Object.keys(fields).length) throw new ApiError('Vui lòng kiểm tra lại thông tin đặt hàng.', 422, fields);

    // 4. Tạo đơn (giá lấy từ giỏ hàng phía server, không lấy từ body)
    req.session.orders = req.session.orders || {};
    const order = {
      code: newOrderCode(req.session.orders),
      createdAt: new Date().toISOString(),
      status: 'pending',
      customer: cleanOrder(body),
      payment: body.payment,
      items: cart.items,
      subtotal: cart.subtotal,
      shippingFee: cart.shippingFee || 0,
      total: cart.total
    };

    // 5. Lưu đơn vào session và xoá giỏ hàng
    req.session.orders[order.code] = order;
    req.session.cart = [];
    // Đã đăng nhập → lưu đơn vào tài khoản để xem lại ở trang "Đơn hàng của tôi"
    if (req.session.user) users.addOrder(req.session.user.email, order);

    res.status(201).json({ data: order });
  } catch (err) { next(err); }
}

function getOrder(req, res, next) {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const order = (req.session && req.session.orders && req.session.orders[code]) ||
      (req.session && req.session.user && users.orderOf(req.session.user.email, code));
    if (!order) throw new ApiError('Không tìm thấy đơn hàng.', 404);
    res.json({ data: order });
  } catch (err) { next(err); }
}

// Danh sách đơn: đơn trong phiên hiện tại + đơn của tài khoản (nếu đã đăng nhập), mới nhất trước
function listOrders(req, res, next) {
  try {
    const all = {};
    const u = req.session && req.session.user;
    if (u) users.ordersOf(u.email).forEach(o => { all[o.code] = o; });
    Object.values((req.session && req.session.orders) || {}).forEach(o => { all[o.code] = o; });
    const list = Object.values(all).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.json({ data: list });
  } catch (err) { next(err); }
}

router.post('/', createOrder);
router.get('/', listOrders);
router.get('/:code', getOrder);
router.handlers = { createOrder, getOrder, listOrders }; // để file test gọi trực tiếp

module.exports = router;
