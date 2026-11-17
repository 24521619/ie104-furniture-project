# Akio - Website nội thất (đồ án IE104)

> Mô hình: E-Commerce phong cách Nitori | Lưu trữ dữ liệu: Session / Cookie / Local Memory (không dùng RDBMS)

Website bán nội thất **Akio**: frontend HTML/CSS/JavaScript thuần, backend **Node.js + Express 5**. Giỏ hàng lưu trong **session**; tài khoản và đơn của khách có tài khoản lưu vào file JSON.

**Chức năng:** xem sản phẩm, tìm kiếm không dấu, lọc theo danh mục / khoảng giá, phân trang · chi tiết sản phẩm, chọn màu · giỏ hàng · thanh toán có kiểm tra form · xác nhận đơn kèm mã · **đăng ký / đăng nhập / đăng xuất** · **đơn hàng của tôi** · giao diện điện thoại.

## 1. Yêu cầu môi trường

| Phần mềm | Phiên bản |
|---|---|
| Node.js | 18 trở lên (kiểm tra: `node -v`) |
| npm | đi kèm Node.js |
| Trình duyệt | Chrome, Edge, Firefox bản mới |

## 2. Cài đặt và chạy

```bash
cd backend
npm install        # chỉ cần lần đầu
npm start          # → Server running at http://localhost:3000
```

Mở **http://localhost:3000** trên trình duyệt.

> ⚠️ Phải mở qua `http://localhost:3000`. Mở bằng cách nhấp đúp file `index.html` hoặc dùng Live Server thì cookie session không được gửi → giỏ hàng luôn trống và không đặt hàng được.

Đổi cổng: `PORT=4000 npm start` (Windows PowerShell: `$env:PORT=4000; npm start`).

## 3. Kiểm thử

| Lệnh | Kiểm tra gì | Cần server chạy? |
|---|---|---|
| `npm test` | 41 bài test cho validate, tìm kiếm/lọc, xử lý lỗi, đặt hàng, tài khoản | Không |
| `npm run check` | 51 bài kiểm tra toàn bộ API trên server thật (sản phẩm, giỏ hàng, đặt hàng, tài khoản, session riêng từng khách) | Có - chạy `npm start` ở terminal khác trước |

Kết quả đúng: `41 đạt, 0 lỗi` và `51 đạt, 0 lỗi`. `npm run check` tạo thêm một tài khoản thử `kiemtra-…@example.com` mỗi lần chạy.

## 4. Cấu trúc thư mục

```
ie104-furniture-project/
├── index.html, products.html, product.html, checkout.html, order-success.html, orders.html
├── css/                  giao diện
├── js/
│   ├── api.js            lớp gọi API (chế độ mock / server)
│   ├── main.js           header, footer, giỏ hàng, đăng nhập
│   └── ...               JS riêng từng trang
├── images/               ảnh sản phẩm
├── data/products.json    dữ liệu mẫu: 9 sản phẩm, 4 danh mục
├── API.md                hợp đồng API giữa frontend và backend
└── backend/
    ├── server.js         khởi tạo Express, session, phục vụ frontend
    ├── routes/
    │   ├── products.js   GET /api/products, /api/products/:id
    │   ├── cart.js       /api/cart (thêm, sửa, xoá)
    │   ├── orders.js     /api/orders (đặt hàng, danh sách, chi tiết)
    │   └── auth.js       /api/auth (đăng ký, đăng nhập, đăng xuất, me)
    ├── lib/
    │   ├── filter.js     tìm kiếm không dấu, lọc danh mục/giá, phân trang
    │   ├── validate.js   kiểm tra form đặt hàng
    │   ├── errors.js     định dạng lỗi JSON thống nhất
    │   └── users.js      tài khoản: băm mật khẩu (scrypt), lưu file
    ├── data/users.json   tài khoản & đơn của khách có tài khoản (tự tạo, không đưa lên Git)
    └── test/             npm test, npm run check
```

Server chỉ mở công khai `css/`, `js/`, `images/` và các trang HTML trong danh sách `pages` của `server.js` - mã nguồn backend không xem được từ trình duyệt. **Thêm trang HTML mới thì nhớ thêm tên trang vào `pages`.**

## 5. Kiến trúc session

Dùng `express-session` với MemoryStore (lưu trên RAM). Mỗi trình duyệt có một cookie `connect.sid` riêng → giỏ hàng và đơn hàng riêng.

| Biến | Kiểu | Nội dung |
|---|---|---|
| `req.session.cart` | mảng | `[{ lineId, productId, color, qty }]` - chỉ lưu mã và số lượng; tên, ảnh, **giá luôn lấy lại từ `products.json`** khi trả về |
| `req.session.orders` | object | `{ "AKIO-20261117-AB12": { ...đơn hàng } }` - tra cứu theo mã đơn |
| `req.session.user` | object / null | `{ name, email }` khi đã đăng nhập |

Luồng đặt hàng:

