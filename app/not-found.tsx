import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 bg-[#0b0b0b] px-6 py-20 text-center text-[#f5f0e8]">
      <p className="font-be text-xs uppercase tracking-[0.3em] text-[#8a8068]">404</p>
      <h1 className="font-be text-2xl font-semibold">Page not found</h1>
      <Link
        href="/"
        className="rounded-xl be-gold-gradient px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#0a0a0a]"
      >
        Back to home
      </Link>
    </div>
  );
}
