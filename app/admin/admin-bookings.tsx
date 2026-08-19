"use client";

import { useMemo, useState, useEffect } from "react";
import { supabase, type Booking, type Service, type Stylist } from "@/lib/supabase";
import { normalizeService } from "@/lib/normalize-service";
import { getTodayYmdInBookingTz } from "@/lib/booking-time";
import { Calendar, Clock, User, Phone, Mail, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  adminCard,
  adminCardHover,
  adminInput,
  adminMuted,
  adminPrimaryBtn,
  adminTabBar,
  adminTabButton,
} from "@/lib/admin-ui-classes";

/** Mặc định: hiện tất cả bookings (cả quá khứ) để admin dễ review. */
type DateViewMode = "all" | "upcoming" | "day";

type BookingRow = Booking & { service?: Service; stylist?: Stylist };

function formatTimeHm(t: string | null | undefined): string {
  if (!t) return "—";
  return t.length >= 5 ? t.substring(0, 5) : t;
}

function BookingCard({
  booking,
  formatDate,
  getStatusColor,
  onStatusChange,
}: {
  booking: BookingRow;
  formatDate: (dateStr: string) => string;
  getStatusColor: (status: string) => string;
  onStatusChange: (id: string, status: Booking["status"]) => void;
}) {
  return (
    <Card className={cn(adminCard, adminCardHover)}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-[#6b655c]" />
                <span className="font-semibold text-[#f5f0e8]">{booking.customer_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[#9a9285]">
                <Phone className="h-4 w-4 shrink-0" />
                {booking.customer_phone}
              </div>
              {booking.customer_email ? (
                <div className="flex items-center gap-2 text-sm text-[#9a9285]">
                  <Mail className="h-4 w-4 shrink-0" />
                  {booking.customer_email}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#ede583]">{booking.service?.name}</span>
                <span className="text-[#4a4540]">•</span>
                <span className="text-[#b0a898]">{booking.service?.price}€</span>
              </div>
              <div className="text-[#8a8275]">with {booking.stylist?.name}</div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#8a8275]">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#6b655c]" />
                {formatDate(booking.booking_date)}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#6b655c]" />
                {formatTimeHm(booking.start_time)} – {formatTimeHm(booking.end_time)}
              </div>
            </div>

            {booking.notes ? (
              <div className="text-sm italic text-[#6b655c]">Note: {booking.notes}</div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3 sm:flex-col sm:items-end sm:gap-3">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${getStatusColor(
                booking.status
              )}`}
            >
              {booking.status}
            </span>

            {booking.status === "pending" ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onStatusChange(booking.id, "confirmed")}
                  className="rounded-xl bg-emerald-500/10 p-2 text-emerald-400 transition-colors hover:bg-emerald-500/20"
                  title="Confirm"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onStatusChange(booking.id, "cancelled")}
                  className="rounded-xl bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            {booking.status === "confirmed" ? (
              <button
                type="button"
                onClick={() => onStatusChange(booking.id, "completed")}
                className={`${adminPrimaryBtn} py-2.5`}
              >
                Mark complete
              </button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminBookings() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [filter, setFilter] = useState<
    "all" | "pending" | "confirmed" | "completed" | "cancelled"
  >("all");
  const [dateViewMode, setDateViewMode] = useState<DateViewMode>("all");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayYmdInBookingTz());
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    fetchBookings();
  }, [filter, selectedDate, dateViewMode]);

  const fetchBookings = async () => {
    setLoading(true);

    let query = supabase
      .from("bookings")
      .select("*")
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: true })
      .limit(500);

    if (filter !== "all") {
      query = query.eq("status", filter);
    } else if (dateViewMode === "upcoming") {
      query = query.neq("status", "cancelled");
    }

    if (dateViewMode === "upcoming") {
      query = query.gte("booking_date", getTodayYmdInBookingTz());
    } else if (dateViewMode === "day" && selectedDate) {
      query = query.eq("booking_date", selectedDate);
    }
    // "all" mode: no date filter

    const { data, error } = await query;

    if (error) {
      console.error("[AdminBookings] fetch error:", error.code, error.message, error.details);
    }

    if (data && data.length > 0) {
      // Fetch service and stylist details separately
      const serviceIds = [...new Set(data.map((b) => b.service_id).filter(Boolean))];
      const stylistIds = [...new Set(data.map((b) => b.stylist_id).filter(Boolean))];

      const [svcRes, styRes] = await Promise.all([
        serviceIds.length > 0
          ? supabase.from("services").select("*").in("id", serviceIds)
          : { data: [], error: null },
        stylistIds.length > 0
          ? supabase.from("stylists").select("*").in("id", stylistIds)
          : { data: [], error: null },
      ]);

      const svcMap = new Map((svcRes.data ?? []).map((s) => [s.id, normalizeService(s)]));
      const styMap = new Map((styRes.data ?? []).map((s) => [s.id, s]));

      setBookings(
        data.map((b) => ({
          ...b,
          service: svcMap.get(b.service_id),
          stylist: styMap.get(b.stylist_id),
        })) as BookingRow[]
      );
    } else {
      setBookings([]);
    }
    setLoading(false);
  };

  const updateBookingStatus = async (id: string, status: Booking["status"]) => {
    setActionError("");
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);

    if (error) {
      setActionError(error.message);
      console.error("[AdminBookings] update status", error.message);
      return;
    }
    fetchBookings();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "confirmed":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    revenue: bookings
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + Number(b.service?.price ?? 0), 0),
  };

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const b of bookings) {
      const d = b.booking_date;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(b);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [bookings]);

  return (
    <>
      {actionError ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-500/35 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200/95"
        >
          <p className="font-medium">Could not update booking</p>
          <p className="mt-1 break-words text-xs opacity-90">{actionError}</p>
          <p className="mt-2 text-xs text-[#b0a898]">
            If you see “permission” or RLS: run the latest SQL from{" "}
            <code className="rounded bg-black/30 px-1">supabase-policies.sql</code> and
            ensure the admin User UID in Supabase matches the UUID used in those policies (same as{" "}
            <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_ALLOWED_ADMIN_USER_ID</code>).
          </p>
        </div>
      ) : null}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-5">
        <Card className={cn(adminCard)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#8a8275]">
              Total bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-be text-3xl font-semibold text-white">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className={cn(adminCard)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-medium uppercase tracking-[0.2em] text-amber-200/80">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-be text-3xl font-semibold text-white">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className={cn(adminCard)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-medium uppercase tracking-[0.2em] text-sky-300/85">
              Confirmed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-be text-3xl font-semibold text-white">{stats.confirmed}</div>
          </CardContent>
        </Card>

        <Card className={cn(adminCard)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-300/85">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-be text-3xl font-semibold text-white">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card className={cn(adminCard)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#b0a898]">
              Revenue (completed)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-be text-3xl font-semibold be-gold-text">{stats.revenue}€</div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[#2a2418] bg-[#0f0c08]/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#8a8275]">Schedule view</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDateViewMode("all")}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                dateViewMode === "all"
                  ? "be-gold-gradient text-[#0a0a0a]"
                  : "border border-[#333] bg-[#141414] text-[#b0a898] hover:border-[#ab832e]/40"
              )}
            >
              All time
            </button>
            <button
              type="button"
              onClick={() => setDateViewMode("upcoming")}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                dateViewMode === "upcoming"
                  ? "be-gold-gradient text-[#0a0a0a]"
                  : "border border-[#333] bg-[#141414] text-[#b0a898] hover:border-[#ab832e]/40"
              )}
            >
              Upcoming (today → future)
            </button>
            <button
              type="button"
              onClick={() => setDateViewMode("day")}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                dateViewMode === "day"
                  ? "be-gold-gradient text-[#0a0a0a]"
                  : "border border-[#333] bg-[#141414] text-[#b0a898] hover:border-[#ab832e]/40"
              )}
            >
              Single day
            </button>
          </div>
        </div>
        {dateViewMode === "upcoming" ? (
          <p className="max-w-md text-xs leading-relaxed text-[#6b655c]">
            Active bookings from today ({getTodayYmdInBookingTz()}, Slovakia) forward, sorted by
            date then time. With status &quot;all&quot;, cancelled are hidden; pick Single day or the
            Cancelled tab to review cancelled slots.
          </p>
        ) : dateViewMode === "all" ? (
          <p className="max-w-md text-xs leading-relaxed text-[#6b655c]">
            All bookings from the database, newest first. Use Upcoming or Single day to filter
            by date.
          </p>
        ) : (
          <label className="flex flex-col gap-1 text-xs text-[#8a8275] sm:items-end">
            <span className="uppercase tracking-wider">Pick date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={cn(adminInput, "w-full max-w-[220px] [color-scheme:dark]")}
            />
          </label>
        )}
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className={adminTabBar}>
          {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={cn(adminTabButton(filter === status), "capitalize")}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className={`${adminMuted} py-14 text-center text-sm`}>Loading bookings…</div>
        ) : bookings.length === 0 ? (
          <div className={`${adminMuted} py-14 text-center text-sm`}>
            {dateViewMode === "upcoming"
              ? "No upcoming bookings from today (or none match this status filter)."
              : dateViewMode === "day"
              ? "No bookings for this day and filter."
              : "No bookings yet."}
          </div>
        ) : dateViewMode === "upcoming" ? (
          bookingsByDate.map(([dateYmd, dayBookings]) => (
            <div key={dateYmd} className="space-y-3">
              <div className="sticky top-0 z-[1] -mx-1 border-b border-[#2a2418] bg-[#0d0b07]/95 px-1 py-2 backdrop-blur-sm">
                <p className="font-be text-sm font-semibold tracking-wide text-[#ede583]">
                  {formatDate(dateYmd)}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-[#5c574f]">{dateYmd}</p>
              </div>
              <div className="space-y-4">
                {dayBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    formatDate={formatDate}
                    getStatusColor={getStatusColor}
                    onStatusChange={updateBookingStatus}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
              onStatusChange={updateBookingStatus}
            />
          ))
        )}
      </div>
    </>
  );
}
