"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { adminGhostBtn } from "@/lib/admin-ui-classes";

export function AdminSignOut() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        router.refresh();
      }}
      className={`${adminGhostBtn} gap-2`}
    >
      <LogOut className="h-3.5 w-3.5 opacity-80" aria-hidden />
      Sign out
    </button>
  );
}
