"use client"

import { BarChart3, Home, Package, Settings, Shuffle, Layers, Compass, Shield, Code, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAdminAccess } from "@/hooks/use-admin-access"

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

  // Estrutura por secções (estilo Discord: categorias com canais)
  const sections = [
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
      ],
    },
    {
      label: "Account",
      items: [
        { title: "Profile", url: "/dashboard/profile", icon: User },
      ],
    },
    // Only show Admin section if user has admin access
    ...(hasAdminAccess ? [{
      label: "Admin",
      items: [
        { title: "Plans", url: "/dashboard/admin/plans", icon: Shield },
        { title: "Endpoints", url: "/dashboard/admin/endpoints", icon: Code },
        { title: "Settings", url: "/dashboard/admin/settings", icon: Settings },
      ],
    }] : []),
  ]

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
