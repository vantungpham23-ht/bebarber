/** Server: show when public Supabase env is missing (avoids “blank site” confusion after deploy). */
export function EnvConfigBanner() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url && key) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-[200] border-b border-amber-600/50 bg-amber-950/95 px-4 py-2 text-center text-xs text-amber-100"
    >
      Missing <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_SUPABASE_URL</code> or{" "}
      <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> — set them in
      Vercel (or <code className="rounded bg-black/30 px-1">.env.local</code>) and redeploy. The site
      loads, but data and login will not work until then.
    </div>
  );
}
