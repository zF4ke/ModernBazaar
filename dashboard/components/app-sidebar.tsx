"use client"

import { BarChart3, Home, Package, Settings, Shuffle, Layers, LineChart, Compass, Shield, Code } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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

// Estrutura por secções (estilo Discord: categorias com canais)
const sections = [
  {
    label: "Overview",
    items: [
      { title: "Home", url: "/", icon: Home },
    ],
  },
  {
    label: "Market",
    items: [
      { title: "Bazaar Items", url: "/bazaar-items", icon: Package },
      { title: "Skyblock Items", url: "/skyblock-items", icon: Layers },
    ],
  },
  {
    label: "Strategies",
    items: [
      { title: "Strategies", url: "/strategies", icon: Compass },
      { title: "Flipping", url: "/strategies/flipping", icon: Shuffle },
    ],
  },
  {
    label: "Analytics",
    items: [
      { title: "Charts", url: "/charts", icon: LineChart },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings", url: "/settings", icon: Settings },
      { title: "Subscription", url: "/subscription", icon: BarChart3 },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Plans", url: "/admin/plans", icon: Shield },
      { title: "Endpoints", url: "/admin/endpoints", icon: Code },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  const isActive = (itemUrl: string) => {
    if (itemUrl === "/") return pathname === "/"
    return pathname === itemUrl || pathname.startsWith(itemUrl + "/")
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-4 w-4" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-semibold">Modern Bazaar</span>
            <span className="text-xs text-muted-foreground">Trading Dashboard</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
