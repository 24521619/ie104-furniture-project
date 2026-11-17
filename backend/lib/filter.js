// Tìm kiếm & lọc sản phẩm trong bộ nhớ.
// Dùng trong GET /api/products: lọc trước bằng filterProducts, sau đó Thành Phan phân trang bằng paginate.

// Bỏ dấu tiếng Việt + chữ thường: "Gỗ Sồi" → "go soi"
const plain = s => String(s ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .toLowerCase();

// Đọc số từ query string; rỗng hoặc không phải số → undefined (bỏ qua bộ lọc)
const toNum = v => (v === undefined || v === null || String(v).trim() === '' || isNaN(v)) ? undefined : Number(v);

/**
 * @param {Array} list  danh sách sản phẩm (từ data/products.json)
 * @param {Object} opts { cat, q, min, max } — thường truyền thẳng req.query
 *   cat: 'chair' | 'sofa' | 'table' | 'storage' (rỗng hoặc 'all' = tất cả)
 *   q:   từ khoá, tìm trong name + desc, không phân biệt hoa thường và dấu
 *   min, max: khoảng giá VNĐ, bao gồm hai đầu
 */
function filterProducts(list, { cat, q, min, max } = {}) {
  let r = Array.isArray(list) ? list : [];
  if (cat && cat !== 'all') r = r.filter(p => p.cat === cat);
  const k = plain(String(q ?? '').trim());
  if (k) r = r.filter(p => plain(`${p.name} ${p.desc || ''}`).includes(k));
  const lo = toNum(min), hi = toNum(max);
  if (lo !== undefined) r = r.filter(p => p.price >= lo);
  if (hi !== undefined) r = r.filter(p => p.price <= hi);
  return r;
}

/**
 * Phân trang (để Thành Phan dùng luôn cho thống nhất với API.md)
 * page bắt đầu từ 1, vượt quá thì trả trang cuối; limit mặc định 12, tối đa 100
 */
function paginate(list, { page, limit } = {}) {
  const lim = Math.max(1, Math.min(100, Math.floor(toNum(limit) || 12)));
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / lim));
  const pg = Math.min(Math.max(1, Math.floor(toNum(page) || 1)), totalPages);
  return { items: list.slice((pg - 1) * lim, pg * lim), page: pg, limit: lim, total, totalPages };
}

module.exports = { plain, filterProducts, paginate };
