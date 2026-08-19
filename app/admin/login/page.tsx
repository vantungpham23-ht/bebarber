"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  adminInput,
  adminLabel,
  adminMuted,
  adminPrimaryBtn,
} from "@/lib/admin-ui-classes";

const ADMIN_ID = process.env.NEXT_PUBLIC_ALLOWED_ADMIN_USER_ID?.trim() ?? "";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("error");
    if (q === "forbidden") {
      setError(
        "User ID không khớp NEXT_PUBLIC_ALLOWED_ADMIN_USER_ID. Cập nhật UUID trong .env.local theo Supabase → Authentication → Users."
      );
    }
    if (q === "config") {
      setError("Thiếu NEXT_PUBLIC_ALLOWED_ADMIN_USER_ID trong biến môi trường.");
    }
  }, []);

  useEffect(() => {
    if (!ADMIN_ID) return;
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || !session?.user) return;
      if (session.user.id === ADMIN_ID) {
        router.replace("/admin");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!ADMIN_ID) {
      setError("Missing NEXT_PUBLIC_ALLOWED_ADMIN_USER_ID in environment.");
      return;
    }
    setLoading(true);

    const { data, error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signErr) {
      setError(signErr.message);
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user || !ADMIN_ID || user.id !== ADMIN_ID) {
      await supabase.auth.signOut();
      setError(
        user && ADMIN_ID
          ? "Đăng nhập Supabase thành công, nhưng User ID của tài khoản này không khớp NEXT_PUBLIC_ALLOWED_ADMIN_USER_ID. Vào Supabase → Authentication → Users → chọn user admin@… → copy UUID (User UID) và dán vào .env.local, rồi chạy lại dev server / deploy lại."
          : "This account is not authorized for admin access."
      );
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
    setLoading(false);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-5 py-16 sm:px-8">
      <div className="w-full max-w-[420px]">
        <header className="mb-10 text-center">
          <Link
            href="/"
            className="group inline-flex flex-col items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ab832e]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0b]"
          >
            <span className="font-be text-4xl tracking-[0.38em] text-[#f5f0e8] transition-colors group-hover:text-[#ede583] sm:text-5xl">
              Be<span className="be-gold-text">.</span>
            </span>
            <span className="block h-px w-12 bg-gradient-to-r from-transparent via-[#ab832e]/70 to-transparent" />
            <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-[#8a8275]">
              Studio admin
            </p>
          </Link>
        </header>

        <div className="relative rounded-2xl p-[1px] shadow-[0_32px_64px_-32px_rgba(0,0,0,0.85)]">
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#ab832e]/35 via-[#2a2418] to-[#ab832e]/15 opacity-90"
            aria-hidden
          />
          <div className="relative rounded-[15px] bg-[#0c0c0c]/95 px-7 py-9 backdrop-blur-sm sm:px-9 sm:py-10">
            <p className={`${adminMuted} mb-8 text-center leading-relaxed`}>
              Sign in with the authorized account to manage bookings, the price list, and staff.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/35 bg-red-500/[0.08] px-4 py-3 text-sm leading-snug text-red-200/95"
                >
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="admin-email" className={adminLabel}>
                  Email
                </label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={adminInput}
                />
              </div>

              <div>
                <label htmlFor="admin-password" className={adminLabel}>
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={adminInput}
                />
              </div>

              <button type="submit" disabled={loading} className={`${adminPrimaryBtn} mt-2 w-full py-3.5`}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-10 text-center">
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-[0.2em] text-[#8a8275] transition-colors hover:text-[#ede583]"
          >
            ← Back to site
          </Link>
        </p>
      </div>
    </div>
  );
}
