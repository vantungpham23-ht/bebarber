import { NextResponse } from "next/server";
import { createSupabaseAdmin, isSupabaseServiceConfigured } from "@/lib/supabase-server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const TIME_RE = /^\d{1,2}:\d{2}$/;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

type ScheduleRow = {
  day_of_week: number;
  start_time?: string | null;
  end_time?:   string | null;
  is_active?:  boolean;
};

// GET /api/salon-schedule  — returns all 7 days ordered
export async function GET() {
  if (!isSupabaseServiceConfigured()) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Config error" }, { status: 503 });
  }

  const { data, error } = await admin
    .from("salon_schedule")
    .select("*")
    .order("day_of_week");

  if (error) {
    console.error("[api/salon-schedule] GET", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// PUT /api/salon-schedule  — upsert one or more days at once
// Body: { schedule: ScheduleRow[] }
export async function PUT(req: Request) {
  if (!isSupabaseServiceConfigured()) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  let body: { schedule?: ScheduleRow[] };
  try {
    body = (await req.json()) as { schedule?: ScheduleRow[] };
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!Array.isArray(body.schedule) || body.schedule.length === 0) {
    return badRequest("Missing or empty 'schedule' array");
  }

  // Validate each row
  for (const row of body.schedule) {
    if (typeof row.day_of_week !== "number" || row.day_of_week < 0 || row.day_of_week > 6) {
      return badRequest("day_of_week must be an integer between 0 and 6");
    }
    if (row.start_time && !TIME_RE.test(row.start_time)) {
      return badRequest(`Invalid start_time for day ${row.day_of_week} (expected HH:MM)`);
    }
    if (row.end_time && !TIME_RE.test(row.end_time)) {
      return badRequest(`Invalid end_time for day ${row.day_of_week} (expected HH:MM)`);
    }
    if (row.start_time && row.end_time && row.start_time >= row.end_time) {
      return badRequest(`start_time must be before end_time for day ${row.day_of_week}`);
    }
  }

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Config error" }, { status: 503 });
  }

  // Upsert each day
  const upserts = body.schedule.map((row) => ({
    day_of_week: row.day_of_week,
    start_time:  row.start_time ?? "09:00",
    end_time:    row.end_time   ?? "19:00",
    is_active:   row.is_active  ?? true,
    updated_at:  new Date().toISOString(),
  }));

  const { data, error } = await admin
    .from("salon_schedule")
    .upsert(upserts, { onConflict: "day_of_week" })
    .select()
    .order("day_of_week");

  if (error) {
    console.error("[api/salon-schedule] PUT", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data ?? [], { status: 200 });
}
