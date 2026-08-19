"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { 
  Upload, 
  Trash2, 
  Star, 
  Eye, 
  EyeOff, 
  Loader2, 
  Check,
  Image as ImageIcon,
  User,
  Calendar
} from "lucide-react";
import { supabase, type Stylist } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  adminCard,
  adminGhostBtnSm,
  adminInput,
  adminLabel,
  adminMuted,
  adminPrimaryBtn,
  adminPrimaryBtnSm,
} from "@/lib/admin-ui-classes";

type GalleryItem = {
  id: string;
  image_url: string;
  thumbnail_url: string | null;
  stylist_id: string | null;
  stylist_name: string | null;
  title: string | null;
  description: string | null;
  week_number: number;
  year: number;
  like_count: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
};

export function AdminGallery() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  // Helper: get ISO week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    stylist_id: "",
    week_number: getWeekNumber(new Date()),
    year: new Date().getFullYear(),
    is_featured: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, stylistsRes] = await Promise.all([
        fetch("/api/gallery/manage"),
        supabase.from("stylists").select("id, name, is_active").eq("is_active", true).order("name"),
      ]);

      const itemsData = await itemsRes.json();
      const stylistsData = stylistsRes.data;

      if (itemsData.items) {
        setItems(itemsData.items);
      }
      if (stylistsData) {
        setStylists(stylistsData as Stylist[]);
      }
    } catch (e) {
      console.error("[AdminGallery] load error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // Upload image and create gallery item
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress("Uploading image...");

    try {
      // 1. Upload to Supabase Storage
      const formDataUpload = new FormData();
      formDataUpload.append("file", selectedFile);

      const uploadRes = await fetch("/api/gallery/upload", {
        method: "POST",
        body: formDataUpload,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }

      const uploadData = await uploadRes.json();
      setUploadProgress("Creating gallery item...");

      // 2. Create gallery item
      const createRes = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: uploadData.url,
          thumbnail_url: uploadData.url,
          stylist_id: formData.stylist_id || null,
          title: formData.title || null,
          description: formData.description || null,
          week_number: formData.week_number,
          year: formData.year,
          is_featured: formData.is_featured,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Create failed");
      }

      // Success
      setUploadProgress("Done!");
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setFormData({
          title: "",
          description: "",
          stylist_id: "",
          week_number: Math.ceil(new Date().getDate() / 7),
          year: new Date().getFullYear(),
          is_featured: false,
        });
        setUploadProgress("");
        void loadData();
      }, 1000);
    } catch (e) {
      console.error("[AdminGallery] upload error", e);
      setUploadProgress(`Error: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  // Toggle featured
  const toggleFeatured = async (item: GalleryItem) => {
    try {
      const res = await fetch("/api/gallery/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          is_featured: !item.is_featured,
        }),
      });

      if (res.ok) {
        void loadData();
      }
    } catch (e) {
      console.error("[AdminGallery] toggle featured error", e);
    }
  };

  // Toggle active
  const toggleActive = async (item: GalleryItem) => {
    try {
      const res = await fetch("/api/gallery/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          is_active: !item.is_active,
        }),
      });

      if (res.ok) {
        void loadData();
      }
    } catch (e) {
      console.error("[AdminGallery] toggle active error", e);
    }
  };

  // Delete item
  const deleteItem = async (item: GalleryItem) => {
    if (!confirm(`Delete "${item.title || item.id}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/gallery/manage?id=${item.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        void loadData();
      }
    } catch (e) {
      console.error("[AdminGallery] delete error", e);
    }
  };

  return (
    <div className="space-y-10">
      {/* Upload Section */}
      <Card className={cn(adminCard)}>
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div>
            <h2 className="font-be text-xl font-semibold tracking-wide text-white sm:text-2xl">
              Add Gallery Image
            </h2>
            <p className={`${adminMuted} mt-2 max-w-2xl`}>
              Upload a new haircut photo. Images will appear in the gallery sorted by likes.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Drop zone */}
            <div
              className={cn(
                "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
                previewUrl
                  ? "border-[#b88a3a] bg-[#1a1a1a]/50"
                  : "border-[#2a2a2a] hover:border-[#b88a3a]/50"
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              {previewUrl ? (
                <div className="relative w-full aspect-[4/5] max-h-[300px]">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-contain rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <ImageIcon className="h-12 w-12 text-[#5c574f] mb-4" />
                  <p className="text-sm text-[#8a8275] text-center mb-4">
                    Drag & drop an image here, or
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={adminPrimaryBtnSm}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Browse Files
                  </button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className={adminLabel}>Title (optional)</label>
                <input
                  className={adminInput}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Classic Fade"
                />
              </div>

              <div>
                <label className={adminLabel}>Description (optional)</label>
                <textarea
                  className={cn(adminInput, "min-h-[80px] resize-y")}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the style"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={adminLabel}>Stylist</label>
                  <select
                    className={cn(adminInput, "appearance-none bg-[#080808]")}
                    value={formData.stylist_id}
                    onChange={(e) => setFormData({ ...formData, stylist_id: e.target.value })}
                  >
                    <option value="">Select stylist...</option>
                    {stylists.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={adminLabel}>Week Number</label>
                  <input
                    type="number"
                    min={1}
                    max={53}
                    className={adminInput}
                    value={formData.week_number}
                    onChange={(e) =>
                      setFormData({ ...formData, week_number: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="h-4 w-4 rounded border-[#333] bg-[#080808] text-[#ab832e] focus:ring-[#ab832e]/40"
                />
                <span className="text-sm text-[#c4bcb0]">
                  <Star className="inline h-4 w-4 mr-1 text-[#b88a3a]" />
                  Featured (always shows at top)
                </span>
              </label>

              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className={cn(
                  adminPrimaryBtn,
                  "w-full flex items-center justify-center gap-2",
                  (!selectedFile || uploading) && "opacity-50 cursor-not-allowed"
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {uploadProgress}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload & Publish
                  </>
                )}
              </button>

              {uploadProgress && !uploading && (
                <p className="text-sm text-[#4ade80] flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {uploadProgress}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Items List */}
      <div>
        <h2 className="font-be mb-5 text-xl font-semibold tracking-wide text-white sm:text-2xl">
          All Gallery Items ({items.length})
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#b88a3a]" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-[#2a2a2a] bg-[#0c0c0c] p-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-[#3a3a3a] mb-4" />
            <p className="text-[#8a8275]">No gallery items yet. Upload your first image above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className={cn(adminCard)}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Thumbnail */}
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-[#2a2a2a]">
                      <Image
                        src={item.thumbnail_url || item.image_url}
                        alt={item.title || "Gallery image"}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-[#f5f0e8]">
                          {item.title || "Untitled"}
                        </span>
                        {item.is_featured && (
                          <span className="flex items-center gap-1 rounded bg-[#2a2010] px-2 py-0.5 text-[10px] text-[#b88a3a]">
                            <Star className="h-3 w-3" />
                            Featured
                          </span>
                        )}
                        {!item.is_active && (
                          <span className="rounded bg-red-900/30 px-2 py-0.5 text-[10px] text-red-400">
                            Hidden
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#8a8275]">
                        {item.stylist_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.stylist_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Week {item.week_number}, {item.year}
                        </span>
                        <span>❤️ {item.like_count} likes</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleFeatured(item)}
                        className={cn(
                          adminGhostBtnSm,
                          "flex items-center gap-1",
                          item.is_featured && "text-[#b88a3a] border-[#b88a3a]/50"
                        )}
                        title={item.is_featured ? "Remove featured" : "Mark as featured"}
                      >
                        <Star className={cn("h-3.5 w-3.5", item.is_featured && "fill-current")} />
                        {item.is_featured ? "Unfeature" : "Feature"}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleActive(item)}
                        className={cn(
                          adminGhostBtnSm,
                          "flex items-center gap-1"
                        )}
                        title={item.is_active ? "Hide from gallery" : "Show in gallery"}
                      >
                        {item.is_active ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            Show
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteItem(item)}
                        className="flex items-center gap-1 rounded-lg border border-red-900/40 bg-red-900/20 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-red-400/80 transition-colors hover:border-red-700/60 hover:bg-red-900/30 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
