/** Server-safe fallback while `usePathname` / auth gate hydrates (avoids RSC bailout crashes on some hosts). */
export function AdminAuthFallback() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-6">
      <div className="font-be text-3xl tracking-[0.4em] sm:text-4xl">
        <span className="be-gold-text">Be.</span>
      </div>
      <div
        className="h-0.5 w-14 rounded-full bg-gradient-to-r from-[#ab832e] via-[#ede583] to-[#ab832e] opacity-90 motion-safe:animate-pulse"
        aria-hidden
      />
      <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#6b655c]">Loading…</p>
    </div>
  );
}
