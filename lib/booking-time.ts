/** Salon calendar & wall-clock: Košice / Slovakia (same as Europe/Bratislava). */
export const BOOKING_TIMEZONE = "Europe/Bratislava";

/** Today as YYYY-MM-DD in Slovakia (not UTC). */
export function getTodayYmdInBookingTz(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Add calendar days to a YYYY-MM-DD, staying in Slovakia calendar. */
export function addCalendarDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0) + days * 86400000;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BOOKING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utcNoon));
}

/** Short label for date chips: e.g. Mon 14/4 */
export function formatBookingWeekdayShort(ymd: string, lang: "en" | "sk"): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0);
  const parts = new Intl.DateTimeFormat(lang === "sk" ? "sk-SK" : "en-GB", {
    timeZone: BOOKING_TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "numeric",
  }).formatToParts(new Date(utcNoon));
  const w = parts.find((p) => p.type === "weekday")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return `${w} ${day}/${month}`;
}

/** Long date for confirmation card. */
export function formatBookingDateLong(ymd: string, lang: "en" | "sk"): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0);
  return new Intl.DateTimeFormat(lang === "sk" ? "sk-SK" : "en-GB", {
    timeZone: BOOKING_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(utcNoon));
}

/** HH:MM end time from start + duration (same calendar day; salon services). */
export function computeEndTimeFromStartAndDuration(
  startHHMM: string,
  durationMinutes: number
): string {
  const parts = startHHMM.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const min = parseInt(parts[1] ?? "0", 10);
  const dur = Number(durationMinutes);
  if (!Number.isFinite(h) || !Number.isFinite(min) || !Number.isFinite(dur)) {
    return "00:00";
  }
  const total = h * 60 + min + dur;
  if (!Number.isFinite(total) || total < 0) return "00:00";
  const eh = Math.floor(total / 60);
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

/** Chuẩn HH:MM cho UI (TIME từ DB / chuỗi ngắn) — tránh .substring lỗi khi format lạ. */
export function formatBookingTimeHm(t: string): string {
  const s = t.trim();
  if (!s) return "—";
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return s.length >= 5 ? s.slice(0, 5) : s;
  const hh = String(Number(m[1])).padStart(2, "0");
  return `${hh}:${m[2]}`;
}
