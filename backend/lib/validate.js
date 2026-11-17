// Kiểm tra dữ liệu đơn hàng — cùng quy tắc và câu báo lỗi với validateOrder trong frontend/js/api.js
// Nếu sửa quy tắc ở đây thì sửa luôn bên frontend (và ngược lại).

const RULES = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  phone: /^(0|\+84)(3|5|7|8|9)\d{8}$/ // số di động Việt Nam, vd. 0912345678 hoặc +84912345678
};

// Bỏ khoảng trắng, dấu chấm, gạch ngang: "0912 345.678" → "0912345678"
const normPhone = s => String(s || '').replace(/[\s.-]/g, '');

// Trả về {} nếu hợp lệ, ngược lại { tênTrường: 'câu báo lỗi', ... }
function validateOrder(o) {
  const f = {};
  if (!o || typeof o !== 'object' || Array.isArray(o)) return { _: 'Dữ liệu đơn hàng không hợp lệ.' };
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

// Chuẩn hoá đơn hàng hợp lệ trước khi lưu (cắt khoảng trắng, chuẩn hoá số điện thoại)
function cleanOrder(o) {
  return {
    name: String(o.name).trim(),
    phone: normPhone(o.phone),
    email: String(o.email || '').trim(),
    city: String(o.city).trim(),
    address: String(o.address).trim(),
    note: String(o.note || '').trim()
  };
}

module.exports = { RULES, normPhone, validateOrder, cleanOrder };
