"use client"

import { Shield } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      {/* Admin Page Indicator */}
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="bg-red-100/50 text-red-600/80 dark:bg-red-900/20 dark:text-red-400/70 border-red-200/50 dark:border-red-800/50 text-xs font-normal">
          Admin
        </Badge>
      </div>
      
      {children}
    </div>
  )
}
