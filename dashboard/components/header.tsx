"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"

export function Header() {
  // const { setTheme, theme } = useTheme()
  const pathname = usePathname()

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length === 0) return [{ label: "Dashboard", href: "/" }]

    const breadcrumbs = [{ label: "Dashboard", href: "/" }]

    if (segments[0] === "bazaar-items") {
      breadcrumbs.push({ label: "Bazaar Items", href: "/bazaar-items" })
      if (segments[1]) {
        breadcrumbs.push({ label: segments[1].toUpperCase(), href: `/bazaar-items/${segments[1]}` })
      }
    } else if (segments[0] === "skyblock-items") {
      breadcrumbs.push({ label: "Skyblock Items", href: "/skyblock-items" })
      if (segments[1]) {
        breadcrumbs.push({ label: segments[1].toUpperCase(), href: `/skyblock-items/${segments[1]}` })
      }
    } else {
      breadcrumbs.push({
        label: segments[0].charAt(0).toUpperCase() + segments[0].slice(1),
        href: `/${segments[0]}`,
      })
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center">
              {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
              <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
                {index === breadcrumbs.length - 1 ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto">
        {/* <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button> */}
      </div>
    </header>
  )
}
