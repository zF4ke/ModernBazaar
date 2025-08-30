"use client"

import { Moon, Sun, LogIn, LogOut, User, Settings, ChevronDown } from "lucide-react"
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
import { usePathname, useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header() {
  const { setTheme, theme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const { loginWithRedirect, logout, isAuthenticated, user, isLoading } = useAuth0()

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean)
    
    // Always start with Dashboard
    const breadcrumbs = [{ label: "Dashboard", href: "/dashboard" }]
    
    // If we're at the root dashboard, just return Dashboard
    if (segments.length === 0 || (segments.length === 1 && segments[0] === "dashboard")) {
      return breadcrumbs
    }

    // Handle dashboard routes - build dynamically
    if (segments[0] === "dashboard") {
      let currentPath = "/dashboard"
      
      // Start from segment 1 (after "dashboard")
      for (let i = 1; i < segments.length; i++) {
        currentPath += `/${segments[i]}`
        
        // Convert segment to readable label (e.g., "bazaar-items" -> "Bazaar Items")
        const label = segments[i]
          .split("-")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
        
        breadcrumbs.push({ label, href: currentPath })
      }
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
          <Button size="sm" variant="outline" onClick={() => window.location.href = '/login'}> <LogIn className="h-4 w-4 mr-1"/> Login</Button>
        )}
        {isAuthenticated && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 hover:bg-white/10" 
                style={{ outline: 'none', boxShadow: 'none' }}
              >
                <User className="h-4 w-4" />
                <span className="font-medium">{user?.name || user?.email || 'Account'}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-background border border-border">
              <DropdownMenuItem 
                className="cursor-pointer hover:bg-accent focus:bg-accent"
                onClick={() => router.push('/dashboard/profile')}
              >
                <User className="h-4 w-4 mr-2" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer hover:bg-accent focus:bg-accent"
                onClick={() => router.push('/dashboard/settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                className="cursor-pointer text-red-400 hover:text-red-300 focus:text-red-300 hover:bg-accent focus:bg-accent"
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
