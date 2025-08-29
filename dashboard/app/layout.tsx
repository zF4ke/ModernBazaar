import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { Header } from "@/components/header"
import { AuthProvider } from '@/components/auth-provider'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Modern Bazaar Dashboard",
  description: "Trading dashboard for Modern Bazaar platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
        <ThemeProvider
          attribute="class" 
          defaultTheme="dark" 
          enableSystem={false}
          storageKey="theme"
          disableTransitionOnChange
        >
          <QueryProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <Header />
                <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">{children}</main>
              </SidebarInset>
            </SidebarProvider>
          </QueryProvider>
        </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
