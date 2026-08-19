"use client";

import { useEffect, useState } from "react";
import { supabase, type Service } from "@/lib/supabase";
import { normalizeService, normalizeServices } from "@/lib/normalize-service";
import {
  SERVICE_CATEGORY_IDS,
  SERVICE_CATEGORY_LABELS,
  type ServiceCategoryId,
} from "@/lib/service-categories";
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
  adminSelect,
} from "@/lib/admin-ui-classes";

const emptyForm = {
  name: "",
  description: "",
  duration_minutes: 30,
  price: 15,
  price_max: null as number | null,
  category: "pansky" as ServiceCategoryId,
  sort_order: 10,
};

export function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Service>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("services")
      .select("*")
      .order("category")
      .order("sort_order")
      .order("name");
    setServices(normalizeServices(data));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addService = async () => {
    if (!form.name.trim()) return;
    const { error } = await supabase.from("services").insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
      duration_minutes: form.duration_minutes,
      price: form.price,
      price_max: form.price_max,
      category: form.category,
      sort_order: form.sort_order,
      is_active: true,
    });
    if (!error) {
      setForm(emptyForm);
      load();
    }
  };

  const startEdit = (s: Service) => {
    setEditingId(s.id);
    setEditDraft({ ...normalizeService(s) });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from("services")
      .update({
        name: editDraft.name,
        description: editDraft.description,
        duration_minutes: editDraft.duration_minutes,
        price: editDraft.price,
        price_max: editDraft.price_max,
        category: editDraft.category,
        sort_order: editDraft.sort_order,
        is_active: editDraft.is_active,
      })
      .eq("id", editingId);
    if (!error) {
      cancelEdit();
      load();
    }
  };

  const setActive = async (s: Service, is_active: boolean) => {
    await supabase.from("services").update({ is_active }).eq("id", s.id);
    load();
  };

  return (
    <div className="space-y-10">
      <Card className={cn(adminCard)}>
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div>
            <h2 className="font-be text-xl font-semibold tracking-wide text-white sm:text-2xl">
              Add service
            </h2>
            <p className={`${adminMuted} mt-2 max-w-2xl`}>
              New rows appear on the price list and in booking when marked active.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={adminLabel}>Name</label>
              <input className={adminInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className={adminLabel}>Category</label>
              <select
                className={adminSelect}
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as ServiceCategoryId })
                }
              >
                {SERVICE_CATEGORY_IDS.map((id) => (
                  <option key={id} value={id}>
                    {SERVICE_CATEGORY_LABELS[id].sk}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={adminLabel}>Description</label>
              <textarea
                className={`${adminInput} min-h-[5rem] resize-y`}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className={adminLabel}>Duration (min)</label>
              <input
                type="number"
                min={5}
                className={adminInput}
                value={form.duration_minutes}
                onChange={(e) =>
                  setForm({ ...form, duration_minutes: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
            <div>
              <label className={adminLabel}>Price (€)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                className={adminInput}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className={adminLabel}>Max price (€) - optional</label>
              <input
                type="number"
                step="0.01"
                min={0}
                className={adminInput}
                value={form.price_max ?? ""}
                placeholder="e.g. 25"
                onChange={(e) =>
                  setForm({
                    ...form,
                    price_max: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
              />
            </div>
            <div>
              <label className={adminLabel}>Sort order</label>
              <input
                type="number"
                className={adminInput}
                value={form.sort_order}
                onChange={(e) =>
                  setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
          </div>
          <button type="button" onClick={addService} className={adminPrimaryBtn}>
            Add service
          </button>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-be mb-5 text-xl font-semibold tracking-wide text-white sm:text-2xl">
          All services
        </h2>
        {loading ? (
          <p className={adminMuted}>Loading…</p>
        ) : (
          <div className="space-y-3">
            {services.map((s) => (
              <Card key={s.id} className={cn(adminCard)}>
                <CardContent className="p-5 sm:p-6">
                  {editingId === s.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <input
                          className={adminInput}
                          value={editDraft.name ?? ""}
                          onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                        />
                        <select
                          className={adminSelect}
                          value={editDraft.category ?? "pansky"}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              category: e.target.value as ServiceCategoryId,
                            })
                          }
                        >
                          {SERVICE_CATEGORY_IDS.map((id) => (
                            <option key={id} value={id}>
                              {SERVICE_CATEGORY_LABELS[id].sk}
                            </option>
                          ))}
                        </select>
                        <textarea
                          className={`${adminInput} md:col-span-2 min-h-[4rem]`}
                          value={editDraft.description ?? ""}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, description: e.target.value })
                          }
                        />
                        <input
                          type="number"
                          className={adminInput}
                          placeholder="Minutes"
                          value={editDraft.duration_minutes ?? 0}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              duration_minutes: parseInt(e.target.value, 10) || 0,
                            })
                          }
                        />
                        <input
                          type="number"
                          step="0.01"
                          className={adminInput}
                          value={editDraft.price ?? 0}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              price: parseFloat(e.target.value) || 0,
                            })
                          }
                        />
                        <input
                          type="number"
                          step="0.01"
                          className={adminInput}
                          placeholder="Max price (optional)"
                          value={editDraft.price_max ?? ""}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              price_max: e.target.value ? parseFloat(e.target.value) : null,
                            })
                          }
                        />
                        <input
                          type="number"
                          className={adminInput}
                          value={editDraft.sort_order ?? 0}
                          onChange={(e) =>
                            setEditDraft({
                              ...editDraft,
                              sort_order: parseInt(e.target.value, 10) || 0,
                            })
                          }
                        />
                        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#b0a898] md:col-span-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-[#333] bg-[#080808] text-[#ab832e] focus:ring-[#ab832e]/40"
                            checked={editDraft.is_active ?? true}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, is_active: e.target.checked })
                            }
                          />
                          Active (visible on site & booking)
                        </label>
                      </div>
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
                          <span className="rounded-md border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#8a8275]">
                            {s.category}
                          </span>
                          {!s.is_active && (
                            <span className="text-xs text-red-400/90">Hidden</span>
                          )}
                        </div>
                        <p className={`${adminMuted} mt-1 max-w-2xl`}>{s.description}</p>
                        <p className="mt-2 text-xs text-[#5c574f]">
                          {s.duration_minutes} min · {s.price}€ · sort {s.sort_order}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => startEdit(s)} className={adminGhostBtnSm}>
                          Edit
                        </button>
                        {s.is_active ? (
                          <button
                            type="button"
                            className={adminGhostBtnSm}
                            onClick={() => setActive(s, false)}
                          >
                            Hide
                          </button>
                        ) : (
                          <button type="button" className={adminGhostBtnSm} onClick={() => setActive(s, true)}>
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
