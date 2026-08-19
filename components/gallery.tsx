"use client";

import { useState, useEffect } from "react";
import { Heart, User, Star } from "lucide-react";
import { supabase, type Stylist } from "@/lib/supabase";

type Lang = "en" | "sk";

type GalleryItem = {
  id: string;
  image_url: string;
  thumbnail_url: string;
  stylist_id: string | null;
  stylist_name: string;
  title: string | null;
  description: string | null;
  week_number: number;
  year: number;
  like_count: number;
  is_featured: boolean;
  created_at: string;
  user_has_liked: boolean;
};

type GalleryProps = {
  lang: Lang;
  label?: string;
  title?: string;
  sub?: string;
  maxItems?: number;
};

const VISITOR_ID_KEY = "be_gallery_visitor_id";

export function Gallery({ lang, label, title, sub, maxItems = 12 }: GalleryProps) {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [likingIds, setLikingIds] = useState<Set<string>>(new Set());
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [filterStylist, setFilterStylist] = useState<string>("all");
  const [filterWeek, setFilterWeek] = useState<string>("all");
  const [visitorId, setVisitorId] = useState<string>("");

  const t = lang === "en" ? {
    label: label || "Gallery",
    title: title || "Our Finest Work",
    sub: sub || "Latest haircuts from our talented artists",
    thisWeek: "This Week",
    allWork: "All Work",
    recent: "Recent",
    allStylists: "All Stylists",
    likes: "likes",
    by: "by",
    featured: "Featured",
    loading: "Loading...",
    noImages: "No images yet. Check back soon!",
  } : {
    label: label || "Galéria",
    title: title || "Naše najlepšie práce",
    sub: sub || "Najnovšie účesy od našich talentovaných majstrov",
    thisWeek: "Tento týždeň",
    allWork: "Všetky práce",
    recent: "Nedávne",
    allStylists: "Všetci špecialisti",
    likes: "páči sa",
    by: "od",
    featured: "Oblúbené",
    loading: "Načítavam...",
    noImages: "Zatiaľ žiadne obrázky. Vráťte sa čoskoro!",
  };

  // Init visitor ID
  useEffect(() => {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    setVisitorId(id);
  }, []);

  // Load stylists
  useEffect(() => {
    supabase
      .from("stylists")
      .select("id, name, is_active")
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setStylists((data || []) as Stylist[]));
  }, []);

  // Load items
  useEffect(() => {
    if (!visitorId) return;
    
    setLoading(true);
    const params = new URLSearchParams({
      limit: maxItems.toString(),
      visitor_id: visitorId,
    });
    if (filterStylist !== "all") params.set("stylist_id", filterStylist);

    fetch(`/api/gallery?${params.toString()}`)
      .then(r => r.json())
      .then(data => {
        if (data.items) setItems(data.items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [visitorId, filterStylist, filterWeek, maxItems]);

  // Handle like
  const handleLike = async (itemId: string) => {
    if (!visitorId || likingIds.has(itemId)) return;
    setLikingIds(prev => new Set([...prev, itemId]));

    // Optimistic update
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const newLiked = !item.user_has_liked;
        return {
          ...item,
          user_has_liked: newLiked,
          like_count: newLiked ? item.like_count + 1 : item.like_count - 1,
        };
      }
      return item;
    }));

    fetch("/api/gallery/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gallery_item_id: itemId, visitor_id: visitorId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.like_count !== undefined) {
          setItems(prev => prev.map(item => 
            item.id === itemId ? { ...item, like_count: data.like_count } : item
          ));
        }
      })
      .catch(console.error)
      .finally(() => setLikingIds(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      }));
  };

  return (
    <section className="gallery-section" id="gallery">
      <div className="gallery-header reveal">
        <div className="section-label" style={{ justifyContent: "center" }}>{t.label}</div>
        <h2>{t.title}</h2>
        <p>{t.sub}</p>
      </div>

      <div className="gallery-filters reveal reveal-delay-1">
        <div className="gallery-filter-group">
          <button
            type="button"
            className={`gallery-filter-btn ${filterWeek === "all" ? "active" : ""}`}
            onClick={() => setFilterWeek("all")}
          >
            {t.allWork}
          </button>
          <button
            type="button"
            className={`gallery-filter-btn ${filterWeek === "this_week" ? "active" : ""}`}
            onClick={() => setFilterWeek("this_week")}
          >
            {t.thisWeek}
          </button>
        </div>

        <div className="gallery-filter-group">
          <select
            className="gallery-stylist-select"
            value={filterStylist}
            onChange={(e) => setFilterStylist(e.target.value)}
          >
            <option value="all">{t.allStylists}</option>
            {stylists.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="gallery-grid">
        {loading ? (
          <div className="gallery-loading">
            <p>{t.loading}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="gallery-empty">
            <p>{t.noImages}</p>
          </div>
        ) : items.map((item, index) => (
          <div
            key={item.id}
            className={`gallery-item reveal ${index % 3 === 1 ? "reveal-delay-1" : index % 3 === 2 ? "reveal-delay-2" : ""}`}
          >
            <div className="gallery-item-image">
              <img
                src={item.thumbnail_url || item.image_url}
                alt={item.title || `Haircut by ${item.stylist_name}`}
                className="gallery-img"
                loading="lazy"
              />
              
              {item.is_featured && (
                <div className="gallery-featured-badge">
                  <Star className="h-3 w-3" />
                  {t.featured}
                </div>
              )}

              <div className="gallery-item-overlay">
                <button
                  type="button"
                  className={`gallery-like-btn ${item.user_has_liked ? "liked" : ""}`}
                  onClick={() => handleLike(item.id)}
                  disabled={likingIds.has(item.id)}
                >
                  <Heart
                    className={`h-5 w-5 ${item.user_has_liked ? "fill-current" : ""}`}
                    strokeWidth={1.5}
                  />
                  <span>{item.like_count}</span>
                </button>
              </div>
            </div>

            <div className="gallery-item-info">
              {item.title && (
                <h4 className="gallery-item-title">{item.title}</h4>
              )}
              <div className="gallery-item-meta">
                <span className="gallery-item-stylist">
                  <User className="h-3 w-3" />
                  {t.by} {item.stylist_name}
                </span>
                <span className="gallery-item-likes">
                  <Heart className="h-3 w-3" />
                  {item.like_count} {t.likes}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
