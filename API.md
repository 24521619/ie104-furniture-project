# Akio — Hợp đồng API giữa Frontend và Backend

Tài liệu này mô tả **chính xác** những gì frontend gửi lên và mong nhận về. Backend làm đúng theo đây thì chỉ cần đổi một dòng cấu hình là frontend chạy với server thật.

- Frontend gọi API trong `js/api.js`.
- Bản `mock` trong cùng file mô phỏng đúng hành vi mô tả dưới đây. Khi phân vân "trả về cái gì", hãy đọc hàm tương ứng trong object `Mock`.
- Dữ liệu mẫu: `data/products.json` (9 sản phẩm, 4 danh mục) — dùng làm mock data cho server.

---

## 1. Bật chế độ gọi server thật

Trong `js/api.js`:

```js
const API_MODE = 'server';   // mặc định là 'mock'
const API_BASE = '/api';
```

### Cách chạy khuyên dùng: server phục vụ luôn frontend

Session dùng cookie, nên frontend và API **phải cùng địa chỉ** (cùng host + cổng). Ví dụ với Express:

```js
app.use(express.json());
app.use(session({ secret: '...', resave: false, saveUninitialized: true }));
app.use('/api', apiRouter);
app.use(express.static(path.join(__dirname, '../frontend'))); // thư mục chứa index.html
```

Rồi mở `http://localhost:3000/index.html` — **không** mở bằng cách nhấp đúp file hay Live Server, vì khi đó cookie session không được gửi và giỏ hàng sẽ luôn trống.

> Nếu bắt buộc chạy khác cổng: đặt `API_BASE = 'http://localhost:3000/api'`, bật CORS với `origin` cụ thể và `credentials: true`, cookie `sameSite: 'lax'`. Frontend đã gửi `credentials: 'include'`.

---

## 2. Quy ước chung

| Mục | Quy ước |
|---|---|
| Định dạng | JSON, UTF-8. Request có body gửi header `Content-Type: application/json` |
| Thành công | HTTP 2xx, body `{ "data": ... }` |
| Lỗi | HTTP 4xx/5xx, body `{ "error": { "message": "...", "fields": { ... } } }` |
| `message` | Câu tiếng Việt thân thiện — frontend hiển thị **nguyên văn** cho người dùng |
| `fields` | (không bắt buộc) lỗi theo từng ô nhập, key là tên trường gửi lên. Frontend tô đỏ đúng ô đó |
| Giá tiền | Số nguyên VNĐ, ví dụ `2290000` (frontend tự format thành `2.290.000₫`) |
| Mã sản phẩm | Chuỗi, ví dụ `"lounge-chair"` (khớp `data/products.json`) |

Mã HTTP frontend phân biệt: `404` (không tìm thấy), `401` (sai đăng nhập), `409` (trùng email), `422` (dữ liệu không hợp lệ). Lỗi kết nối (server tắt) frontend tự báo "Không kết nối được máy chủ".

Ví dụ lỗi validate:

```json
{
  "error": {
    "message": "Vui lòng kiểm tra lại thông tin đặt hàng.",
    "fields": { "phone": "Số điện thoại không hợp lệ (vd. 0912345678).", "address": "Vui lòng nhập địa chỉ cụ thể." }
  }
}
```

---

## 3. Sản phẩm

### `GET /api/products`

Danh sách có tìm kiếm, lọc và phân trang. Mọi tham số đều không bắt buộc; tham số rỗng = bỏ qua.

| Tham số | Ý nghĩa |
|---|---|
| `cat` | `chair` \| `sofa` \| `table` \| `storage` |
| `q` | Từ khoá, tìm trong `name` + `desc`, **không phân biệt hoa thường và dấu** ("go soi" khớp "gỗ sồi") |
| `min`, `max` | Khoảng giá (VNĐ), bao gồm hai đầu |
| `page` | Trang, bắt đầu từ 1 (vượt quá thì trả trang cuối) |
| `limit` | Số sản phẩm mỗi trang, mặc định 12, tối đa 100 |

Frontend đang gọi: trang chủ `?limit=8` hoặc `?cat=sofa&limit=8`; trang sản phẩm `?cat=&q=&min=&max=&page=&limit=8`; trang chi tiết `?limit=100` (lấy sản phẩm liên quan).

Phản hồi:

```json
{ "data": {
  "items": [ { ...sản phẩm... } ],
  "page": 1, "limit": 8, "total": 9, "totalPages": 2
} }
```

### `GET /api/products/:id`

Trả về một sản phẩm đầy đủ trường. Không có → `404` `"Không tìm thấy sản phẩm."`.

### Cấu trúc một sản phẩm

