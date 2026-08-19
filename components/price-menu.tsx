"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, type Service } from "@/lib/supabase";
import { normalizeServices } from "@/lib/normalize-service";

type Lang = "en" | "sk";

type PriceMenuProps = {
  lang: Lang;
  label: string;
  title: string;
  sub: string;
};

export function PriceMenu({ lang, label, title, sub }: PriceMenuProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(false);
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("category")
        .order("sort_order")
        .order("name");
      if (cancelled) return;
      if (error) {
        console.error("[PriceMenu]", error.message);
        setLoadError(true);
        setServices([]);
        return;
      }
      setServices(normalizeServices(data ?? []));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-observe reveals when services change
  useEffect(() => {
    const root = sectionRef.current;
    if (!root || services.length === 0) return;

    const reveals: HTMLElement[] = [];
    root.querySelectorAll<HTMLElement>(".reveal:not(.visible)").forEach((el) =>
      reveals.push(el)
    );

    if (reveals.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
    );

    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [services]);

  const formatPrice = (s: Service) => {
    if (s.price_max != null) return `od ${s.price}–${s.price_max}€`;
    const n = Number(s.price);
    if (!Number.isFinite(n)) return "—";
    if (Number.isInteger(n)) return `${n}€`;
    return `${n.toFixed(2)}€`;
  };

  const titleParts = title.split(" ");
  const titleFirst = titleParts[0];
  const titleRest = titleParts.slice(1).join(" ");

  // 3 special offers (sort_order = 0)
  const specials = services.filter((s) => s.sort_order === 0);
  // 9 regular services (sort_order > 0)
  const regulars = services.filter((s) => s.sort_order > 0);

  return (
    <section ref={sectionRef} className="menu-section" id="menu">
      <div className="menu-bg-text">PRICE LIST</div>
      <div className="menu-header reveal">
        <div className="section-label" style={{ justifyContent: "center" }}>
          {label}
        </div>
        <h2>
          {titleFirst} <span>{titleRest}</span>
        </h2>
        <p>{sub}</p>
      </div>

      {/* 3 Special Offers Cards */}
      <div className="special-combos reveal">
        {specials.map((s) => (
          <div className="special-combo-card" key={s.id}>
            <div className="special-combo-title">
              {s.name}
              <span>({s.duration_minutes} MIN)</span>
            </div>
            <div className="special-combo-desc">{s.description ?? ""}</div>
            <div className="special-combo-price">{formatPrice(s)}</div>
          </div>
        ))}
      </div>

      {loadError && (
        <p className="px-6 py-4 text-center text-sm text-red-400/90">
          {lang === "sk"
            ? "Cenník sa nepodarilo načítať. Skontrolujte pripojenie alebo obnovte stránku."
            : "Could not load the price list. Check your connection or refresh the page."}
        </p>
      )}

      {/* 9 Regular Services Grid */}
      <div className="services-grid reveal">
        {regulars.map((item, index) => (
          <div
            key={item.id}
            className={`menu-item reveal${index % 2 === 1 ? " reveal-delay-1" : ""}`}
          >
            <div className="menu-item-info">
              <div className="menu-item-time">{item.duration_minutes} min</div>
              <div className="menu-item-name">{item.name}</div>
              <div className="menu-item-desc">{item.description ?? ""}</div>
            </div>
            <div className="menu-item-price">{formatPrice(item)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
