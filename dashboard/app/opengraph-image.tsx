import { ImageResponse } from "next/og"

/**
 * Generated OG card (replaces a static public/og.png that had rotted into a
 * screenshot of a build error). Code-drawn, so it can never silently break:
 * dark navy canvas, brand mark, tagline — matches the site's design tokens.
 */
export const runtime = "edge"
export const alt = "Modern Bazaar — live Hypixel SkyBlock bazaar prices and flip scores"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0a0e1a 0%, #10162a 55%, #0a0e1a 100%)",
          color: "#f4f6fb",
          fontFamily: "sans-serif",
        }}
      >
        {/* live dot + label */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
          <div style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#34d399" }} />
          <div style={{ fontSize: "26px", color: "#8b93a7", letterSpacing: "2px" }}>
            LIVE HYPIXEL SKYBLOCK MARKET DATA
          </div>
        </div>

        <div style={{ display: "flex", fontSize: "88px", fontWeight: 700, letterSpacing: "-2px" }}>
          Modern Bazaar
        </div>

        <div style={{ display: "flex", fontSize: "38px", color: "#aeb6c8", marginTop: "20px", maxWidth: "900px" }}>
          Bazaar prices, handcrafted flip scores, and a clear play for every trade.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "56px" }}>
          <div
            style={{
              display: "flex",
              padding: "12px 26px",
              borderRadius: "999px",
              background: "#3b82f6",
              color: "#ffffff",
              fontSize: "28px",
              fontWeight: 700,
            }}
          >
            modernbazaar.dev
          </div>
          <div style={{ fontSize: "26px", color: "#8b93a7" }}>free live prices · flip smarter</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
