import { isServiceCategoryId, type ServiceCategoryId } from "@/lib/service-categories";
import type { Service } from "@/lib/supabase";

function toInt(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function toNum(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** Chuẩn hóa row từ PostgREST (numeric thường là string). Tránh crash UI khi admin sửa & reload. */
export function normalizeService(row: unknown): Service {
  const r = row as Record<string, unknown>;
  const catStr =
    typeof r.category === "string" ? r.category : String(r.category ?? "mens");
  const category: ServiceCategoryId = isServiceCategoryId(catStr) ? catStr : "mens";

  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    description:
      r.description == null || r.description === ""
        ? null
        : String(r.description),
    duration_minutes: toInt(r.duration_minutes, 0),
    price: toNum(r.price, 0),
    price_max: r.price_max != null ? toNum(r.price_max, 0) : null,
    category,
    sort_order: toInt(r.sort_order, 0),
    is_active: Boolean(r.is_active),
    created_at: String(r.created_at ?? ""),
  };
}

export function normalizeServices(rows: unknown[] | null | undefined): Service[] {
  if (!rows?.length) return [];
  return rows.map(normalizeService);
}
