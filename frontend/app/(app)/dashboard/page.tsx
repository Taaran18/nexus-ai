import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardView } from "@/components/app/dashboard-view";

export const metadata: Metadata = { title: "Overview", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  );
}
