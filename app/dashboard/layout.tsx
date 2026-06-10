<<<<<<< HEAD
import { SidebarProvider } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/features/dashboard/dashboard-sidebar';
import React from 'react'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}){
  return (
    <>
    <SidebarProvider>
            <div className="flex min-h-screen ">
              <DashboardSidebar />
              <main className="flex-1 w-full">{children}</main>
            </div>
          </SidebarProvider>
    </>
  )
=======
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/features/dashboard/dashboard-sidebar";
import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <DashboardSidebar  />
        <main className="flex-1">{children}</main>
      </div>
    </SidebarProvider>
  );
>>>>>>> 372e3bc1481a84dc0ffee574b447818c0c2758b9
}
