"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0b0b0b] text-[#f5f0e8] antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16 text-center">
          <p className="font-be text-xs uppercase tracking-[0.3em] text-[#8a8068]">Be. Hair &amp; Barber</p>
          <h1 className="font-be text-2xl font-semibold tracking-wide">Application error</h1>
          <p className="max-w-md text-sm leading-relaxed text-[#b0a898]">
            A critical error occurred. Please refresh the page or try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl be-gold-gradient px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#0a0a0a]"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