```json
{
  "id": "lounge-chair",
  "name": "Ghế thư giãn Lounge",
  "cat": "chair",
  "price": 2290000,
  "old": 2590000,
  "img": "images/yellow-chair.jpg",
  "alt": "Mô tả ảnh cho người khiếm thị",
  "collection": "Bộ sưu tập Thường Ngày",
  "tagline": "Câu mô tả ngắn",
  "pill": "Nhãn trên ảnh",
  "rating": 4.8,
  "reviews": 32,
  "desc": "Mô tả sản phẩm",
  "colors": [["Vàng mù tạt", "#d6aa2b"], ["Xanh rêu nhạt", "#8c9984"]],
  "finish": "Gỗ tự nhiên",
  "specs": { "Kích thước": "R 72 × S 78 × C 84 cm" }
}
```

Bắt buộc: `id, name, cat, price, img`. `old` (giá gốc) chỉ có khi đang giảm giá. Các trường còn lại thiếu thì frontend tự ẩn phần tương ứng.

---

## 4. Giỏ hàng (lưu trong session)

Mỗi dòng trong giỏ là **một sản phẩm + một màu**. Cùng sản phẩm khác màu = hai dòng.

### Cấu trúc giỏ hàng (mọi API giỏ hàng đều trả về object này)

```json
{ "data": {
  "items": [
    { "lineId": "lounge-chair__vang-mu-tat", "productId": "lounge-chair", "name": "Ghế thư giãn Lounge",
      "img": "images/yellow-chair.jpg", "color": "Vàng mù tạt", "price": 2290000, "qty": 2, "lineTotal": 4580000 }
  ],
  "count": 2,
  "subtotal": 4580000,
  "shippingFee": 0,
  "total": 4580000
} }
```

- `lineId`: backend tự tạo, duy nhất trong giỏ; frontend chỉ gửi lại, không tự ghép.
- `count`: tổng số lượng (số hiện trên icon giỏ hàng).
- Giá luôn lấy từ dữ liệu sản phẩm phía server, **không tin giá client gửi lên**.

| Method & đường dẫn | Body | Ghi chú |
|---|---|---|
| `GET /api/cart` | — | Giỏ trống trả `items: []`, các số = 0 |
| `POST /api/cart` | `{ "productId": "lounge-chair", "qty": 1, "color": "Vàng mù tạt" }` | Thêm; nếu dòng đã có thì cộng dồn. `color` bỏ trống = màu đầu tiên. Lỗi: 404 sản phẩm không tồn tại, 400 `qty` ngoài 1–99 hoặc màu không có |
| `PATCH /api/cart/items/:lineId` | `{ "qty": 3 }` | Đặt lại số lượng; `qty = 0` = xoá dòng. 404 nếu không có dòng |
| `DELETE /api/cart/items/:lineId` | — | Xoá dòng |

Số lượng tối đa mỗi dòng: 99.

---

## 5. Đặt hàng

### `POST /api/orders`

Body:

```json
{
  "name": "Nguyễn Văn A",
  "phone": "0912345678",
  "email": "a@example.com",
  "city": "TP. Hồ Chí Minh",
  "address": "12 Lê Lợi, phường Bến Thành",
  "note": "Gọi trước khi giao",
  "payment": "cod"
}
```

Quy tắc kiểm tra (frontend kiểm tra trước, **backend bắt buộc kiểm tra lại**; dùng chung hàm `validateOrder` trong `js/api.js`):

| Trường | Quy tắc | Câu báo lỗi gợi ý |
|---|---|---|
| `name` | bắt buộc, ≥ 2 ký tự | Vui lòng nhập họ tên người nhận. |
| `phone` | bắt buộc; bỏ khoảng trắng/dấu chấm/gạch rồi khớp `^(0\|\+84)(3\|5\|7\|8\|9)\d{8}$` | Số điện thoại không hợp lệ (vd. 0912345678). |
| `email` | không bắt buộc; nếu có phải đúng định dạng | Email không đúng định dạng. |
| `city` | bắt buộc | Vui lòng chọn tỉnh / thành phố. |
| `address` | bắt buộc, ≥ 5 ký tự | Vui lòng nhập địa chỉ cụ thể (số nhà, đường, phường/xã). |
| `note` | không bắt buộc, ≤ 500 ký tự | Ghi chú tối đa 500 ký tự. |
| `payment` | `cod` hoặc `bank` | Vui lòng chọn phương thức thanh toán. |

- Giỏ trống → `400` `"Giỏ hàng đang trống, không thể đặt hàng."`
- Sai dữ liệu → `422` kèm `fields` như bảng trên.
- Body rỗng / không phải JSON → `400` với `message` thân thiện.

Thành công → `201`, **xoá giỏ hàng trong session**, lưu đơn vào session và trả về:

```json
{ "data": {
  "code": "AKIO-20261116-7K2Q",
  "createdAt": "2026-11-16T15:20:00.000Z",
  "status": "pending",
  "customer": { "name": "...", "phone": "0912345678", "email": "...", "city": "...", "address": "...", "note": "..." },
  "payment": "cod",
  "items": [ ...giống items của giỏ hàng... ],
  "subtotal": 4580000, "shippingFee": 0, "total": 4580000
} }
```

