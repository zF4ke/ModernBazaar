"use client"

import { BarChart3, Home, Package, Settings, Shuffle, Layers, Compass, Shield, Code, User, Crosshair, Share2, MessageSquareText } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { useAdminAccess } from "@/hooks/use-admin-access"
import { BrandMark } from "@/components/brand-mark"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const pathname = usePathname()
  const { hasAdminAccess } = useAdminAccess()

  const sections = useMemo(() => [
    {
      label: "Overview",
      items: [
        { title: "Home", url: "/dashboard", icon: Home },
      ],
    },
    {
      label: "Market",
      items: [
        { title: "Bazaar Items", url: "/dashboard/bazaar-items", icon: Package },
        { title: "Skyblock Items", url: "/dashboard/skyblock-items", icon: Layers },
      ],
    },
    {
      label: "Strategies",
      items: [
        { title: "Strategies", url: "/dashboard/strategies", icon: Compass },
        { title: "Flipping", url: "/dashboard/strategies/flipping", icon: Shuffle },
        { title: "Manipulation", url: "/dashboard/strategies/manipulation", icon: Crosshair },
      ],
    },
    {
      label: "Account",
      items: [
        { title: "Profile", url: "/dashboard/profile", icon: User },
      ],
    },
    ...(hasAdminAccess ? [{
      label: "Admin",
      items: [
        { title: "Analytics", url: "/dashboard/admin/analytics", icon: BarChart3 },
        { title: "Users", url: "/dashboard/admin/users", icon: User },
        { title: "Referrals", url: "/dashboard/admin/referrals", icon: Share2 },
        { title: "Churn feedback", url: "/dashboard/admin/cancellations", icon: MessageSquareText },
        { title: "Plans", url: "/dashboard/admin/plans", icon: Shield },
        { title: "Endpoints", url: "/dashboard/admin/endpoints", icon: Code },
        { title: "Settings", url: "/dashboard/admin/settings", icon: Settings },
      ],
    }] : []),
  ], [hasAdminAccess])

  // The active item is the MOST SPECIFIC url matching the current path, so
  // "Flipping" wins over its parent "Strategies" and the indicator has one home.
  const activeUrl = useMemo(() => {
    const urls = sections.flatMap((s) => s.items.map((i) => i.url))
    return urls
      .filter((u) => pathname === u || pathname.startsWith(u + "/"))
      .sort((a, b) => b.length - a.length)[0] ?? null
  }, [sections, pathname])

  // Sliding active pill: one persistent element that glides between items
  // (object permanence) instead of a per-item background that hops. Boxes are
  // measured on mount/resize into state; a route change only switches which
  // stored box is used, so the transform transition actually animates.
  const contentRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>())
  const [boxes, setBoxes] = useState<Record<string, { top: number; height: number }>>({})

  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    const measure = () => {
      const contentTop = content.getBoundingClientRect().top
      const next: Record<string, { top: number; height: number }> = {}
      itemRefs.current.forEach((el, url) => {
        const r = el.getBoundingClientRect()
        next[url] = { top: r.top - contentTop + content.scrollTop, height: r.height }
      })
      setBoxes(next)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(content)
    window.addEventListener("resize", measure)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [sections])

  const activeBox = activeUrl ? boxes[activeUrl] : undefined

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2.5 px-2 py-2">
          <BrandMark className="h-8 w-8 rounded-lg" />
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-semibold tracking-tight">Modern Bazaar</span>
            <span className="text-xs text-muted-foreground">Trading dashboard</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent ref={contentRef} className="relative">
        {/* Sliding active pill: soft fill + a short accent bar on the left edge */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-2 right-2 z-0 rounded-md bg-sidebar-accent transition-[transform,height,opacity] duration-300 ease-spring"
          style={{
            height: activeBox?.height ?? 32,
            transform: `translateY(${activeBox?.top ?? 0}px)`,
            opacity: activeBox ? 1 : 0,
          }}
        >
          <span className="absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-full bg-primary" />
        </div>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = item.url === activeUrl
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="relative z-10 transition-colors duration-150 data-[active=true]:bg-transparent data-[active=true]:font-semibold data-[active=true]:text-sidebar-accent-foreground"
                      >
                        <Link
                          href={item.url}
                          ref={(el) => {
                            if (el) itemRefs.current.set(item.url, el)
                            else itemRefs.current.delete(item.url)
                          }}
                        >
                          <item.icon className={isActive ? "text-primary" : undefined} />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
