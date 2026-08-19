/**
 * Gửi email (Resend) + Telegram — chỉ gọi từ server (API route).
 */

export type BookingNotifyPayload = {
  bookingId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  serviceName: string;
  stylistName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  price: number;
  notes: string | null;
  lang: "en" | "sk";
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailSubject(p: BookingNotifyPayload): string {
  return p.lang === "sk"
    ? `Potvrdenie objednávky — Be. Hair & Barber`
    : `Booking confirmation — Be. Hair & Barber`;
}

function buildEmailHtml(p: BookingNotifyPayload): string {
  const t =
    p.lang === "sk"
      ? {
          h1: "Ďakujeme za objednávku",
          ref: "Číslo objednávky",
          when: "Dátum a čas",
          service: "Služba",
          stylist: "Špecialista",
          phone: "Telefón",
          notes: "Poznámka",
          footer: "Tešíme sa na vás v Be. Hair & Barber, Košice.",
        }
      : {
          h1: "Thank you for your booking",
          ref: "Booking reference",
          when: "Date & time",
          service: "Service",
          stylist: "Artist",
          phone: "Phone",
          notes: "Notes",
          footer: "We look forward to seeing you at Be. Hair & Barber, Košice.",
        };

  const dateLine = escapeHtml(`${p.bookingDate} · ${p.startTime.substring(0, 5)} – ${p.endTime.substring(0, 5)}`);
  const notesBlock =
    p.notes && p.notes.trim()
      ? `<p><strong>${t.notes}:</strong> ${escapeHtml(p.notes.trim())}</p>`
      : "";

  return `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background:#0b0b0b; color:#f5f0e8; padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#141414;border:1px solid #333;border-radius:12px;padding:28px;">
    <p style="color:#ab832e;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 8px;">Be. Hair & Barber</p>
    <h1 style="font-size:20px;margin:0 0 16px;">${t.h1}</h1>
    <p style="color:#b0a898;font-size:13px;margin:0 0 20px;">${t.ref}: <code style="color:#ede583;font-size:12px;">${escapeHtml(p.bookingId)}</code></p>
    <table style="width:100%;font-size:14px;color:#e8e0d5;border-collapse:collapse;">
      <tr><td style="padding:6px 0;color:#8a8068;">${t.service}</td><td style="padding:6px 0;text-align:right;">${escapeHtml(p.serviceName)}</td></tr>
      <tr><td style="padding:6px 0;color:#8a8068;">${t.stylist}</td><td style="padding:6px 0;text-align:right;">${escapeHtml(p.stylistName)}</td></tr>
      <tr><td style="padding:6px 0;color:#8a8068;">${t.when}</td><td style="padding:6px 0;text-align:right;">${dateLine}</td></tr>
      <tr><td style="padding:6px 0;color:#8a8068;">${t.phone}</td><td style="padding:6px 0;text-align:right;">${escapeHtml(p.customerPhone)}</td></tr>
      <tr><td style="padding:6px 0;color:#8a8068;">${p.lang === "sk" ? "Trvanie" : "Duration"}</td><td style="padding:6px 0;text-align:right;">${p.durationMinutes} min · ${p.price}€</td></tr>
    </table>
    ${notesBlock}
    <p style="margin-top:24px;font-size:12px;color:#6b655c;">${t.footer}<br/>Europe/Bratislava time.</p>
  </div>
</body>
</html>`.trim();
}

export async function sendBookingEmailResend(
  to: string,
  payload: BookingNotifyPayload
): Promise<{ ok: true } | { ok: false; message: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

  if (!apiKey) {
    return { ok: false, message: "RESEND_API_KEY not set" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to.trim()],
      subject: buildEmailSubject(payload),
      html: buildEmailHtml(payload),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { message?: string; id?: string };

  if (!res.ok) {
    return { ok: false, message: data.message || `Resend HTTP ${res.status}` };
  }
  return { ok: true };
}

export async function sendBookingTelegram(payload: BookingNotifyPayload): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    return { ok: false, message: "Telegram env not set" };
  }

  const text = [
    "<b>New booking — Be.</b>",
    "",
    `<b>ID:</b> <code>${escapeHtml(payload.bookingId)}</code>`,
    `<b>Name:</b> ${escapeHtml(payload.customerName)}`,
    `<b>Phone:</b> ${escapeHtml(payload.customerPhone)}`,
    payload.customerEmail ? `<b>Email:</b> ${escapeHtml(payload.customerEmail)}` : "",
    `<b>Service:</b> ${escapeHtml(payload.serviceName)}`,
    `<b>Stylist:</b> ${escapeHtml(payload.stylistName)}`,
    `<b>When:</b> ${escapeHtml(payload.bookingDate)} ${escapeHtml(payload.startTime.substring(0, 5))}–${escapeHtml(payload.endTime.substring(0, 5))}`,
    `<b>Duration / price:</b> ${payload.durationMinutes} min · ${payload.price}€`,
    payload.notes?.trim() ? `<b>Notes:</b> ${escapeHtml(payload.notes.trim())}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };

  if (!res.ok || !data.ok) {
    return { ok: false, message: data.description || `Telegram HTTP ${res.status}` };
  }
  return { ok: true };
}
