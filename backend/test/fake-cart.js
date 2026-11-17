// cartSummary GIẢ — chỉ dùng để thử API đặt hàng khi Thành Phan chưa làm xong giỏ hàng.
// Khi đã có routes/cart.js thật thì không cần file này nữa.
//
// Giỏ hàng trong session được lưu dạng: req.session.cart = [{ lineId, productId, color, qty }, ...]
// cartSummary trả về đúng cấu trúc mục 4 của API.md.

const { products } = require('./products.sample.json');

function cartSummary(session) {
  const lines = Array.isArray(session && session.cart) ? session.cart : [];
  const items = lines.map(l => {
    const p = products.find(x => x.id === l.productId);
    if (!p) return null;
    return { lineId: l.lineId, productId: p.id, name: p.name, img: p.img, color: l.color, price: p.price, qty: l.qty, lineTotal: p.price * l.qty };
  }).filter(Boolean);
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  return { items, count: items.reduce((s, i) => s + i.qty, 0), subtotal, shippingFee: 0, total: subtotal };
}

// Một giỏ hàng mẫu để thử: 2 sofa xanh navy + 1 bàn tròn
const sampleCart = () => ([
  { lineId: 'everyday-sofa__xanh-navy', productId: 'everyday-sofa', color: 'Xanh navy', qty: 2 },
  { lineId: 'side-table__trang', productId: 'side-table', color: 'Trắng', qty: 1 }
]);

module.exports = { cartSummary, sampleCart };
