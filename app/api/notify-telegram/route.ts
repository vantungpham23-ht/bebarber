import { NextResponse } from "next/server";
import { sendBookingTelegram, type BookingNotifyPayload } from "@/lib/booking-notifications";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const payload: BookingNotifyPayload = {
      bookingId: String(body.bookingId ?? ""),
      customerName: String(body.customerName ?? ""),
      customerPhone: String(body.customerPhone ?? ""),
      customerEmail: null,
      serviceName: String(body.serviceName ?? ""),
      stylistName: String(body.stylistName ?? ""),
      bookingDate: String(body.bookingDate ?? ""),
      startTime: String(body.startTime ?? ""),
      endTime: String(body.endTime ?? ""),
      durationMinutes: Number(body.durationMinutes) || 0,
      price: Number(body.price) || 0,
      notes: body.notes ? String(body.notes) : null,
      lang: body.lang === "sk" ? "sk" : "en",
    };

    const result = await Promise.race([
      sendBookingTelegram(payload),
      new Promise<{ ok: false; message: string }>((resolve) =>
        setTimeout(() => resolve({ ok: false, message: "Telegram timeout (8s)" }), 8000)
      ),
    ]);
    if (!result.ok) {
      console.error("[notify-telegram]", result.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[notify-telegram]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
