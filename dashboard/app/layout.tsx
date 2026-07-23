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

const SITE = process.env.APP_BASE_URL || "http://localhost:3001"

/* Rich link cards everywhere a URL gets pasted (Discord is the channel that
   matters for this audience): og:image, titles, descriptions. Per-page
   metadata (item pages, legal) extends this via the title template. */
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Modern Bazaar - Hypixel SkyBlock trading, done properly",
    template: "%s | Modern Bazaar",
  },
  description:
    "Live Hypixel SkyBlock bazaar prices, handcrafted flip scores, and a clear play for every trade, sized to your coins.",
  openGraph: {
    type: "website",
    siteName: "Modern Bazaar",
    title: "Modern Bazaar - Hypixel SkyBlock trading, done properly",
    description:
      "Live bazaar prices, handcrafted flip scores, and a clear play for every trade, sized to your coins.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Modern Bazaar trading dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Modern Bazaar - Hypixel SkyBlock trading, done properly",
    description:
      "Live bazaar prices, handcrafted flip scores, and a clear play for every trade, sized to your coins.",
    images: ["/og.png"],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body className="font-sans">
        {/* Vercel Web Analytics (script form, no package dependency). Resolves
            only when deployed on Vercel; skipped in dev to avoid 404 noise. */}
        {process.env.NODE_ENV === "production" && (
          <script defer src="/_vercel/insights/script.js" />
        )}
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
