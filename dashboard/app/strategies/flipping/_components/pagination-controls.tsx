"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  totalItems: number
  limit: number
  goToPreviousPageAction: () => void
  goToNextPageAction: () => void
}

export function PaginationControls({ currentPage, totalPages, totalItems, limit, goToPreviousPageAction, goToNextPageAction }: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Showing {currentPage * (limit || 50) + 1}-{Math.min((currentPage + 1) * (limit || 50), totalItems)} of {totalItems} items
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={goToPreviousPageAction} disabled={currentPage === 0}>
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm">Page {currentPage + 1} of {totalPages}</span>
        <Button variant="outline" size="sm" onClick={goToNextPageAction} disabled={currentPage >= totalPages - 1}>
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
