"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminSignOut } from "@/components/admin-sign-out";
import { AdminBookings } from "./admin-bookings";
import { AdminServices } from "./admin-services";
import { AdminStylists } from "./admin-stylists";
import { AdminSalonSchedule } from "./admin-salon-schedule";
import { AdminGallery } from "./admin-gallery";
import { adminMuted, adminTabBar, adminTabButton } from "@/lib/admin-ui-classes";

type AdminTab = "bookings" | "services" | "stylists" | "salon-hours" | "gallery";

export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>("bookings");

  const tabs = [
    ["bookings", "Bookings"],
    ["services", "Services"],
    ["stylists", "Staff & skills"],
    ["salon-hours", "Salon Hours"],
    ["gallery", "Gallery"],
  ] as const;

  return (
    <div className="px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-col gap-6 border-b border-[#252018] pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href="/"
                className="font-be text-2xl tracking-[0.28em] text-[#f5f0e8] transition-colors hover:text-[#ede583] sm:text-3xl"
              >
                Be<span className="be-gold-text">.</span>
              </Link>
              <span
                className="hidden h-4 w-px bg-[#333] sm:block"
                aria-hidden
              />
              <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#ab832e]/90">
                Admin
              </span>
            </div>
            <h1 className="font-be text-3xl font-semibold tracking-[0.06em] text-white md:text-4xl">
              Dashboard
            </h1>
            <p className={`${adminMuted} max-w-xl`}>
              Bookings, price list, and which team members can perform each service — aligned with
              what clients see on the site.
            </p>
          </div>
          <AdminSignOut />
        </header>

        <nav className="mb-10" aria-label="Admin sections">
          <div className={adminTabBar}>
            {tabs.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={adminTabButton(tab === id)}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>

        {tab === "bookings" && <AdminBookings />}
        {tab === "services" && <AdminServices />}
        {tab === "stylists" && <AdminStylists />}
        {tab === "salon-hours" && <AdminSalonSchedule />}
        {tab === "gallery" && <AdminGallery />}
      </div>
    </div>
  );
}
