# Hướng dẫn Setup Gallery Feature

## Tổng quan

Tính năng Gallery cho phép:
- Hiển thị ảnh kiểu tóc đẹp từ tiệm
- Khách hàng like ảnh (cookie-based, không cần login)
- Xếp hạng theo likes
- Ghi rõ thợ nào làm
- Featured images luôn hiển thị ở top

---

## PHẦN 1: Supabase Setup (BẮT BUỘC)

### Bước 1.1: Chạy Migration SQL

1. Mở Supabase Dashboard: https://supabase.com/dashboard
2. Chọn project của bạn
3. Vào **SQL Editor** (menu bên trái)
4. Click **New Query**
5. Copy toàn bộ nội dung file:

```
supabase/migrations/20260522_gallery_system.sql
```

6. Paste vào SQL Editor
7. Click **Run** (hoặc phím tắt Cmd/Ctrl + Enter)

**Kết quả mong đợi:** Thấy thông báo "Success" và các bảng mới được tạo

### Bước 1.2: Tạo Storage Bucket

1. Trong Supabase Dashboard, vào **Storage** (menu bên trái)
2. Click **New bucket**
3. Điền thông tin:
   - **Name:** `gallery`
   - **Public:** ✅ TICK (phải public để hiển thị ảnh)
4. Click **Create bucket**

### Bước 1.3: Cấu hình Storage Policies

1. Trong Storage, click vào bucket `gallery`
2. Vào tab **Policies**
3. Click **Add policy** cho mỗi policy sau:

**Policy 1: Public read access**
```sql
-- Name: Public can view gallery images
-- Target: authenticated and anonymous users
-- Action: SELECT
-- USING: true
```

**Policy 2: Authenticated users can upload**
```sql
-- Name: Auth users can upload
-- Target: authenticated users  
-- Actions: INSERT, UPDATE, DELETE
-- WITH CHECK: auth.role() = 'authenticated'
```

Hoặc đơn giản hơn, tạo policy cho phép public upload từ API:

```sql
-- Policy: Allow public uploads via API
-- Name: public_upload
-- Target: Public
-- Actions: INSERT
-- WITH CHECK: true
```

### Bước 1.4: Kiểm tra Tables đã tạo

1. Vào **Table Editor** (menu bên trái)
2. Bạn sẽ thấy 2 bảng mới:
   - `gallery_items` - Lưu thông tin ảnh
   - `gallery_likes` - Lưu likes của khách

---

## PHẦN 2: Cập nhật Environment Variables

Thêm vào file `.env.local` (hoặc cài đặt trên Vercel/Cloudflare):

```bash
# Cái này có thể đã có
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Service role - cần cho API upload
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Lưu ý:** `SUPABASE_SERVICE_ROLE_KEY` bắt đầu bằng `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (có chữ `service_role` ở giữa)

---

## PHẦN 3: Upload Ảnh mới (Test)

### Cách 1: Qua Admin Panel (Sau khi deploy)

1. Truy cập `/admin`
2. Login với tài khoản admin
3. Click tab **Gallery**
4. Upload ảnh, chọn stylist, điền thông tin
5. Click **Upload & Publish**

### Cách 2: Qua Supabase Dashboard (Test nhanh)

1. Vào **Storage** → bucket `gallery`
2. Click **Upload** và chọn ảnh
3. Copy URL của ảnh
4. Vào **Table Editor** → bảng `gallery_items`
5. Click **Insert row**:
   - `id`: Để trống (sẽ tự tạo)
   - `image_url`: Paste URL từ bước 3
   - `thumbnail_url`: Có thể để trống
   - `stylist_id`: UUID của stylist (xem trong bảng `stylists`)
   - `title`: Tên kiểu tóc (VD: "Classic Fade")
   - `week_number`: Số tuần hiện tại (VD: 21)
   - `year`: Năm hiện tại (VD: 2026)
   - `is_featured`: false
   - `is_active`: true

---

## PHẦN 4: Kiểm tra sau khi Setup

### Test Local

1. Chạy `npm run dev`
2. Truy cập http://localhost:3000
3. Scroll xuống section **Gallery**
4. Bạn sẽ thấy ảnh (nếu đã insert qua Supabase)

### Test Admin

1. Truy cập http://localhost:3000/admin
2. Login
3. Click tab **Gallery**
4. Thử upload 1 ảnh mới

---

## PHẦN 5: Troubleshooting

### Lỗi "Storage bucket not found"

**Nguyên nhân:** Bucket `gallery` chưa được tạo

**Cách fix:**
1. Vào Supabase → Storage
2. Tạo bucket tên `gallery` với Public = ON

### Lỗi "Permission denied" khi upload

**Nguyên nhân:** Thiếu Storage Policy

**Cách fix:**
1. Vào Storage → bucket `gallery` → Policies
2. Thêm policy cho phép INSERT

### Lỗi "SUPABASE_SERVICE_ROLE_KEY not set"

**Nguyên nhân:** Chưa có env `SUPABASE_SERVICE_ROLE_KEY`

**Cách fix:**
1. Lấy key từ Supabase → Settings → API → `service_role` secret
2. Thêm vào `.env.local`

### Lỗi ảnh không hiển thị

**Nguyên nhân:** 
- Bucket không public
- URL ảnh sai
- `is_active = false`

**Cách fix:**
1. Kiểm tra bucket `gallery` đã tích Public
2. Kiểm tra ảnh có URL đúng
3. Kiểm tra `is_active = true` trong database

---

## Cấu trúc Database

### Bảng `gallery_items`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| image_url | TEXT | URL ảnh đầy đủ |
| thumbnail_url | TEXT | URL ảnh nhỏ (lazy load) |
| stylist_id | UUID | FK → stylists.id |
| title | TEXT | Tên kiểu tóc |
| description | TEXT | Mô tả |
| week_number | INT | Số tuần (1-53) |
| year | INT | Năm |
| like_count | INT | Số likes (auto-update) |
| is_featured | BOOLEAN | Luôn hiển thị ở top |
| is_active | BOOLEAN | Hiển thị/ẩn |
| created_at | TIMESTAMP | Thời gian tạo |

### Bảng `gallery_likes`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| gallery_item_id | UUID | FK → gallery_items.id |
| visitor_id | TEXT | ID khách (từ cookie) |
| created_at | TIMESTAMP | Thời gian like |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/gallery` | Lấy danh sách ảnh |
| POST | `/api/gallery` | Tạo ảnh mới (admin) |
| POST | `/api/gallery/like` | Toggle like |
| GET | `/api/gallery/manage` | Lấy tất cả ảnh (admin) |
| PUT | `/api/gallery/manage` | Cập nhật ảnh (admin) |
| DELETE | `/api/gallery/manage?id=xxx` | Xóa ảnh (admin) |
| POST | `/api/gallery/upload` | Upload ảnh lên storage |

---

## Checklist trước khi Deploy

- [ ] Đã chạy migration SQL thành công
- [ ] Đã tạo bucket `gallery` với Public = ON
- [ ] Đã thêm Storage Policies
- [ ] Đã cập nhật `.env.local` với `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Đã test upload 1 ảnh thành công
- [ ] Gallery hiển thị đúng trên trang chủ
- [ ] Admin Panel có tab Gallery
