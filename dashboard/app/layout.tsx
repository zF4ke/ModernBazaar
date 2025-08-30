import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { AuthProvider } from '@/components/auth-provider'

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Modern Bazaar",
  description: "Trading Dashboard for Hypixel SkyBlock",
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
              {children}
            </QueryProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
