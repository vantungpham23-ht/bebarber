import { NextResponse } from "next/server";
import { createSupabaseAdmin, isSupabaseServiceConfigured } from "@/lib/supabase-server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{1,2}:\d{2}$/;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

type ExceptionBody = {
  stylist_id?: string;
  exception_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string | null;
};

// GET /api/stylist-exceptions?stylist_id=xxx
export async function GET(req: Request) {
  if (!isSupabaseServiceConfigured()) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const stylistId = searchParams.get("stylist_id");

  if (!stylistId || !UUID_RE.test(stylistId)) {
    return badRequest("Invalid stylist_id");
  }

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Config error" }, { status: 503 });
  }

  const { data, error } = await admin
    .from("stylist_exceptions")
    .select("*")
    .eq("stylist_id", stylistId)
    .order("exception_date")
    .order("start_time");

  if (error) {
    console.error("[api/stylist-exceptions] GET", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/stylist-exceptions
export async function POST(req: Request) {
  if (!isSupabaseServiceConfigured()) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  let body: ExceptionBody;
  try {
    body = (await req.json()) as ExceptionBody;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const stylist_id = typeof body.stylist_id === "string" ? body.stylist_id.trim() : "";
  const exception_date = typeof body.exception_date === "string" ? body.exception_date.trim() : "";
  const start_time =
    body.start_time == null || body.start_time === ""
      ? null
      : typeof body.start_time === "string"
        ? body.start_time.trim()
        : null;
  const end_time =
    body.end_time == null || body.end_time === ""
      ? null
      : typeof body.end_time === "string"
        ? body.end_time.trim()
        : null;
  const reason =
    body.reason == null || body.reason === ""
      ? null
      : String(body.reason).trim().slice(0, 255);

  // Validate required fields
  if (!UUID_RE.test(stylist_id)) return badRequest("Invalid stylist_id");
  if (!DATE_RE.test(exception_date)) return badRequest("Invalid exception_date format (YYYY-MM-DD)");

  // Validate time format if provided
  if (start_time && !TIME_RE.test(start_time)) return badRequest("Invalid start_time format (HH:MM)");
  if (end_time && !TIME_RE.test(end_time)) return badRequest("Invalid end_time format (HH:MM)");

  // Validate time order if both provided
  if (start_time && end_time && start_time >= end_time) {
    return badRequest("start_time must be before end_time");
  }

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Config error" }, { status: 503 });
  }

  // Check if stylist exists
  const { data: stylist, error: stylistErr } = await admin
    .from("stylists")
    .select("id")
    .eq("id", stylist_id)
    .single();

  if (stylistErr || !stylist) {
    return badRequest("Stylist not found");
  }

  const { data, error } = await admin
    .from("stylist_exceptions")
    .insert({
      stylist_id,
      exception_date,
      start_time,
      end_time,
      reason,
    })
    .select()
    .single();

  if (error) {
    console.error("[api/stylist-exceptions] POST", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/stylist-exceptions?id=xxx
export async function DELETE(req: Request) {
  if (!isSupabaseServiceConfigured()) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id || !UUID_RE.test(id)) {
    return badRequest("Invalid id");
  }

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Config error" }, { status: 503 });
  }

  const { error } = await admin.from("stylist_exceptions").delete().eq("id", id);

  if (error) {
    console.error("[api/stylist-exceptions] DELETE", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
