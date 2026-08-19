"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 bg-[#0b0b0b] px-6 py-16 text-center text-[#f5f0e8]">
      <p className="font-be text-xs uppercase tracking-[0.3em] text-[#8a8068]">Be. Hair &amp; Barber</p>
      <h1 className="font-be text-2xl font-semibold tracking-wide">Something went wrong</h1>
      <p className="max-w-md text-sm leading-relaxed text-[#b0a898]">
        {error.message || "An unexpected error occurred. You can try again or return to the homepage."}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl be-gold-gradient px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#0a0a0a]"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-xl border border-[#333] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#b0a898] transition-colors hover:border-[#ab832e]"
        >
          Home
        </a>
      </div>
    </div>
  );
}
