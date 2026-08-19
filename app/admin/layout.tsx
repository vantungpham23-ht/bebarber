import { Suspense, type ReactNode } from "react";
import { AdminAmbientBg } from "@/components/admin-ambient-bg";
import { AdminAuthFallback } from "@/components/admin-auth-fallback";
import { AdminAuthGate } from "@/components/admin-auth-gate";
import { adminPageBg, adminTopRule } from "@/lib/admin-ui-classes";

/** Client gate uses `usePathname()` — force dynamic segment + Suspense avoids intermittent 500 on /admin (dev / some hosts). */
export const dynamic = "force-dynamic";
/** Cloudflare Pages (@cloudflare/next-on-pages) yêu cầu mọi route động dùng Edge. */
export const runtime = "edge";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className={adminPageBg}>
      <AdminAmbientBg />
      <div className={adminTopRule} aria-hidden />
      <div className="relative z-10">
        <Suspense fallback={<AdminAuthFallback />}>
          <AdminAuthGate>{children}</AdminAuthGate>
        </Suspense>
      </div>
    </div>
  );
}
