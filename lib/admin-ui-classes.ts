/** Shared Tailwind tokens for /admin + login — matches site luxury gold/black. */

export const adminPageBg =
  "relative min-h-screen bg-[#0b0b0b] text-[#f5f0e8] antialiased";

export const adminTopRule =
  "pointer-events-none absolute left-0 right-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-[#ab832e]/45 to-transparent";

export const adminCard =
  "rounded-2xl border border-[#252018] bg-gradient-to-br from-[#171717] via-[#121212] to-[#0c0c0c] text-[#f5f0e8] shadow-[0_0_0_1px_rgba(171,131,46,0.08),0_24px_48px_-28px_rgba(0,0,0,0.65)]";

export const adminCardHover =
  "transition-[border-color,box-shadow] duration-300 hover:border-[#3d3420] hover:shadow-[0_0_0_1px_rgba(171,131,46,0.12),0_28px_56px_-28px_rgba(0,0,0,0.7)]";

export const adminInput =
  "w-full rounded-xl border border-[#2a2a2a] bg-[#080808] px-3.5 py-2.5 text-[#f5f0e8] outline-none transition-[border-color,box-shadow] placeholder:text-[#5c5c5c] focus:border-[#ab832e] focus:ring-1 focus:ring-[#ab832e]/35";

export const adminSelect = `${adminInput} appearance-none bg-[#080808]`;

export const adminLabel =
  "mb-1.5 block text-[10px] font-medium uppercase tracking-[0.22em] text-[#b0a898]";

export const adminMuted = "text-sm text-[#8a8275]";

export const adminTabBar =
  "inline-flex flex-wrap gap-1 rounded-xl border border-[#252018] bg-[#101010]/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]";

export function adminTabButton(active: boolean) {
  return active
    ? "be-gold-gradient rounded-lg px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#0a0a0a] shadow-[0_4px_20px_-4px_rgba(171,131,46,0.45)]"
    : "rounded-lg px-4 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-[#9a9285] transition-colors hover:bg-white/[0.05] hover:text-[#ede583]";
}

export const adminPrimaryBtn =
  "inline-flex items-center justify-center rounded-xl be-gold-gradient px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#0a0a0a] shadow-[0_4px_24px_-6px_rgba(171,131,46,0.4)] transition-opacity hover:opacity-95 disabled:opacity-45";

export const adminGhostBtn =
  "inline-flex items-center justify-center rounded-xl border border-[#333] bg-transparent px-4 py-2.5 text-xs font-medium uppercase tracking-[0.16em] text-[#b0a898] transition-colors hover:border-[#ab832e]/60 hover:text-[#ede583]";

/** Compact actions inside list rows (Edit, Hide, …). */
export const adminGhostBtnSm =
  "inline-flex items-center justify-center rounded-lg border border-[#333] bg-transparent px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[#9a9285] transition-colors hover:border-[#ab832e]/50 hover:text-[#ede583]";

export const adminPrimaryBtnSm =
  "inline-flex items-center justify-center rounded-lg be-gold-gradient px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0a0a0a] shadow-[0_2px_16px_-4px_rgba(171,131,46,0.35)] transition-opacity hover:opacity-95 disabled:opacity-45";
