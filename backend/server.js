
const express = require("express");
const session = require("express-session");
const path = require("path");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");
const authRoutes = require("./routes/auth");
const { errorHandler, notFoundApi } = require("./lib/errors");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Đọc dữ liệu sản phẩm có sẵn của nhóm
const { products, categories } = require("../data/products.json");

// Cho phép Server xử lý JSON
app.use(express.json({ limit: "20kb" }));

// Cấu hình Session
app.use(session({
    secret: process.env.SESSION_SECRET || "akio-ie104-local-dev",
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        sameSite: "lax"
    }
}));

// Khởi tạo dữ liệu Session
app.use((req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = [];
    }

    // Đơn hàng lưu dạng object { "AKIO-...": đơn } — KHÔNG dùng mảng
    // (mảng có key chữ sẽ bị mất khi session được lưu)
    if (!req.session.orders || Array.isArray(req.session.orders)) {
        req.session.orders = {};
    }

    if (req.session.user === undefined) {
        req.session.user = null;
    }

    next();
});

// API kiểm tra Server
app.get("/api/health", (req, res) => {
    res.json({
        data: {
            status: "ok",
            version: "1.3.0",
            features: ["products", "cart", "orders", "auth"],
            totalProducts: products.length,
            totalCategories: categories.length
        }
    });
});

// API sản phẩm
app.use("/api/products", productRoutes);

// API giỏ hàng
app.use("/api/cart", cartRoutes);

// API đặt hàng
app.use("/api/orders", orderRoutes);

// API tài khoản (đăng ký, đăng nhập, đăng xuất)
app.use("/api/auth", authRoutes);

// Các API chưa được triển khai phải trả về lỗi JSON thay vì HTML.
app.use("/api", notFoundApi);

// Server phục vụ giao diện Frontend

const frontendPath = path.join(__dirname, "..");

// Phục vụ CSS, JS và hình ảnh
app.use("/css", express.static(path.join(frontendPath, "css")));
app.use("/js", express.static(path.join(frontendPath, "js")));
app.use("/images", express.static(path.join(frontendPath, "images")));

// Hiển thị trang chủ
app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

// Hiển thị các trang HTML
const pages = [
    "index.html",
    "products.html",
    "product.html",
    "checkout.html",
    "order-success.html",
    "orders.html"
];

pages.forEach(page => {
    app.get("/" + page, (req, res) => {
        res.sendFile(path.join(frontendPath, page));
    });
});


// Trả về lỗi JSON thống nhất (lib/errors.js của Đức Phúc): giữ đúng mã 400/404/422 và fields
app.use(errorHandler);

// Khởi động Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log("Akio backend v1.3.0 — API: sản phẩm, giỏ hàng, đơn hàng, tài khoản (đăng ký / đăng nhập)");
    console.log("Thư mục web:", path.resolve(__dirname, ".."));
});
