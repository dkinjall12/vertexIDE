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
}
