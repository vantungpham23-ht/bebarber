import { supabase } from "@/lib/supabase";

/** Giờ mặc định giống seed: Po–Pi 9–19, So 9–18, Ne 10–17 */
export async function insertDefaultWorkingHoursForStylist(stylistId: string) {
  const rows = [
    ...[1, 2, 3, 4, 5].map((dow) => ({
      stylist_id: stylistId,
      day_of_week: dow,
      start_time: "09:00",
      end_time: "19:00",
    })),
    { stylist_id: stylistId, day_of_week: 6, start_time: "09:00", end_time: "18:00" },
    { stylist_id: stylistId, day_of_week: 0, start_time: "10:00", end_time: "17:00" },
  ];
  const { error } = await supabase.from("working_hours").insert(rows);
  return error;
}
