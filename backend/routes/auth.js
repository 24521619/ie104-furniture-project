// API tài khoản (mục 6 của API.md)
//   GET  /api/auth/me        → người đang đăng nhập hoặc null
//   POST /api/auth/register  → tạo tài khoản + đăng nhập luôn
//   POST /api/auth/login     → đăng nhập
//   POST /api/auth/logout    → đăng xuất (giữ nguyên giỏ hàng)

const express = require('express');
const { ApiError } = require('../lib/errors');
const { RULES } = require('../lib/validate');
const users = require('../lib/users');

const router = express.Router();

// ---- Chống đoán mật khẩu: tối đa 5 lần sai / 10 phút cho mỗi email ----
const MAX_FAILS = 5, WINDOW_MS = 10 * 60 * 1000;
const fails = new Map(); // email → { count, until }
function tooManyFails(email) {
  const f = fails.get(email);
  if (!f) return false;
  if (Date.now() > f.until) { fails.delete(email); return false; }
  return f.count >= MAX_FAILS;
}
function addFail(email) {
  const f = fails.get(email);
  if (!f || Date.now() > f.until) fails.set(email, { count: 1, until: Date.now() + WINDOW_MS });
  else f.count++;
}

// Đổi mã session khi đăng nhập (chống chiếm phiên), nhưng giữ lại giỏ hàng và đơn hàng
function startSession(req, user) {
  return new Promise((resolve, reject) => {
    const keep = { cart: req.session.cart || [], orders: req.session.orders || {} };
    req.session.regenerate(err => {
      if (err) return reject(err);
      req.session.cart = keep.cart;
      req.session.orders = keep.orders;
      req.session.user = users.publicUser(user);
      resolve();
    });
  });
}

const str = v => (typeof v === 'string' ? v : '');

function checkBody(req) {
  const b = req.body;
  if (!b || typeof b !== 'object' || Array.isArray(b)) throw new ApiError('Dữ liệu gửi lên không hợp lệ.', 400);
  return b;
}

router.get('/me', (req, res) => {
  res.json({ data: req.session.user || null });
});

router.post('/register', async (req, res, next) => {
  try {
    const b = checkBody(req);
    const name = str(b.name).trim(), email = users.normEmail(str(b.email)), password = str(b.password);
    const f = {};
    if (name.length < 2) f.name = 'Vui lòng nhập họ tên.';
    else if (name.length > 60) f.name = 'Họ tên tối đa 60 ký tự.';
    if (!RULES.email.test(email)) f.email = 'Email không đúng định dạng.';
    if (password.length < 6) f.password = 'Mật khẩu cần ít nhất 6 ký tự.';
    else if (password.length > 100) f.password = 'Mật khẩu tối đa 100 ký tự.';
    if (Object.keys(f).length) throw new ApiError('Vui lòng kiểm tra lại thông tin.', 422, f);

    const user = users.createUser({ name, email, password });
    if (!user) throw new ApiError('Email này đã được đăng ký.', 409, { email: 'Email này đã được đăng ký. Bạn hãy đăng nhập.' });

    await startSession(req, user);
    res.status(201).json({ data: users.publicUser(user) });
  } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
  try {
    const b = checkBody(req);
    const email = users.normEmail(str(b.email)), password = str(b.password);
    if (!email || !password) throw new ApiError('Vui lòng nhập email và mật khẩu.', 422);
    if (tooManyFails(email)) throw new ApiError('Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 10 phút.', 429);

    const user = users.verify(email, password);
    if (!user) { addFail(email); throw new ApiError('Email hoặc mật khẩu không đúng.', 401); }

    fails.delete(email);
    await startSession(req, user);
    res.json({ data: users.publicUser(user) });
  } catch (err) { next(err); }
});

router.post('/logout', (req, res) => {
  req.session.user = null;
  req.session.orders = {}; // không để người dùng sau trên cùng máy xem được đơn (có địa chỉ, SĐT) của người trước
  // giữ giỏ hàng để khách tiếp tục mua
  res.json({ data: null });
});

router._resetFails = () => fails.clear(); // chỉ dùng trong test
module.exports = router;
