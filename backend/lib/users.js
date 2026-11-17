// Kho tài khoản người dùng.
// - Mật khẩu được băm bằng scrypt (có sẵn trong Node.js, không cần cài thêm) + salt ngẫu nhiên.
// - Tài khoản lưu vào file JSON (mặc định backend/data/users.json) nên khởi động lại server vẫn còn.
// - Mỗi tài khoản giữ danh sách mã đơn đã đặt để xem lại ở trang "Đơn hàng của tôi".

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = process.env.USERS_FILE || path.join(__dirname, '..', 'data', 'users.json');
const KEYLEN = 64;

let db = { users: {}, orders: {} }; // users: { email: {...} }, orders: { code: đơn } (đơn của khách có tài khoản)
let loaded = false;

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    db = { users: raw.users || {}, orders: raw.orders || {} };
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('[users] Không đọc được', FILE, '- bắt đầu với dữ liệu trống:', e.message);
  }
}

function save() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, FILE); // ghi file tạm rồi đổi tên → không bị hỏng file nếu server tắt giữa chừng
  } catch (e) {
    console.error('[users] Không ghi được', FILE, e.message);
  }
}

const normEmail = e => String(e || '').trim().toLowerCase();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, KEYLEN).toString('hex');
  return { salt, hash };
}

function checkPassword(password, user) {
  const { hash } = hashPassword(password, user.salt);
  // so sánh thời gian cố định để tránh đoán mật khẩu qua thời gian phản hồi
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.hash, 'hex'));
}

// Thông tin an toàn để trả về frontend (không bao giờ trả hash/salt)
const publicUser = u => (u ? { name: u.name, email: u.email } : null);

function findByEmail(email) {
  load();
  return db.users[normEmail(email)] || null;
}

function createUser({ name, email, password }) {
  load();
  const key = normEmail(email);
  if (db.users[key]) return null;
  const { salt, hash } = hashPassword(password);
  db.users[key] = { name: String(name).trim(), email: key, salt, hash, createdAt: new Date().toISOString(), orderCodes: [] };
  save();
  return db.users[key];
}

// Trả về user nếu đúng email + mật khẩu, ngược lại null
function verify(email, password) {
  const u = findByEmail(email);
  if (!u) {
    hashPassword(password); // vẫn tốn thời gian như khi có tài khoản → không lộ email nào đã đăng ký
    return null;
  }
  return checkPassword(password, u) ? u : null;
}

// Gắn đơn hàng vào tài khoản (gọi khi khách đã đăng nhập đặt hàng)
function addOrder(email, order) {
  const u = findByEmail(email);
  if (!u) return;
  db.orders[order.code] = order;
  if (!u.orderCodes.includes(order.code)) u.orderCodes.unshift(order.code);
  save();
}

function ordersOf(email) {
  const u = findByEmail(email);
  if (!u) return [];
  return u.orderCodes.map(c => db.orders[c]).filter(Boolean);
}

function orderOf(email, code) {
  const u = findByEmail(email);
  return u && u.orderCodes.includes(code) ? db.orders[code] || null : null;
}

// Chỉ dùng trong test
function _reset() { db = { users: {}, orders: {} }; loaded = true; }

module.exports = { normEmail, publicUser, findByEmail, createUser, verify, addOrder, ordersOf, orderOf, FILE, _reset };
