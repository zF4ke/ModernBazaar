import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react"

interface StatusCardProps {
  title: string
  icon: React.ComponentType<{ className?: string }>
  status?: string
  isLoading?: boolean
  value?: string
  iconColorClass?: string
  bgColorClass?: string
}

export function StatusCard({ 
  title, 
  icon: Icon, 
  status, 
  isLoading, 
  value,
  iconColorClass,
  bgColorClass 
}: StatusCardProps) {
  const isUp = status === "UP" || status === "Healthy"
  const isUnknown = !status || status === "Unknown"
  
  // Determine colors based on status
  const getIconColor = () => {
    if (iconColorClass) return iconColorClass
    if (isLoading) return "text-gray-500"
    if (isUp) return "text-green-600 dark:text-green-400"
    if (isUnknown) return "text-gray-500"
    return "text-red-600 dark:text-red-400"
  }
  
  const getBgColor = () => {
    if (bgColorClass) return bgColorClass
    if (isUp) return "bg-green-100 dark:bg-green-900/20"
    if (isUnknown) return "bg-gray-100 dark:bg-gray-900/20"
    return "bg-red-100 dark:bg-red-900/20"
  }
  
  const getStatusColor = () => {
    if (isLoading) return "text-gray-500"
    if (isUp) return "text-green-600 dark:text-green-400"
    if (isUnknown) return "text-gray-500"
    return "text-red-600 dark:text-red-400"
  }
  
  const getStatusIcon = () => {
    if (isLoading) return <RefreshCw className="h-3 w-3 animate-spin text-gray-500" />
    if (isUp) return <CheckCircle className="h-3 w-3 text-green-500" />
    return <AlertCircle className="h-3 w-3 text-red-500" />
  }
  
  const displayValue = value || (isLoading ? "Checking..." : status || "Unknown")

  return (
    <div className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-center space-x-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${getBgColor()}`}>
          <Icon className={`h-5 w-5 ${getIconColor()}`} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">{title}</p>
          <div className="flex items-center space-x-2">
            {!value && getStatusIcon()}
            <span className={`text-xs font-medium ${getStatusColor()}`}>
              {displayValue}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 