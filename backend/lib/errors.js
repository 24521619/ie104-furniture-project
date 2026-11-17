// Báo lỗi thống nhất cho mọi API (đúng mục 2 của API.md):
//   { "error": { "message": "Câu tiếng Việt thân thiện", "fields": { "phone": "..." } } }

class ApiError extends Error {
  /**
   * @param {string} message câu hiển thị cho người dùng
   * @param {number} status  mã HTTP: 400, 401, 404, 409, 422…
   * @param {Object} [fields] lỗi theo từng ô nhập { tênTrường: 'câu báo lỗi' }
   */
  constructor(message, status = 400, fields) {
    super(message);
    this.status = status;
    if (fields && Object.keys(fields).length) this.fields = fields;
  }
}

// Bọc route async để lỗi được chuyển sang errorHandler (Express 4 không tự bắt lỗi của async)
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Route /api/... không tồn tại → đặt SAU tất cả route API
function notFoundApi(req, res) {
  res.status(404).json({ error: { message: 'Không có API này.' } });
}

// Bắt mọi lỗi → đặt CUỐI CÙNG trong server.js
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (res.headersSent) return next(err);

  // Body gửi lên không phải JSON hợp lệ (lỗi của express.json())
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Dữ liệu gửi lên không hợp lệ.' } });
  }
  // Body quá lớn
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Dữ liệu gửi lên quá lớn.' } });
  }

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
  if (status >= 500) console.error('[Lỗi máy chủ]', err); // ghi log để debug, không lộ chi tiết cho người dùng

  const body = { message: status >= 500 ? 'Có lỗi xảy ra, vui lòng thử lại sau.' : err.message };
  if (status < 500 && err.fields) body.fields = err.fields;
  res.status(status).json({ error: body });
}

module.exports = { ApiError, wrap, notFoundApi, errorHandler };
