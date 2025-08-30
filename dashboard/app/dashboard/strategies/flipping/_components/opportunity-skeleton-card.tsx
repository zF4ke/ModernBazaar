import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function OpportunitySkeletonCard({ index }: { index: number }) {
  return (
    <Card key={index} className="h-full overflow-hidden bg-background/80 border-border/50">
      <CardHeader className="pb-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-5 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-32 animate-shimmer bg-[length:200%_100%]"></div>
              <div className="h-4 w-4 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded animate-shimmer bg-[length:200%_100%]"></div>
            </div>
            <div className="h-3 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-24 mb-3 animate-shimmer bg-[length:200%_100%]"></div>
          </div>
          <div className="text-right">
            <div className="h-3 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-12 mb-1 animate-shimmer bg-[length:200%_100%]"></div>
            <div className="h-4 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-16 mb-1 animate-shimmer bg-[length:200%_100%]"></div>
            <div className="h-3 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-4 animate-shimmer bg-[length:200%_100%]"></div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0 pb-4">
        <div className="bg-border/20 border border-border/40 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
              <div className="h-4 w-4 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded animate-shimmer bg-[length:200%_100%]"></div>
              <div className="h-4 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-24 animate-shimmer bg-[length:200%_100%]"></div>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-4 w-4 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded animate-shimmer bg-[length:200%_100%]"></div>
              <div className="h-4 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-20 animate-shimmer bg-[length:200%_100%]"></div>
            </div>
          </div>
          <div className="h-8 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-32 mb-1 animate-shimmer bg-[length:200%_100%]"></div>
          <div className="h-3 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-24 animate-shimmer bg-[length:200%_100%]"></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-neutral-800/50 border border-neutral-700/50 rounded p-2">
            <div className="h-3 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-16 mb-1 animate-shimmer bg-[length:200%_100%]"></div>
            <div className="h-4 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-20 animate-shimmer bg-[length:200%_100%]"></div>
          </div>
          <div className="bg-neutral-800/50 border border-neutral-700/50 rounded p-2">
            <div className="h-3 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-16 mb-1 animate-shimmer bg-[length:200%_100%]"></div>
            <div className="h-4 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-20 animate-shimmer bg-[length:200%_100%]"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="h-5 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-20 animate-shimmer bg-[length:200%_100%]"></div>
            <div className="h-5 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-16 animate-shimmer bg-[length:200%_100%]"></div>
            <div className="h-5 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-16 animate-shimmer bg-[length:200%_100%]"></div>
            <div className="ml-auto flex items-center gap-1">
              <div className="h-3 w-3 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded animate-shimmer bg-[length:200%_100%]"></div>
              <div className="h-3 bg-gradient-to-r from-neutral-700 via-neutral-600 to-neutral-700 rounded w-24 animate-shimmer bg-[length:200%_100%]"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

