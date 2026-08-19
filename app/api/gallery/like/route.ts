import { NextResponse } from "next/server";
import { createSupabaseAdmin, isSupabaseServiceConfigured } from "@/lib/supabase-server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/gallery/like - Toggle like cho một gallery item
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

  let body: { gallery_item_id?: string; visitor_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.gallery_item_id || !UUID_RE.test(body.gallery_item_id)) {
    return NextResponse.json({ error: "Invalid gallery_item_id" }, { status: 400 });
  }

  if (!body.visitor_id) {
    return NextResponse.json({ error: "visitor_id is required" }, { status: 400 });
  }

  try {
    // Check nếu đã like rồi
    const { data: existingLike } = await admin
      .from("gallery_likes")
      .select("id")
      .eq("gallery_item_id", body.gallery_item_id)
      .eq("visitor_id", body.visitor_id)
      .maybeSingle();

    if (existingLike) {
      // Unlike: xóa record
      await admin
        .from("gallery_likes")
        .delete()
        .eq("id", existingLike.id);
    } else {
      // Like: thêm record mới
      await admin
        .from("gallery_likes")
        .insert({
          gallery_item_id: body.gallery_item_id,
          visitor_id: body.visitor_id,
        });
    }

    // Lấy like_count mới
    const { data: item } = await admin
      .from("gallery_items")
      .select("like_count")
      .eq("id", body.gallery_item_id)
      .single();

    return NextResponse.json({
      liked: !existingLike,
      like_count: item?.like_count || 0,
    });
  } catch (e) {
    console.error("[api/gallery/like] error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
