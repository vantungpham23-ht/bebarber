# Đặt lịch: email xác nhận + Telegram

Sau khi khách bấm **Potvrdiť / Confirm booking**, ứng dụng gọi **`POST /api/bookings`** (server Next.js). API:

1. Ghi booking vào Supabase bằng **Service Role key** (bypass RLS, an toàn vì key chỉ nằm trên server).
2. Kiểm tra dịch vụ + stylist còn **active** và có trong **`stylist_services`** (chống gửi booking giả).
3. Nếu khách có email và bạn đã cấu hình **Resend** → gửi email HTML xác nhận (theo ngôn ngữ EN/SK trên site).
4. Nếu bạn đã cấu hình **Telegram** → gửi tin nhắn cho nhóm/kênh/cá nhân của bạn.

---

## 1. Biến môi trường bắt buộc (server)

### `SUPABASE_SERVICE_ROLE_KEY` (bắt buộc cho API booking)

| Bước | Việc cần làm |
|------|----------------|
| 1 | Mở [Supabase Dashboard](https://supabase.com/dashboard) → chọn project. |
| 2 | **Project Settings** (biểu tượng bánh răng) → **API**. |
| 3 | Mục **Project API keys** → copy **`service_role`** (**secret**). |
| 4 | Thêm vào `.env.local` (và Vercel / hosting): |

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Cảnh báo:** Không đặt prefix `NEXT_PUBLIC_`. Không commit file `.env.local` lên Git. Ai có key này có toàn quyền trên DB — chỉ dùng trên server.

Nếu thiếu key, API trả **503** và modal báo lỗi (booking không được tạo qua form).

---

## 2. Email xác nhận — Resend (khuyến nghị)

### Tạo tài khoản & API key

1. Vào [resend.com](https://resend.com) → đăng ký / đăng nhập.
2. **API Keys** → **Create API Key** → copy key.

### Gửi thử (domain mặc định của Resend)

- Với tài khoản mới, có thể gửi **chỉ tới email của chính bạn** từ địa chỉ `onboarding@resend.dev` (giới hạn theo docs Resend).
- Thêm vào `.env.local`:

```bash
RESEND_API_KEY=re_VgKwrrBp_MsXaALkD1KLMyHrbajdTAfaX
# Tuỳ chọn — mặc định code dùng onboarding@resend.dev
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### Gửi từ domain salon (production)

1. Resend → **Domains** → **Add domain** → làm theo hướng dẫn DNS (SPF, DKIM).
2. Sau khi verified, đặt ví dụ:

```bash
RESEND_FROM_EMAIL=Be. Booking <booking@behairbarber.sk>
```

Email **chỉ gửi** khi khách nhập email trong form (field vẫn optional). Nếu không có `RESEND_API_KEY`, booking vẫn thành công, chỉ bỏ qua bước mail.

---

## 3. Telegram — bot thông báo có khách đặt

### Bước A — Tạo bot

1. Mở Telegram, tìm **@BotFather**.
2. Gửi `/newbot` → đặt tên và username → nhận **HTTP API token** dạng `123456789:AAHxxxxxxxx`.

### Bước B — Lấy `chat_id`

**Cách 1 — Tin nhắn tới nhóm (khuyến nghị cho tiệm)**

1. Tạo nhóm Telegram, thêm bot vừa tạo vào nhóm (Add members → tìm username bot).
2. Gửi một tin bất kỳ trong nhóm (có thể `/start`).
3. Trên trình duyệt mở (thay `TOKEN`):

   `https://api.telegram.org/botTOKEN/getUpdates`

4. Trong JSON, tìm `"chat":{"id":-1001234567890,...}` — số **âm** là ID nhóm **supergroup**.

**Cách 2 — Chat riêng với bot**

1. User bấm **Start** với bot.
2. Mở `getUpdates` như trên → `chat.id` là số dương (user).

### Bước C — Thêm env

```bash
TELEGRAM_BOT_TOKEN=8120426978:AAG9yHrsRqU-9KFyK4vpd854-Y3ztRy4-pY
TELEGRAM_CHAT_ID=-6531633967
```

Nếu thiếu một trong hai, booking vẫn OK, chỉ không gửi Telegram.

---

## 4. File `.env.local` — checklist

```bash
# Đã có từ trước (client)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_ALLOWED_ADMIN_USER_ID=uuid-admin

# Mới — server only
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Tuỳ chọn
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev

TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

Sau khi sửa `.env.local`: **dừng** `npm run dev` và chạy lại. Trên **Vercel**: Settings → Environment Variables → thêm các biến trên (Production + Preview nếu cần) → **Redeploy**.

---

## 5. Kiểm tra nhanh

1. `npm run dev` — mở site → đặt lịch có email → kiểm tra hộp thư (và spam).
2. Xem terminal server: log `Resend:` / `Telegram:` nếu lỗi (HTTP nhưng booking đã lưu).
3. Supabase → **Table Editor** → `bookings` — dòng mới phải xuất hiện.

---

## 6. Bảo mật & vận hành

- API **không** nhận secret từ browser ngoài payload booking; rate limit có thể bổ sung sau (middleware, Upstash, v.v.).
- Nội dung email/Telegram dùng tên dịch vụ & stylist **đọc từ database**, không tin tưởng tên do client gửi.
- GDPR: nếu có khách EU, cần chính sách privacy và cơ sở xử lý email (giao dịch / đặt lịch).

---

## 7. Gỡ lỗi

| Hiện tượng | Hướng xử lý |
|------------|-------------|
| 503 + nhắc `SUPABASE_SERVICE_ROLE_KEY` | Thêm service role vào env, restart dev / redeploy. |
| Booking OK, không có email | Kiểm tra `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, email khách có điền không; xem log server. |
| Booking OK, không có Telegram | Kiểm tra token, `chat_id` (đúng nhóm/user), bot đã vào nhóm chưa. |
| 400 “not linked” | Stylist không gán dịch vụ đó trong admin → sửa `stylist_services`. |

---

## 8. Code liên quan (tham chiếu)

| File | Vai trò |
|------|---------|
| `app/api/bookings/route.ts` | POST: insert + gọi Resend/Telegram |
| `lib/supabase-server.ts` | Client Supabase service role |
| `lib/booking-notifications.ts` | HTML email + Telegram |
| `components/booking-modal.tsx` | `fetch("/api/bookings", …)` |
