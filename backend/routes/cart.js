
const express = require("express");
const router = express.Router();

// Đọc dữ liệu sản phẩm từ Frontend
const { products } = require("../../data/products.json");

// Tạo mã cho từng dòng giỏ hàng
function createLineId(productId, color) {
    const colorId = String(color || "mac-dinh")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    return `${productId}__${colorId}`;
}

// Kiểm tra số lượng
function validQty(qty, min = 1) {
    return Number.isInteger(qty) && qty >= min && qty <= 99;
}

// Trả về lỗi theo định dạng API.md
function sendError(res, status, message) {
    return res.status(status).json({
        error: { message }
    });
}

// Tạo dữ liệu giỏ hàng để trả về Frontend
function getCartData(cart) {
    const items = cart.map(item => {
        const product = products.find(
            p => p.id === item.productId
        );

        if (!product) return null;

        return {
            lineId: item.lineId,
            productId: product.id,
            name: product.name,
            img: product.img,
            color: item.color,
            price: product.price,
            qty: item.qty,
            lineTotal: product.price * item.qty
        };
    }).filter(Boolean);

    const count = items.reduce(
        (sum, item) => sum + item.qty, 0
    );

    const subtotal = items.reduce(
        (sum, item) => sum + item.lineTotal, 0
    );

    return {
        items,
        count,
        subtotal,
        shippingFee: 0,
        total: subtotal
    };
}

// 1. GET /api/cart - Xem giỏ hàng
router.get("/", (req, res) => {
    res.json({
        data: getCartData(req.session.cart)
    });
});

// 2. POST /api/cart - Thêm sản phẩm
router.post("/", (req, res) => {
    const { productId, qty, color } = req.body || {};

    const product = products.find(
        p => p.id === productId
    );

    if (!product) {
        return sendError(res, 404, "Sản phẩm không tồn tại.");
    }

    if (!validQty(qty)) {
        return sendError(res, 400, "Số lượng phải từ 1 đến 99.");
    }

    const colors = Array.isArray(product.colors)
        ? product.colors.map(c => c[0])
        : [];

    const selectedColor = color || colors[0] || "";

    if (
        (colors.length > 0 && !colors.includes(selectedColor)) ||
        (colors.length === 0 && selectedColor !== "")
    ) {
        return sendError(res, 400, "Màu sắc không hợp lệ.");
    }

    const lineId = createLineId(product.id, selectedColor);

    const existing = req.session.cart.find(
        item => item.lineId === lineId
    );

    if (existing) {
        if (existing.qty + qty > 99) {
            return sendError(
                res, 400, "Số lượng tối đa mỗi dòng là 99."
            );
        }

        existing.qty += qty;
    } else {
        req.session.cart.push({
            lineId,
            productId,
            color: selectedColor,
            qty
        });
    }

    res.json({
        data: getCartData(req.session.cart)
    });
});

// 3. PATCH - Cập nhật số lượng
router.patch("/items/:lineId", (req, res) => {
    const index = req.session.cart.findIndex(
        item => item.lineId === req.params.lineId
    );

    if (index === -1) {
        return sendError(res, 404, "Không tìm thấy sản phẩm trong giỏ.");
    }

    const qty = req.body?.qty;

    if (!validQty(qty, 0)) {
        return sendError(res, 400, "Số lượng phải từ 0 đến 99.");
    }

    if (qty === 0) {
        req.session.cart.splice(index, 1);
    } else {
        req.session.cart[index].qty = qty;
    }

    res.json({
        data: getCartData(req.session.cart)
    });
});

// 4. DELETE - Xóa dòng khỏi giỏ hàng
router.delete("/items/:lineId", (req, res) => {
    const index = req.session.cart.findIndex(
        item => item.lineId === req.params.lineId
    );

    if (index === -1) {
        return sendError(res, 404, "Không tìm thấy sản phẩm trong giỏ.");
    }

    req.session.cart.splice(index, 1);

    res.json({
        data: getCartData(req.session.cart)
    });
});

module.exports = router;

// Cho routes/orders.js (Đức Phúc) dùng: tóm tắt giỏ hàng trong session
module.exports.cartSummary = session => getCartData((session && session.cart) || []);
