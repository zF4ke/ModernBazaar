import type { Metadata } from "next"
import { Space_Grotesk, Space_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { AuthProvider } from '@/components/auth-provider'
import { UserSetupWrapper } from '@/components/user-setup-wrapper'
import { BackendHealthProvider } from '@/components/backend-health-provider'
import { OfflineOverlay } from '@/components/offline-overlay'

// UI face: Space Grotesk (base weight 500 set in globals.css - 400 reads thin on
// dark). Data face: Space Mono, used only for real tabular numbers.
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans" })
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" })

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
    <html lang="en" suppressHydrationWarning className={`${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body className="font-sans">
        <AuthProvider>
          <ThemeProvider
            attribute="class" 
            defaultTheme="dark" 
            enableSystem={false}
            storageKey="theme"
            disableTransitionOnChange
          >
            <QueryProvider>
              <BackendHealthProvider>
                <UserSetupWrapper>
                  {children}
                  <OfflineOverlay />
                </UserSetupWrapper>
              </BackendHealthProvider>
            </QueryProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
