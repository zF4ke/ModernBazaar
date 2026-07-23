import type { Metadata } from "next"
import { Space_Grotesk, Space_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { AuthProvider } from '@/components/auth-provider'
import { UserSetupWrapper } from '@/components/user-setup-wrapper'
import { BackendHealthProvider } from '@/components/backend-health-provider'
import { OfflineOverlay } from '@/components/offline-overlay'
import { Analytics } from "@vercel/analytics/next"

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
  // Per-page canonical (resolved against metadataBase) — one canonical URL per
  // page so legacy hosts and query-param variants don't split ranking signals.
  alternates: { canonical: "./" },
  keywords: [
    "hypixel bazaar", "bazaar flipping", "skyblock bazaar tracker",
    "skyblock bazaar profit calculator", "bazaar flip finder", "modern bazaar hypixel",
  ],
  // og:image / twitter:image come from app/opengraph-image.tsx (file
  // convention) — a code-generated card that can't rot like a screenshot.
  openGraph: {
    type: "website",
    siteName: "Modern Bazaar",
    url: SITE,
    title: "Modern Bazaar - Hypixel SkyBlock trading, done properly",
    description:
      "Live bazaar prices, handcrafted flip scores, and a clear play for every trade, sized to your coins.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Modern Bazaar - Hypixel SkyBlock trading, done properly",
    description:
      "Live bazaar prices, handcrafted flip scores, and a clear play for every trade, sized to your coins.",
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
        {/* Structured data: tells Google this is a web app, not the grocery
            chain that shares the name (brand disambiguation for search). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Modern Bazaar",
              applicationCategory: "GameApplication",
              operatingSystem: "All",
              url: SITE,
              description:
                "Live Hypixel SkyBlock bazaar prices, flip scores and market analytics. Track margins, find flips, and trade smarter.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            }),
          }}
        />
        <Analytics />
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
