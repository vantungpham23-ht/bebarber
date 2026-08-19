# Deploy lên Cloudflare Pages

Dự án dùng [`@cloudflare/next-on-pages`](https://github.com/cloudflare/next-on-pages) (Next.js App Router, route động chạy Edge).

## Biến môi trường (Dashboard → Settings → Environment variables)

- `CF_PAGES` = `1` (bật `images.unoptimized` trong `next.config.mjs`).
- Các biến như trong `.env.local.example` (`NEXT_PUBLIC_*`, `SUPABASE_SERVICE_ROLE_KEY`).

## Lỗi deploy Function: `No such module "node:stream"`

`wrangler.toml` đã có `compatibility_flags = ["nodejs_compat"]` để runtime Workers hỗ trợ polyfill Node (Supabase client trên Edge). Nếu Dashboard từng ghi đè compatibility: Settings → Functions → đồng bộ với repo hoặc bật **Node.js compatibility** tương đương.

## Build trên Cloudflare (khuyến nghị)

- **Build command:** `npm run pages:build`
- **Build output directory:** `.vercel/output/static`
- **Node version:** 20.x (hoặc 18.x) trong project settings.

## Build & preview local

```bash
npm run pages:build
npx wrangler pages dev .vercel/output/static --compatibility-date=2024-12-01
```

## Ghi chú

- `@cloudflare/next-on-pages` trên npm có banner khuyến nghị [OpenNext Cloudflare](https://opennext.js.org/cloudflare); khi nâng Next lên 15+ có thể cân nhắc chuyển adapter.

## Lỗi `npm ci` / `EUSAGE` / “Missing: @esbuild/… from lock file”

Cloudflare chạy `npm clean-install` (`npm ci`). **Luôn commit và push `package-lock.json`** cùng `package.json`. Sau khi đổi dependency trên máy, chạy `npm install` rồi push lockfile mới — nếu lock lệch, CI sẽ fail với danh sách optional `@esbuild/*` thiếu.
