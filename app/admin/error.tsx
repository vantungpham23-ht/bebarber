"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.25em] text-[#8a8068]">Admin</p>
      <h1 className="font-be text-xl font-semibold text-[#f5f0e8]">This section hit an error</h1>
      <p className="max-w-md text-sm text-[#b0a898]">
        {error.message ||
          "If you just restarted the dev server, stop duplicate `next dev` processes, delete `.next`, then run `npm run dev` again."}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl be-gold-gradient px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#0a0a0a]"
        >
          Try again
        </button>
        <Link
          href="/admin/login"
          className="rounded-xl border border-[#333] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#b0a898]"
        >
          Login
        </Link>
        <Link href="/" className="text-xs uppercase tracking-wider text-[#6b655c] underline-offset-4 hover:text-[#ede583]">
          ← Site
        </Link>
      </div>
    </div>
  );
}
