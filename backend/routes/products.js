const express = require("express");
const router = express.Router();
const { products } = require("../../data/products.json");
const { filterProducts, paginate } = require("../lib/filter"); // tìm kiếm & lọc (Đức Phúc)

function error(res, message) {
    return res.status(400).json({ error: { message } });
}

// GET /api/products?cat=&q=&min=&max=&page=&limit=
router.get("/", (req, res) => {
    const { cat, q, min, max, page, limit } = req.query;

    // Không cho phép tham số lặp lại hoặc kiểu dữ liệu không phải chuỗi.
    if ([cat, q, min, max, page, limit].some(v => v !== undefined && typeof v !== "string")) {
        return error(res, "Tham số tìm kiếm không hợp lệ.");
    }

    // Số sản phẩm/trang là số nguyên từ 1 đến 100; mặc định 12.
    let pageSize = 12;
    if (limit !== undefined && limit !== "") {
        const value = Number(limit);
        if (!Number.isFinite(value) || value < 1) {
            return error(res, "Số sản phẩm mỗi trang không hợp lệ.");
        }
        pageSize = Math.min(100, Math.floor(value));
    }

    let requestedPage = 1;
    if (page !== undefined && page !== "") {
        const value = Number(page);
        if (!Number.isFinite(value) || value < 1) {
            return error(res, "Số trang không hợp lệ.");
        }
        requestedPage = Math.floor(value);
    }

    const minimum = min === undefined || min === "" ? null : Number(min);
    const maximum = max === undefined || max === "" ? null : Number(max);
    if ((minimum !== null && (!Number.isFinite(minimum) || minimum < 0)) ||
        (maximum !== null && (!Number.isFinite(maximum) || maximum < 0)) ||
        (minimum !== null && maximum !== null && minimum > maximum)) {
        return error(res, "Khoảng giá không hợp lệ.");
    }

    // Lọc theo danh mục, từ khoá (không dấu) và khoảng giá → rồi phân trang
    const filtered = filterProducts(products, { cat, q, min, max });
    return res.json({ data: paginate(filtered, { page: requestedPage, limit: pageSize }) });
});

// GET /api/products/:id
router.get("/:id", (req, res) => {
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
        return res.status(404).json({ error: { message: "Không tìm thấy sản phẩm." } });
    }
    return res.json({ data: product });
});

module.exports = router;
