import { NextResponse } from "next/server";
import { createSupabaseAdmin, isSupabaseServiceConfigured } from "@/lib/supabase-server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/gallery/manage - Admin: Lấy tất cả ảnh (kể cả inactive)
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

  try {
    const { data: items, error } = await admin
      .from("gallery_items")
      .select(`
        *,
        stylist:stylists(id, name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

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
      is_active: item.is_active,
      created_at: item.created_at,
    }));

    return NextResponse.json({ items: result });
  } catch (e) {
    console.error("[api/gallery/manage] GET error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PUT /api/gallery/manage - Admin: Cập nhật ảnh
export async function PUT(req: Request) {
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
    id?: string;
    is_featured?: boolean;
    is_active?: boolean;
    title?: string;
    description?: string;
    stylist_id?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id || !UUID_RE.test(body.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const updates: Record<string, unknown> = {};
    if (typeof body.is_featured === "boolean") updates.is_featured = body.is_featured;
    if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.stylist_id !== undefined) updates.stylist_id = body.stylist_id;

    const { error } = await admin
      .from("gallery_items")
      .update(updates)
      .eq("id", body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/gallery/manage] PUT error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE /api/gallery/manage?id=xxx - Admin: Xóa ảnh
export async function DELETE(req: Request) {
  if (!isSupabaseServiceConfigured()) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Config error" }, { status: 503 });
  }

  try {
    const { error } = await admin
      .from("gallery_items")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[api/gallery/manage] DELETE error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
