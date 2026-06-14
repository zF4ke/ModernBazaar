import { Button } from "@/components/ui/button"
import { Play } from "lucide-react"

export function VideoTutorialPopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border rounded-lg p-6 max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-muted border">
            <Play className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Video Tutorials</h3>
        </div>
        <p className="text-muted-foreground mb-6">
          We're working on creating helpful video guides to get you started with Bazaar flipping.
          For now, check out the "How It Works" and "How to Use It" sections above, or jump
          straight into the flipping tool to explore the features yourself.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Close
          </Button>
          <Button
            onClick={() => {
              onClose()
              window.location.href = '/dashboard/strategies/flipping'
            }}
            className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-sm"
          >
            Try It Now
          </Button>
        </div>
      </div>
    </div>
  )
}
