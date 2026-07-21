import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/* Shimmer bone on the token ramp, so the skeleton matches the surfaces it
   stands in for. */
function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded bg-gradient-to-r from-muted via-secondary to-muted bg-[length:200%_100%]",
        className,
      )}
    />
  )
}

/* Mirrors the real OpportunityCard layout: header row, profit well, buy/sell
   tiles, badge footer. Loading never reflows into a different shape. */
export function OpportunitySkeletonCard({ index }: { index: number }) {
  return (
    <Card key={index} className="h-full overflow-hidden border-border/60 bg-card">
      <CardHeader className="pb-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Bone className="h-5 w-32" />
              <Bone className="h-4 w-4" />
            </div>
            <Bone className="mb-3 h-3 w-24" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Bone className="h-3 w-12" />
            <Bone className="h-4 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pb-4 pt-0">
        <div className="rounded-lg border border-border/40 bg-border/20 p-4">
          <div className="mb-2 flex items-center justify-between">
            <Bone className="h-4 w-28" />
            <Bone className="h-4 w-20" />
          </div>
          <Bone className="mb-1 h-8 w-32" />
          <Bone className="h-3 w-24" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-muted/40 p-2.5">
            <Bone className="mb-1.5 h-3 w-16" />
            <Bone className="h-4 w-20" />
          </div>
          <div className="rounded-md bg-muted/40 p-2.5">
            <Bone className="mb-1.5 h-3 w-16" />
            <Bone className="h-4 w-20" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border/60 pt-3">
          <div className="flex items-center gap-1.5">
            <Bone className="h-5 w-20" />
            <Bone className="h-5 w-16" />
            <Bone className="h-5 w-16" />
          </div>
          <Bone className="h-3 w-28" />
        </div>
      </CardContent>
    </Card>
  )
}
