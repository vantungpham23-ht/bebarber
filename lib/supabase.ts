import { createClient } from "@supabase/supabase-js";
import type { ServiceCategoryId } from "@/lib/service-categories";

/**
 * createClient throws if url/key are missing — that crashes every page that imports this module
 * (home + admin). Use placeholders when env is empty so the UI still mounts; API calls then fail
 * with network errors until real NEXT_PUBLIC_* vars are set (e.g. on Vercel).
 */
const PLACEHOLDER_URL = "https://__configure-env__.supabase.co";
/** Shape-valid anon JWT (Supabase demo); not a real project — only avoids constructor throw. */
const PLACEHOLDER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || PLACEHOLDER_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || PLACEHOLDER_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  price_max: number | null;
  category: ServiceCategoryId;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Stylist = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  specialties: string[] | null;
  is_active: boolean;
  custom_work_start: string | null; // e.g. "14:00" — applies to ALL days
  custom_work_end:   string | null; // e.g. "19:00" — null means follow salon schedule
  created_at: string;
};

export type StylistService = {
  stylist_id: string;
  service_id: string;
};

export type Booking = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  service_id: string;
  stylist_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TimeSlot = {
  slot_time: string;
};

export type WorkingHours = {
  id: string;
  stylist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

/** Exception: ngày nghỉ hoặc khung giờ nghỉ cụ thể của thợ */
export type StylistException = {
  id: string;
  stylist_id: string;
  exception_date: string; // "YYYY-MM-DD"
  start_time: string | null; // "HH:MM" - null = từ đầu ngày
  end_time: string | null; // "HH:MM" - null = đến cuối ngày
  reason: string | null;
  created_at: string;
};

/** Giờ mở cửa mặc định của toàn tiệm, theo ngày trong tuần */
export type SalonSchedule = {
  id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
  is_active: boolean;
  updated_at: string;
};
