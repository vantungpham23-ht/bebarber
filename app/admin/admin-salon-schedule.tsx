"use client";

import { useEffect, useState } from "react";
import { Clock, RotateCcw, Save } from "lucide-react";
import { supabase, type SalonSchedule } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  adminCard,
  adminGhostBtnSm,
  adminInput,
  adminLabel,
  adminMuted,
  adminPrimaryBtnSm,
} from "@/lib/admin-ui-classes";

const DAY_NAMES_SK = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];
const DAY_NAMES_EN  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_SCHEDULE: Record<number, { start: string; end: string }> = {
  0: { start: "10:00", end: "17:00" },
  1: { start: "09:00", end: "19:00" },
  2: { start: "09:00", end: "19:00" },
  3: { start: "09:00", end: "19:00" },
  4: { start: "09:00", end: "19:00" },
  5: { start: "09:00", end: "19:00" },
  6: { start: "09:00", end: "18:00" },
};

export function AdminSalonSchedule() {
  const [schedule, setSchedule] = useState<Record<number, { start: string; end: string }>>({});
  const [saved, setSaved]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    supabase
      .from("salon_schedule")
      .select("*")
      .order("day_of_week")
      .then(({ data }) => {
        const map: Record<number, { start: string; end: string }> = {};
        (data as SalonSchedule[] ?? []).forEach((row) => {
          if (row.is_active) {
            map[row.day_of_week] = {
              start: (row.start_time ?? "").slice(0, 5),
              end:   (row.end_time   ?? "").slice(0, 5),
            };
          }
        });
        // Fill in defaults for any missing days
        for (let dow = 0; dow <= 6; dow++) {
          if (!map[dow]) map[dow] = { ...DEFAULT_SCHEDULE[dow] };
        }
        setSchedule(map);
        setLoading(false);
      });
  }, []);

  const updateDay = (dow: number, field: "start" | "end", value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [dow]: { ...prev[dow], [field]: value },
    }));
    setSaved(false);
  };

  const resetDay = (dow: number) => {
    setSchedule((prev) => ({
      ...prev,
      [dow]: { ...DEFAULT_SCHEDULE[dow] },
    }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    const rows = Object.entries(schedule).map(([rawDow, times]) => ({
      day_of_week: Number(rawDow),
      start_time:  times.start,
      end_time:    times.end,
      is_active:   true,
    }));

    const res = await fetch("/api/salon-schedule", {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ schedule: rows }),
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const hasChanges = Object.keys(schedule).length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-be text-xl font-semibold tracking-wide text-white sm:text-2xl">
          Salon Default Hours
        </h2>
        <p className={cn(adminMuted, "mt-2")}>
          These hours apply to all stylists who don&apos;t have custom hours set.{" "}
          <span className="text-[#b88a3a]">
            Schedules Exceptions (days off) still apply per stylist.
          </span>
        </p>
      </div>

      <Card className={cn(adminCard)}>
        <CardContent className="space-y-4 p-6 sm:p-8">
          {loading ? (
            <p className={adminMuted}>Loading…</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(schedule)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([rawDow, times]) => {
                  const dow = Number(rawDow);
                  return (
                    <div
                      key={dow}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-[#1e1e1e] bg-[#0c0c0c] px-4 py-3 sm:gap-4"
                    >
                      <div className="flex min-w-[64px] flex-col">
                        <span className="text-xs font-semibold text-[#ede583]">
                          {DAY_NAMES_SK[dow]}
                        </span>
                        <span className="text-[10px] text-[#6a6460]">
                          {DAY_NAMES_EN[dow]}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div>
                          <label className={adminLabel}>From</label>
                          <input
                            type="time"
                            className={cn(adminInput, "w-32")}
                            value={times.start}
                            onChange={(e) => updateDay(dow, "start", e.target.value)}
                          />
                        </div>
                        <span className="mt-5 text-[#5c574f]">—</span>
                        <div>
                          <label className={adminLabel}>To</label>
                          <input
                            type="time"
                            className={cn(adminInput, "w-32")}
                            value={times.end}
                            onChange={(e) => updateDay(dow, "end", e.target.value)}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => resetDay(dow)}
                        title="Reset to default"
                        className="ml-auto rounded-lg p-2 text-[#5c574f] transition-colors hover:bg-[#1a1a1a] hover:text-[#8a8275]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={save}
              disabled={saving || !hasChanges}
              className={cn(
                adminPrimaryBtnSm,
                "flex items-center gap-2",
                (saving || !hasChanges) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save schedule"}
            </button>
            {saved && (
              <span className="text-xs text-[#4ade80]">
                ✓ Saved successfully
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className={cn(adminCard)}>
        <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start sm:p-8">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#8a8275]" />
          <div>
            <p className="text-sm font-medium text-[#c4bcb0]">
              How custom stylist hours work
            </p>
            <ul className={cn(adminMuted, "mt-2 space-y-1 text-xs")}>
              <li>
                • If a stylist has <strong className="text-[#ede583]">custom hours</strong> set,
                those hours apply to <strong className="text-[#ede583]">all days</strong>.
              </li>
              <li>
                • If custom hours are <strong className="text-[#ede583]">empty / removed</strong>,
                the stylist follows these salon default hours.
              </li>
              <li>
                • <strong className="text-[#ede583]">Schedule Exceptions</strong> (days off /
                blocked time) always take priority over both custom and salon hours.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
