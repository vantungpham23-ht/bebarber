import { NextResponse } from "next/server";
import { createSupabaseAdmin, isSupabaseServiceConfigured } from "@/lib/supabase-server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(req: Request) {
  if (!isSupabaseServiceConfigured()) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 5MB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    // File sẽ nằm trong bucket "gallery", không cần thêm "gallery/" prefix
    const filepath = filename;

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get admin client for storage
    let admin;
    try {
      admin = createSupabaseAdmin();
    } catch {
      return NextResponse.json({ error: "Config error" }, { status: 503 });
    }

    // Upload to Supabase Storage
    const { data, error } = await admin.storage
      .from("gallery")
      .upload(filepath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("[api/gallery/upload] upload error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = admin.storage
      .from("gallery")
      .getPublicUrl(filepath);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filepath,
      filename: filename,
    });
  } catch (e) {
    console.error("[api/gallery/upload] error", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