Mã đơn (`code`) chỉ dùng chữ in hoa, số và dấu `-` vì frontend đặt nó lên địa chỉ trang (`order-success.html#AKIO-20261116-7K2Q`).

### `GET /api/orders/:code`

Trả về đơn ở trên. Chỉ xem được đơn đã đặt **trong session hiện tại**, nếu không → `404` `"Không tìm thấy đơn hàng."`.

---

## 6. Tài khoản (đã làm — `backend/routes/auth.js`, `backend/lib/users.js`)

| Method & đường dẫn | Body | Thành công trả `data` | Lỗi |
|---|---|---|---|
| `GET /api/auth/me` | — | `{ "name", "email" }` hoặc `null` nếu chưa đăng nhập | — |
| `POST /api/auth/register` | `{ "name", "email", "password" }` | `201` `{ "name", "email" }` và đăng nhập luôn | `422` + `fields` (`name` 2–60 ký tự, `email` hợp lệ, `password` 6–100 ký tự); `409` + `fields.email` nếu email đã có |
| `POST /api/auth/login` | `{ "email", "password" }` | `{ "name", "email" }` | `422` thiếu email/mật khẩu; `401` `"Email hoặc mật khẩu không đúng."`; `429` sai quá 5 lần trong 10 phút |
| `POST /api/auth/logout` | — | `null` | — |

- Mật khẩu băm bằng **scrypt** (module `crypto` có sẵn của Node.js) + salt ngẫu nhiên; so sánh bằng `timingSafeEqual`. Không lưu chữ thường, không bao giờ trả mật khẩu/hash về.
- Tài khoản lưu ở `backend/data/users.json` (đổi bằng biến môi trường `USERS_FILE`) → khởi động lại server vẫn còn. File này nằm trong `.gitignore`.
- Email không phân biệt hoa thường, tự cắt khoảng trắng.
- Đăng nhập / đăng ký: đổi mã session (chống chiếm phiên) nhưng **giữ nguyên giỏ hàng**.
- Đăng xuất: xoá người dùng và các đơn trong phiên (để người sau trên cùng máy không xem được địa chỉ, số điện thoại), **giữ giỏ hàng**.
- Bản mock của frontend kiểm tra mật khẩu bằng một hàm băm đơn giản lưu trong `localStorage` — chỉ để demo giao diện, không an toàn như server.

### `GET /api/orders` — Đơn hàng của tôi

Trả về mảng đơn (cấu trúc như mục 5), mới nhất trước:

- Đã đăng nhập: mọi đơn đặt khi đăng nhập tài khoản này (ở bất kỳ máy nào) + đơn trong phiên hiện tại.
- Chưa đăng nhập: chỉ các đơn đặt trong phiên hiện tại.

Đơn đặt khi đã đăng nhập được lưu vào tài khoản, nên `GET /api/orders/:code` cũng xem được sau khi đăng nhập lại.

---

## 7. Phân công gợi ý theo bảng việc

| Việc trong bảng | Endpoint |
|---|---|
| Khởi tạo Server & Mock Data | phục vụ thư mục frontend + nạp `data/products.json` |
| Cấu hình Session | `express-session` (hoặc tương đương) cho giỏ hàng, đơn hàng, người dùng |
| API danh sách & chi tiết | `GET /api/products`, `GET /api/products/:id` |
| Logic giỏ hàng | `GET/POST /api/cart`, `PATCH/DELETE /api/cart/items/:lineId` |
| Đặt hàng | `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:code` |
| Tài khoản | `/api/auth/register`, `/login`, `/logout`, `/me` |
| Tìm kiếm & lọc | tham số `q`, `cat`, `min`, `max`, `page`, `limit` của `GET /api/products` |
| Validate & phản hồi lỗi | định dạng lỗi ở mục 2 + bảng quy tắc ở mục 5 |

## 8. Kiểm tra nhanh khi tích hợp

1. Đặt `API_MODE = 'server'`, chạy server, mở `http://localhost:3000/products.html`.
2. Tìm "go soi", chọn khoảng giá, bấm sang trang 2 → danh sách đổi đúng.
3. Vào một sản phẩm, chọn màu khác, thêm 2 cái → icon giỏ hàng tăng 2; tải lại trang vẫn còn.
4. Mở giỏ hàng, tăng / giảm / xoá → tổng tiền đúng.
5. Thanh toán với số điện thoại `123` → ô số điện thoại báo đỏ đúng câu của server.
6. Đặt hàng hợp lệ → sang trang xác nhận có mã đơn, giỏ hàng về 0.
7. Tắt server, tải lại trang → frontend báo "Không kết nối được máy chủ", không bị trắng trang.