```
Thêm vào giỏ (POST /api/cart) → session.cart
        ↓
Thanh toán (POST /api/orders)
  1. giỏ trống?          → 400
  2. kiểm tra form        → 422 + lỗi từng ô
  3. tạo mã AKIO-YYYYMMDD-XXXX (giờ Việt Nam)
  4. lưu session.orders[mã], xoá session.cart → 201
        ↓
Trang xác nhận (GET /api/orders/:code)
```

Tài khoản (`backend/data/users.json`):

- Mật khẩu băm bằng **scrypt** + salt ngẫu nhiên, không lưu chữ thường.
- Đăng nhập / đăng ký đổi mã session (chống chiếm phiên) nhưng giữ giỏ hàng; sai mật khẩu 5 lần trong 10 phút thì tạm khoá.
- Đơn đặt khi đã đăng nhập được lưu vào tài khoản → xem lại ở trang **Đơn hàng của tôi** từ máy khác.
- Đăng xuất xoá đơn trong phiên để người sau trên cùng máy không xem được địa chỉ, số điện thoại.

Giới hạn của MemoryStore: **khởi động lại server thì mất giỏ hàng, phiên đăng nhập và đơn của khách chưa đăng nhập**; tài khoản và đơn của khách có tài khoản vẫn còn (nằm trong `users.json`). Triển khai thật nên dùng database.

## 6. API

Chi tiết từng API (dữ liệu gửi lên, trả về, mã lỗi, quy tắc kiểm tra) xem **[API.md](API.md)**. Tóm tắt:

| Method | Đường dẫn | Chức năng |
|---|---|---|
| GET | `/api/health` | Kiểm tra server |
| GET | `/api/products?cat=&q=&min=&max=&page=&limit=` | Danh sách, tìm kiếm, lọc, phân trang |
| GET | `/api/products/:id` | Chi tiết sản phẩm |
| GET / POST | `/api/cart` | Xem / thêm vào giỏ |
| PATCH / DELETE | `/api/cart/items/:lineId` | Đổi số lượng / xoá dòng |
| POST | `/api/orders` | Đặt hàng |
| GET | `/api/orders` | Đơn hàng của tôi |
| GET | `/api/orders/:code` | Xem một đơn |
| GET | `/api/auth/me` | Người đang đăng nhập |
| POST | `/api/auth/register`, `/login`, `/logout` | Đăng ký, đăng nhập, đăng xuất |

Mọi lỗi trả về dạng `{ "error": { "message": "...", "fields": { ... } } }`; frontend hiển thị nguyên văn `message` và tô đỏ ô có trong `fields`.

## 7. Chế độ mock (chạy frontend không cần backend)

Trong `js/api.js`: `API_MODE = 'server'` (mặc định khi nộp) hoặc `'mock'`. Chế độ `mock` dùng dữ liệu trong `js/data.js` và `localStorage` - dùng khi chỉ cần xem giao diện, có thể mở bằng Live Server.

## 8. Lỗi thường gặp

| Hiện tượng | Nguyên nhân / cách sửa |
|---|---|
| `Cannot find module 'express'` | Chưa chạy `npm install` trong thư mục `backend` |
| `EADDRINUSE: address already in use :::3000` | Cổng 3000 đang bị chiếm → tắt server cũ hoặc `PORT=4000 npm start` |
| Giỏ hàng luôn về 0 | Đang mở bằng file hoặc Live Server → mở `http://localhost:3000` |
| Trang báo "Không kết nối được máy chủ" | Server chưa chạy hoặc đã tắt |
| Đăng nhập báo "Bạn đã nhập sai quá nhiều lần" | Sai mật khẩu 5 lần → chờ 10 phút hoặc khởi động lại server |
| Muốn xoá hết tài khoản thử | Tắt server, xoá file `backend/data/users.json` |
| `npm run check` báo không kết nối được | Chưa `npm start` ở terminal khác |

## 9. Phân công thành viên

| Thành viên | Vai trò chính | Trách nhiệm chính | Ghi chú phân bổ |
|---|---|---|---|
| **Tú Thanh** | Project Manager / FE | Quản lý tiến độ, kiến trúc Git repo, review PR, kiểm thử end-to-end, code UI khung (Header, Footer, Danh mục, Chi tiết SP) | Đầu mối báo cáo & UI chính |
| **Dương Thịnh** | Frontend Developer | Thiết kế Layout/Figma phong cách Nitori, code UI Giỏ hàng, Checkout, Bộ lọc/Search, tương tác DOM/JS | Chuyên sâu hoàn thiện UI/UX |
| **Thành Phan** | Backend Developer 1 | Xây dựng Server, thiết kế Data Model giả lập (JSON/Mock), Quản lý Session Giỏ hàng, Cookie đơn hàng & API Catalog | Phụ trách Session Cart & Catalog |
| **Đức Phúc** | Backend Developer 2 | Xử lý Flow đặt hàng (Checkout), Validate form, Xử lý Session Auth/Thông tin khách, Search/Filter Logic & Bug Fixing | Phụ trách Session Order/Auth & Xử lý lỗi |
