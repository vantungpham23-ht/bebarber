"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus, Calendar, Clock, X } from "lucide-react";
import { supabase, type Service, type Stylist, type StylistException } from "@/lib/supabase";
import { normalizeServices } from "@/lib/normalize-service";
import { insertDefaultWorkingHoursForStylist } from "@/lib/default-working-hours";
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

const DAY_NAMES = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];

function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d}.${m}.${y}`;
}

function formatTime(t: string | null): string {
  if (!t) return "";
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (m) return `${m[1].padStart(2, "0")}:${m[2]}`;
  return t.slice(0, 5);
}

export function AdminStylists() {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newSpecialties, setNewSpecialties] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSpecialties, setEditSpecialties] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());

  // Exception management state
  const [exceptions, setExceptions] = useState<StylistException[]>([]);
  const [newExceptionDate, setNewExceptionDate] = useState("");
  const [newExceptionStartTime, setNewExceptionStartTime] = useState("");
  const [newExceptionEndTime, setNewExceptionEndTime] = useState("");
  const [newExceptionReason, setNewExceptionReason] = useState("");
  const [isFullDay, setIsFullDay] = useState(true);

  // Custom work hours state
  const [editCustomStart, setEditCustomStart] = useState("");
  const [editCustomEnd, setEditCustomEnd] = useState("");

  const load = async () => {
    setLoading(true);
    const [stRes, svRes] = await Promise.all([
      supabase.from("stylists").select("*").order("name"),
      supabase.from("services").select("*").order("sort_order"),
    ]);
    setStylists((stRes.data as Stylist[]) ?? []);
    setServices(normalizeServices(svRes.data));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const loadStylistServices = async (stylistId: string) => {
    const { data } = await supabase
      .from("stylist_services")
      .select("service_id")
      .eq("stylist_id", stylistId);
    setSelectedServiceIds(new Set((data ?? []).map((r) => r.service_id)));
  };

  const loadStylistExceptions = async (stylistId: string) => {
    const { data } = await supabase
      .from("stylist_exceptions")
      .select("*")
      .eq("stylist_id", stylistId)
      .order("exception_date")
      .order("start_time");
    setExceptions((data as StylistException[]) ?? []);
  };

  const startEdit = async (s: Stylist) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditPhone(s.phone ?? "");
    setEditEmail(s.email ?? "");
    setEditSpecialties(s.specialties?.join(", ") ?? "");
    setEditCustomStart(s.custom_work_start ? (s.custom_work_start as string).slice(0, 5) : "");
    setEditCustomEnd(s.custom_work_end ? (s.custom_work_end as string).slice(0, 5) : "");
    await loadStylistServices(s.id);
    await loadStylistExceptions(s.id);
    // Reset exception form
    setNewExceptionDate("");
    setNewExceptionStartTime("");
    setNewExceptionEndTime("");
    setNewExceptionReason("");
    setIsFullDay(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setSelectedServiceIds(new Set());
    setExceptions([]);
    setEditCustomStart("");
    setEditCustomEnd("");
  };

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const saveStylistLinks = async (stylistId: string) => {
    await supabase.from("stylist_services").delete().eq("stylist_id", stylistId);
    const rows = [...selectedServiceIds].map((service_id) => ({ stylist_id: stylistId, service_id }));
    if (rows.length > 0) {
      await supabase.from("stylist_services").insert(rows);
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const specs = editSpecialties
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    // Build custom hours payload
    const hasCustomStart = editCustomStart.trim() !== "";
    const hasCustomEnd   = editCustomEnd.trim()   !== "";
    const custom_work_start = hasCustomStart ? editCustomStart.trim() : null;
    const custom_work_end   = hasCustomEnd   ? editCustomEnd.trim()   : null;

    const { error } = await supabase
      .from("stylists")
      .update({
        name: editName.trim(),
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        specialties: specs.length ? specs : null,
        custom_work_start,
        custom_work_end,
      })
      .eq("id", editingId);
    if (error) return;
    await saveStylistLinks(editingId);
    cancelEdit();
    load();
  };

  const addStylist = async () => {
    if (!newName.trim()) return;
    const specs = newSpecialties
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const { data, error } = await supabase
      .from("stylists")
      .insert({
        name: newName.trim(),
        phone: newPhone.trim() || null,
        email: newEmail.trim() || null,
        specialties: specs.length ? specs : null,
        is_active: true,
      })
      .select("id")
      .single();
    if (error || !data) return;
    await insertDefaultWorkingHoursForStylist(data.id);
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setNewSpecialties("");
    load();
  };

  const setStylistActive = async (s: Stylist, is_active: boolean) => {
    await supabase.from("stylists").update({ is_active }).eq("id", s.id);
    load();
  };

  // Exception management functions
  const addException = async () => {
    if (!editingId || !newExceptionDate) return;

    let start_time: string | null = null;
    let end_time: string | null = null;

    if (!isFullDay) {
      start_time = newExceptionStartTime || null;
      end_time = newExceptionEndTime || null;
    }

    const { error } = await supabase.from("stylist_exceptions").insert({
      stylist_id: editingId,
      exception_date: newExceptionDate,
      start_time,
      end_time,
      reason: newExceptionReason.trim() || null,
    });

    if (!error) {
      setNewExceptionDate("");
      setNewExceptionStartTime("");
      setNewExceptionEndTime("");
      setNewExceptionReason("");
      setIsFullDay(true);
      await loadStylistExceptions(editingId);
    }
  };

  const deleteException = async (id: string) => {
    await supabase.from("stylist_exceptions").delete().eq("id", id);
    if (editingId) {
      await loadStylistExceptions(editingId);
    }
  };

  return (
    <div className="space-y-10">
      <Card className={cn(adminCard)}>
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div>
            <h2 className="font-be text-xl font-semibold tracking-wide text-white sm:text-2xl">
              Add team member
            </h2>
            <p className={`${adminMuted} mt-2 max-w-2xl`}>
              New staff follow salon default hours. Edit a team member to set custom hours (applies
              to all days) or add service assignments.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={adminLabel}>Name *</label>
              <input className={adminInput} value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <label className={adminLabel}>Phone</label>
              <input className={adminInput} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            </div>
            <div>
              <label className={adminLabel}>Email</label>
              <input className={adminInput} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div>
              <label className={adminLabel}>Specialties (comma-separated)</label>
              <input
                className={adminInput}
                value={newSpecialties}
                onChange={(e) => setNewSpecialties(e.target.value)}
                placeholder="e.g. Fades, Color"
              />
            </div>
          </div>
          <button type="button" onClick={addStylist} className={adminPrimaryBtn}>
            Add staff
          </button>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-be mb-5 text-xl font-semibold tracking-wide text-white sm:text-2xl">
          Team & services they offer
        </h2>
        {loading ? (
          <p className={adminMuted}>Loading…</p>
        ) : (
          <div className="space-y-3">
            {stylists.map((s) => (
              <Card key={s.id} className={cn(adminCard)}>
                <CardContent className="p-5 sm:p-6">
                  {editingId === s.id ? (
                    <div className="space-y-6">
                      {/* Basic Info */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <input className={adminInput} value={editName} onChange={(e) => setEditName(e.target.value)} />
                          <input
                            className={adminInput}
                            placeholder="Phone"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                          />
                          <input
                            className={adminInput}
                            placeholder="Email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                          />
                          <input
                            className={adminInput}
                            placeholder="Specialties, comma-separated"
                            value={editSpecialties}
                            onChange={(e) => setEditSpecialties(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Custom Work Hours */}
                      <div className="rounded-xl border border-[#2a2a2a] bg-[#0f0f0f] p-4">
                        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#f0e68c]">
                          <Clock className="h-4 w-4" />
                          Custom Work Hours
                          <span className="rounded bg-[#1e1e1e] px-1.5 py-0.5 text-[10px] font-normal text-[#8a8275]">
                            applies to all days
                          </span>
                        </h3>
                        <p className="mb-4 text-xs text-[#8a8477]">
                          Set once — applies to every day. Leave empty to follow salon default schedule.{" "}
                          <span className="text-[#b88a3a]">
                            Exceptions (days off) still apply on top.
                          </span>
                        </p>
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="min-w-[140px]">
                            <label className={adminLabel}>Work Start</label>
                            <input
                              type="time"
                              className={cn(adminInput)}
                              value={editCustomStart}
                              onChange={(e) => setEditCustomStart(e.target.value)}
                              placeholder="e.g. 14:00"
                            />
                          </div>
                          <span className="pb-3 text-[#5c574f]">—</span>
                          <div className="min-w-[140px]">
                            <label className={adminLabel}>Work End</label>
                            <input
                              type="time"
                              className={cn(adminInput)}
                              value={editCustomEnd}
                              onChange={(e) => setEditCustomEnd(e.target.value)}
                              placeholder="e.g. 19:00"
                            />
                          </div>
                          {(editCustomStart || editCustomEnd) && (
                            <button
                              type="button"
                              onClick={() => { setEditCustomStart(""); setEditCustomEnd(""); }}
                              className="mb-2.5 flex items-center gap-1.5 rounded-lg border border-red-900/40 bg-red-900/20 px-3 py-1.5 text-xs text-red-400/80 transition-colors hover:border-red-700/60 hover:bg-red-900/30 hover:text-red-400"
                            >
                              <X className="h-3.5 w-3.5" />
                              Remove custom hours
                            </button>
                          )}
                        </div>
                        {editCustomStart && editCustomEnd && (
                          <p className="mt-3 rounded bg-[#1a1a0a] px-3 py-2 text-xs text-[#8a8275]">
                            This stylist will only be available from{" "}
                            <span className="font-semibold text-[#ede583]">{editCustomStart}</span>
                            {" "}to{" "}
                            <span className="font-semibold text-[#ede583]">{editCustomEnd}</span>
                            {" "}every day, unless exceptions are set.
                          </p>
                        )}
                      </div>

                      {/* Services Selection */}
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {services.map((svc) => (
                            <label
                              key={svc.id}
                              className="flex cursor-pointer items-start gap-2.5 text-sm text-[#c4bcb0]"
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-[#333] bg-[#080808] text-[#ab832e] focus:ring-[#ab832e]/40"
                                checked={selectedServiceIds.has(svc.id)}
                                onChange={() => toggleService(svc.id)}
                              />
                              <span>
                                {svc.name}{" "}
                                <span className="text-[#5c574f]">
                                  ({svc.duration_minutes}m · {svc.price}€)
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Schedule Exceptions Management */}
                      <div className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] p-4">
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#f0e68c]">
                          <Calendar className="h-4 w-4" />
                          Schedule Exceptions / Days Off
                        </h3>

                        {/* Add Exception Form */}
                        <div className="mb-4 space-y-3 rounded-lg border border-[#333] bg-[#080808] p-3">
                          <p className="text-xs text-[#8a8477]">
                            Add days off or blocked time slots. Customers won&apos;t be able to book during these times.
                          </p>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <label className={adminLabel}>Date *</label>
                              <input
                                type="date"
                                className={adminInput}
                                value={newExceptionDate}
                                onChange={(e) => setNewExceptionDate(e.target.value)}
                              />
                            </div>
                            <div className="flex items-center pt-5">
                              <label className="flex items-center gap-2 text-sm text-[#c4bcb0]">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-[#333] bg-[#080808] text-[#ab832e] focus:ring-[#ab832e]/40"
                                  checked={isFullDay}
                                  onChange={(e) => setIsFullDay(e.target.checked)}
                                />
                                Full day off
                              </label>
                            </div>
                            {!isFullDay && (
                              <>
                                <div>
                                  <label className={adminLabel}>From (optional)</label>
                                  <input
                                    type="time"
                                    className={adminInput}
                                    value={newExceptionStartTime}
                                    onChange={(e) => setNewExceptionStartTime(e.target.value)}
                                  />
                                </div>
                                <div>
                                  <label className={adminLabel}>To (optional)</label>
                                  <input
                                    type="time"
                                    className={adminInput}
                                    value={newExceptionEndTime}
                                    onChange={(e) => setNewExceptionEndTime(e.target.value)}
                                  />
                                </div>
                              </>
                            )}
                            {isFullDay && (
                              <div className="sm:col-span-2 lg:col-span-2">
                                <label className={adminLabel}>Reason (optional)</label>
                                <input
                                  className={adminInput}
                                  placeholder="e.g. Leave, Urgent work, Meeting"
                                  value={newExceptionReason}
                                  onChange={(e) => setNewExceptionReason(e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                          {!isFullDay && (
                            <div>
                              <label className={adminLabel}>Reason (optional)</label>
                              <input
                                className={adminInput}
                                placeholder="e.g. Leave, Urgent work, Meeting"
                                value={newExceptionReason}
                                onChange={(e) => setNewExceptionReason(e.target.value)}
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={addException}
                            disabled={!newExceptionDate}
                            className={cn(
                              adminPrimaryBtnSm,
                              "flex items-center gap-1.5",
                              !newExceptionDate && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Exception
                          </button>
                        </div>

                        {/* Exceptions List */}
                        {exceptions.length > 0 ? (
                          <div className="space-y-2">
                            <h4 className="text-xs font-medium uppercase tracking-wider text-[#8a8477]">
                              Current exceptions
                            </h4>
                            <div className="max-h-[200px] space-y-2 overflow-y-auto pr-1">
                              {exceptions.map((exc) => {
                                const dow = new Date(exc.exception_date + "T12:00:00").getDay();
                                const isFullDayExc = !exc.start_time && !exc.end_time;
                                return (
                                  <div
                                    key={exc.id}
                                    className="flex items-center justify-between rounded-lg border border-[#333] bg-[#080808] px-3 py-2"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-1.5 text-sm">
                                        <Calendar className="h-3.5 w-3.5 text-[#b88a3a]" />
                                        <span className="font-medium text-[#f5f0e8]">
                                          {DAY_NAMES[dow]} {formatDate(exc.exception_date)}
                                        </span>
                                      </div>
                                      {isFullDayExc ? (
                                        <span className="rounded bg-red-900/30 px-2 py-0.5 text-xs text-red-400/80">
                                          Full day
                                        </span>
                                      ) : (
                                        <div className="flex items-center gap-1.5 text-xs text-[#8a8477]">
                                          <Clock className="h-3 w-3" />
                                          <span>
                                            {exc.start_time ? formatTime(exc.start_time) : "00:00"} -{" "}
                                            {exc.end_time ? formatTime(exc.end_time) : "23:59"}
                                          </span>
                                        </div>
                                      )}
                                      {exc.reason && (
                                        <span className="text-xs text-[#8a8477]">({exc.reason})</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => deleteException(exc.id)}
                                      className="rounded p-1 text-red-400/60 transition-colors hover:bg-red-900/30 hover:text-red-400"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p className="py-3 text-center text-xs text-[#5c574f]">
                            No exceptions scheduled
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={saveEdit} className={adminPrimaryBtnSm}>
                          Save
                        </button>
                        <button type="button" onClick={cancelEdit} className={adminGhostBtnSm}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#f5f0e8]">{s.name}</span>
                          {!s.is_active && (
                            <span className="text-xs text-red-400/90">Hidden</span>
                          )}
                          {(s.custom_work_start || s.custom_work_end) && (
                            <span className="rounded bg-[#2a2010] px-1.5 py-0.5 text-[10px] text-[#b88a3a]">
                              {s.custom_work_start?.slice(0,5)}{s.custom_work_start && s.custom_work_end && '–'}{s.custom_work_end?.slice(0,5)}
                            </span>
                          )}
                        </div>
                        {s.specialties && s.specialties.length > 0 && (
                          <p className={`${adminMuted} mt-1`}>{s.specialties.join(" · ")}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => startEdit(s)} className={adminGhostBtnSm}>
                          Edit & services
                        </button>
                        {s.is_active ? (
                          <button
                            type="button"
                            className={adminGhostBtnSm}
                            onClick={() => setStylistActive(s, false)}
                          >
                            Hide
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={adminGhostBtnSm}
                            onClick={() => setStylistActive(s, true)}
                          >
                            Show
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
