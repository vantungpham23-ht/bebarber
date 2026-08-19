import { NextResponse } from "next/server";
import { createSupabaseAdmin, isSupabaseServiceConfigured } from "@/lib/supabase-server";
import { normalizeSkMobilePhone } from "@/lib/booking-phone";

/** Edge-friendly for Cloudflare Pages (@cloudflare/next-on-pages); Supabase client dùng fetch. */
export const runtime = "edge";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?$/;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function normalizeTime(t: string): string {
  const s = t.trim();
  if (s.length >= 8 && /^\d{1,2}:\d{2}:\d{2}/.test(s)) return s.substring(0, 8);
  const parts = s.split(":");
  const h = parts[0] ?? "0";
  const m = parts[1] ?? "0";
  const hi = parseInt(h, 10);
  const mi = parseInt(m, 10);
  if (Number.isNaN(hi) || Number.isNaN(mi)) return "00:00:00";
  return `${String(hi).padStart(2, "0")}:${String(mi).padStart(2, "0")}:00`;
}

type PostBody = {
  id?: string;
  customer_name?: string;
  customer_phone?: string;
  service_id?: string;
  stylist_id?: string;
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  notes?: string | null;
  lang?: string;
};

export async function POST(req: Request) {
  try {
    return await handleBookingsPost(req);
  } catch (e) {
    console.error("[api/bookings] unhandled", e);
    const msg = e instanceof Error ? e.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handleBookingsPost(req: Request): Promise<Response> {
  if (!isSupabaseServiceConfigured()) {
    return NextResponse.json(
      {
        error:
          "Server is not configured: set SUPABASE_SERVICE_ROLE_KEY (see .env.local.example).",
      },
      { status: 503 }
    );
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const customer_name = typeof body.customer_name === "string" ? body.customer_name.trim() : "";
  const customer_phone_raw = typeof body.customer_phone === "string" ? body.customer_phone.trim() : "";
  const service_id = typeof body.service_id === "string" ? body.service_id.trim() : "";
  const stylist_id = typeof body.stylist_id === "string" ? body.stylist_id.trim() : "";
  const booking_date = typeof body.booking_date === "string" ? body.booking_date.trim() : "";
  const start_time = typeof body.start_time === "string" ? body.start_time.trim() : "";
  const end_time = typeof body.end_time === "string" ? body.end_time.trim() : "";
  const notes =
    body.notes == null || body.notes === ""
      ? null
      : String(body.notes).trim().slice(0, 2000);

  const customer_phone = normalizeSkMobilePhone(customer_phone_raw);
  if (!customer_phone) {
    return badRequest("Invalid phone: use a Slovak mobile (+421 or 09…, 9 digits after prefix).");
  }

  if (!UUID_RE.test(id)) return badRequest("Invalid booking id");
  if (!UUID_RE.test(service_id)) return badRequest("Invalid service_id");
  if (!UUID_RE.test(stylist_id)) return badRequest("Invalid stylist_id");
  if (customer_name.length < 1 || customer_name.length > 255) return badRequest("Invalid name");
  if (!DATE_RE.test(booking_date)) return badRequest("Invalid booking_date");
  if (!TIME_RE.test(start_time) || !TIME_RE.test(end_time)) return badRequest("Invalid time");

  const startNorm = normalizeTime(start_time);
  const endNorm = normalizeTime(end_time);

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Config error";
    return NextResponse.json({ error: msg }, { status: 503 });
  }

  const [{ data: svc, error: svcErr }, { data: sty, error: styErr }] = await Promise.all([
    admin
      .from("services")
      .select("id, name, duration_minutes, price, is_active")
      .eq("id", service_id)
      .single(),
    admin.from("stylists").select("id, name, is_active").eq("id", stylist_id).single(),
  ]);

  if (svcErr || !svc || !svc.is_active) {
    return badRequest("Service not found or inactive");
  }
  if (styErr || !sty || !sty.is_active) {
    return badRequest("Stylist not found or inactive");
  }

  const { data: stylistServiceRow, error: stylistServiceErr } = await admin
    .from("stylist_services")
    .select("service_id")
    .eq("stylist_id", stylist_id)
    .eq("service_id", service_id)
    .maybeSingle();

  if (stylistServiceErr) {
    console.error("[api/bookings] stylist_services", stylistServiceErr.message);
    return NextResponse.json(
      { error: "Could not verify stylist for this service. Try again." },
      { status: 503 }
    );
  }
  if (!stylistServiceRow) {
    return badRequest("This stylist is not linked to the selected service");
  }

  const { error: insertErr } = await admin.from("bookings").insert({
    id,
    customer_name,
    customer_phone,
    customer_email: null,
    service_id,
    stylist_id,
    booking_date,
    start_time: startNorm,
    end_time: endNorm,
    status: "pending",
    notes,
  });

  if (insertErr) {
    console.error("[api/bookings] insert", insertErr.message);
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  return NextResponse.json({ id, ok: true });
}
