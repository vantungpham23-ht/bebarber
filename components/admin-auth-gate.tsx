"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_ID = process.env.NEXT_PUBLIC_ALLOWED_ADMIN_USER_ID?.trim() ?? "";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const isLoginRoute = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginRoute) {
      setReady(true);
      return;
    }

    setReady(false);
    let cancelled = false;

    (async () => {
      if (!ADMIN_ID) {
        router.replace("/admin/login?error=config");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session?.user) {
        router.replace("/admin/login");
        return;
      }

      if (session.user.id !== ADMIN_ID) {
        await supabase.auth.signOut();
        router.replace("/admin/login?error=forbidden");
        return;
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoginRoute, pathname, router]);

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-6">
        <div className="font-be text-3xl tracking-[0.4em] sm:text-4xl">
          <span className="be-gold-text">Be.</span>
        </div>
        <div
          className="h-0.5 w-14 rounded-full bg-gradient-to-r from-[#ab832e] via-[#ede583] to-[#ab832e] opacity-90 motion-safe:animate-pulse"
          aria-hidden
        />
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#6b655c]">
          Verifying session
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
