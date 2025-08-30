import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Header } from "@/components/header"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Modern Bazaar Dashboard",
  description: "Trading dashboard for Modern Bazaar platform",
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Header />
          <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
