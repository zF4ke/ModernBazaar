"use client"

import { Moon, Sun, LogIn, LogOut, User } from "lucide-react"
import { useTheme } from "next-themes"
import { useAuth0 } from '@auth0/auth0-react'

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
  const { setTheme, theme } = useTheme()
  const pathname = usePathname()
  const { loginWithRedirect, logout, isAuthenticated, user, isLoading } = useAuth0()

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
      <div className="ml-auto flex items-center gap-2">
        {isLoading && <span className="text-xs text-muted-foreground">...</span>}
        {!isLoading && !isAuthenticated && (
          <Button size="sm" variant="outline" onClick={() => loginWithRedirect()}> <LogIn className="h-4 w-4 mr-1"/> Login</Button>
        )}
        {isAuthenticated && (
          <>
            <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
              <User className="h-4 w-4"/>
              <span>{user?.email || user?.name || 'User'}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}><LogOut className="h-4 w-4 mr-1"/>Logout</Button>
          </>
        )}
      </div>
    </header>
  )
}
