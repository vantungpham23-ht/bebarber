import { NextResponse } from "next/server";
import { createSupabaseAdmin, isSupabaseServiceConfigured } from "@/lib/supabase-server";
import { randomBookingId } from "@/lib/random-booking-id";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/gallery - Public: Lấy danh sách gallery
export async function GET(req: Request) {
  if (!isSupabaseServiceConfigured()) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const stylistId = searchParams.get("stylist_id");
  const year = searchParams.get("year");
  const week = searchParams.get("week");
  const visitorId = searchParams.get("visitor_id"); // Optional: để check user đã like chưa

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Config error" }, { status: 503 });
  }

  try {
    // Build query
    let query = admin
      .from("gallery_items")
      .select(`
        *,
        stylist:stylists(id, name)
      `)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("like_count", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (stylistId && UUID_RE.test(stylistId)) {
      query = query.eq("stylist_id", stylistId);
    }
    if (year) {
      query = query.eq("year", parseInt(year, 10));
    }
    if (week) {
      query = query.eq("week_number", parseInt(week, 10));
    }

    const { data: items, error } = await query;

    if (error) {
      console.error("[api/gallery] GET", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Nếu có visitor_id, lấy thêm các like của visitor
    let userLikes: Set<string> = new Set();
    if (visitorId) {
      const { data: likes } = await admin
        .from("gallery_likes")
        .select("gallery_item_id")
        .eq("visitor_id", visitorId);
      
      if (likes) {
        userLikes = new Set(likes.map((l: { gallery_item_id: string }) => l.gallery_item_id));
      }
    }

    // Transform data
    const result = (items || []).map((item: Record<string, unknown>) => ({
      id: item.id,
      image_url: item.image_url,
      thumbnail_url: item.thumbnail_url || item.image_url,
      stylist_id: item.stylist_id,
      stylist_name: (item.stylist as { name?: string } | null)?.name || "Unknown",
      title: item.title,
      description: item.description,
      week_number: item.week_number,
      year: item.year,
      like_count: item.like_count,
      is_featured: item.is_featured,
      created_at: item.created_at,
      user_has_liked: userLikes.has(item.id as string),
    }));

    return NextResponse.json({ items: result, total: result.length });
  } catch (e) {
    console.error("[api/gallery] GET error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/gallery - Admin: Tạo gallery item mới
export async function POST(req: Request) {
  if (!isSupabaseServiceConfigured()) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Config error" }, { status: 503 });
  }

  let body: {
    image_url?: string;
    thumbnail_url?: string;
    stylist_id?: string;
    title?: string;
    description?: string;
    week_number?: number;
    year?: number;
    is_featured?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate required fields
  if (!body.image_url) {
    return NextResponse.json({ error: "image_url is required" }, { status: 400 });
  }

  // Get current week/year if not provided
  const now = new Date();
  const currentWeek = body.week_number || Math.ceil((now.getDate()) / 7);
  const currentYear = body.year || now.getFullYear();

  try {
    const { data, error } = await admin
      .from("gallery_items")
      .insert({
        id: randomBookingId(),
        image_url: body.image_url,
        thumbnail_url: body.thumbnail_url || body.image_url,
        stylist_id: body.stylist_id || null,
        title: body.title || null,
        description: body.description || null,
        week_number: body.week_number || currentWeek,
        year: body.year || currentYear,
        is_featured: body.is_featured || false,
        is_active: true,
      })
      .select(`
        *,
        stylist:stylists(id, name)
      `)
      .single();

    if (error) {
      console.error("[api/gallery] POST", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      item: {
        ...data,
        stylist_name: (data.stylist as { name?: string } | null)?.name || null,
      }
    }, { status: 201 });
  } catch (e) {
    console.error("[api/gallery] POST error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
