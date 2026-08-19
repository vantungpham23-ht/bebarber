import type { ReactNode } from "react";
import { EnvConfigBanner } from "@/components/env-config-banner";
import "./globals.css";

export const metadata = {
  title: "Be. Hair & Barber | Košice",
  description: "Premium barbershop experience in Košice – Be. Hair & Barber.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <EnvConfigBanner />
        {children}
      </body>
    </html>
  );
}
