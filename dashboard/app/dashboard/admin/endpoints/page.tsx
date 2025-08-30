"use client"

import { useAuth0 } from '@auth0/auth0-react'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Shield,
  Globe,
  Lock,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Play,
  Settings,
  BarChart3,
  Users,
  ShoppingCart,
  TrendingUp,
  Eye,
  EyeOff
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAdminAccess } from '@/hooks/use-admin-access'

// Permission syntax used in error payloads
// - requiredPermissions: (string | string[])[]
//   • Each entry represents a group that MUST be satisfied (AND between groups)
//   • Within a group, ANY permission satisfies the group (OR within the group)
//   • Examples:
//     - [["SCOPE_use:starter","SCOPE_use:flipper","SCOPE_use:elite"]] -> any tier allowed
//     - [["SCOPE_manage:plans"]] -> single required permission
//     - [["SCOPE_read:plans"], ["SCOPE_use:starter","SCOPE_use:flipper"]] -> read:plans AND (use:starter OR use:flipper)
// - missingPermissions follows the same double-list structure for groups NOT satisfied

// Helper: normalize a raw groups structure (string | string[])[] into string[][] with SCOPE_ removed
const normalizePermissionGroups = (
  raw?: (string | string[])[] | string,
  normalizeScopeFn?: (s?: string) => string | undefined
): string[][] => {
  if (!raw) return []
  if (typeof raw === 'string') {
    const parts = raw
      .split(/\s+OR\s+|\s*,\s*/i)
      .map(s => s.trim())
      .filter(Boolean)
    const mapped = normalizeScopeFn ? parts.map(p => normalizeScopeFn(p)!) : parts
    return [mapped]
  }
  if (Array.isArray(raw)) {
    const looksNested = raw.some((e) => Array.isArray(e))
    const groups = looksNested ? (raw as (string[])[]) : [raw as string[]]
    return groups.map(g => (normalizeScopeFn ? g.map(p => normalizeScopeFn(p)!) : g))
  }
  return []
}

interface EndpointInfo {
  path: string
  method: string
  description: string
  category: string
  requiresAuth: boolean
}

interface EndpointTest {
  path: string
  method: string
  unauthorizedStatus?: number
  unauthorizedResponse?: any
  authorizedStatus?: number | null
  authorizedResponse?: any
  permissionDetails?: {
    requiredPermission?: string
    // Double-list syntax for groups: AND between groups, OR within a group
    requiredPermissions?: (string | string[])[]
    currentPermissions?: string[]
    // Supports double-list syntax for OR groups
    missingPermissions?: (string | string[])[]
    error?: string
    details?: string
  } | null
  lastTested?: Date
  isTesting: boolean
}

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'System': Shield,
  'Admin': Settings,
  'User': Users,
  'Plans': BarChart3,
  'Bazaar': ShoppingCart,
  'Skyblock': TrendingUp,
  'Strategies': Zap,
  'Metrics': BarChart3
}

// Enhanced Status indicator component with dark mode support
const StatusIndicator = ({ status, label }: { status: 'success' | 'error' | 'warning' | 'info', label: string }) => {
  const configs = {
    success: {
      icon: CheckCircle,
      className: 'text-green-600 dark:text-green-400',
      bgClass: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20'
    },
    error: {
      icon: XCircle,
      className: 'text-red-600 dark:text-red-400',
      bgClass: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
    },
    warning: {
      icon: AlertTriangle,
      className: 'text-yellow-600 dark:text-yellow-400',
      bgClass: 'bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20'
    },
    info: {
      icon: Clock,
      className: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
    }
  }

  const config = configs[status]
  const Icon = config.icon

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bgClass}`}>
      <Icon className={`h-4 w-4 ${config.className}`} />
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

// Method badge component with dark mode support
const MethodBadge = ({ method }: { method: string }) => {
  const configs = {
    GET: 'bg-blue-500/10 text-blue-400 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
    POST: 'bg-green-500/10 text-green-400 border-green-500/20 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30',
    PUT: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30',
    DELETE: 'bg-red-500/10 text-red-400 border-red-500/20 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
    PATCH: 'bg-purple-500/10 text-purple-400 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30'
  }

  return (
    <Badge variant="outline" className={`text-xs font-mono font-medium ${configs[method as keyof typeof configs] || 'bg-gray-500/10 text-gray-400 border-gray-500/20 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30'}`}>
      {method}
    </Badge>
  )
}

// Enhanced Permission Details Component
const PermissionDetails = ({
  permissionDetails,
  normalizeScope,
  normalizeScopes,
  copyToClipboard
}: {
  permissionDetails: EndpointTest['permissionDetails']
  normalizeScope: (s?: string) => string | undefined
  normalizeScopes: (arr?: string[]) => string[]
  copyToClipboard: (text: string) => Promise<void>
}) => {
  if (!permissionDetails) return null

  const requiredPerms = normalizeScopes(permissionDetails.currentPermissions)
  const missingRaw = permissionDetails.missingPermissions as (string | string[])[] | undefined
  const missingGroups: string[][] = normalizePermissionGroups(missingRaw, normalizeScope)
  const missingGroupsCount = missingGroups.filter(g => g.length > 0).length

  // Build required groups using the same double-list semantics
  const requiredGroups: string[][] = normalizePermissionGroups(
    permissionDetails.requiredPermissions && permissionDetails.requiredPermissions.length > 0
      ? permissionDetails.requiredPermissions
      : permissionDetails.requiredPermission,
    normalizeScope
  )

  return (
    <div className="space-y-6 pt-6 border-t border-border/50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold text-sm">Permission Analysis</span>
        </div>
        {missingGroupsCount > 0 && (
          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30">
            {missingGroupsCount} missing
          </Badge>
        )}
      </div>

      {/* Permission Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Required Permission */}
        <Card className="border border-border/50 bg-card/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Required</span>
            </div>
            <div className="min-h-[2rem] w-full">
              {requiredGroups.length > 0 ? (
                <div className="flex flex-col gap-2 w-full">
                  {requiredGroups.map((group, gi) => (
                    group.length > 1 ? (
                      <div key={`req-grp-${gi}`} className="flex flex-wrap items-center gap-1">
                        {group.map((p, idx) => (
                          <span key={`${p}-${idx}`} className="flex items-center gap-1">
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30 text-xs font-medium px-2 py-1">
                              {p}
                            </Badge>
                            {idx < group.length - 1 && (
                              <span className="text-[10px] text-muted-foreground mx-1">OR</span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div key={`req-grp-${gi}`} className="flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30 text-xs font-medium px-2 py-1">
                          {group[0]}
                        </Badge>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">No specific permission required</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Permissions */}
        <Card className="border border-border/50 bg-card/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current</span>
              <Badge variant="secondary" className="text-xs ml-auto">
                {requiredPerms.length}
              </Badge>
            </div>
            <div className="min-h-[2rem] w-full">
              {requiredPerms.length > 0 ? (
                <div className="flex flex-wrap gap-1 w-full">
                  {requiredPerms.map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 px-2 py-1">
                      {p}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">No permissions granted</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Missing Permissions */}
        <Card className="border border-border/50 bg-card/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Missing</span>
              <Badge variant="destructive" className="text-xs">
                {missingGroupsCount}
              </Badge>
            </div>
            <div className="min-h-[2rem] w-full">
              {missingGroupsCount > 0 ? (
                <div className="flex flex-col gap-2 w-full">
                  {missingGroups.map((group, gi) => (
                    group.length > 1 ? (
                      <div key={`grp-${gi}`} className="flex flex-wrap items-center gap-1">
                        {group.map((p, idx) => (
                          <span key={`${p}-${idx}`} className="flex items-center gap-1">
                            <Badge variant="destructive" className="text-xs bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30 px-2 py-1">
                              {p}
                            </Badge>
                            {idx < group.length - 1 && (
                              <span className="text-[10px] text-muted-foreground mx-1">OR</span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div key={`grp-${gi}`} className="flex flex-wrap items-center gap-1">
                        <Badge variant="destructive" className="text-xs bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30 px-2 py-1">
                          {group[0]}
                        </Badge>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">All permissions granted</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Details */}
      <div className="space-y-3">
        {permissionDetails.error && (
          <Alert variant="destructive" className="border-red-500/30 bg-red-500/10 dark:bg-red-500/20 dark:border-red-500/40">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <AlertDescription className="text-sm text-red-800 dark:text-red-200">
                <strong className="font-semibold">Error:</strong> {permissionDetails.error}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {permissionDetails.details && (
          <Alert className="border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5" />
              <AlertDescription className="text-sm text-muted-foreground">
                {permissionDetails.details}
              </AlertDescription>
            </div>
          </Alert>
        )}
      </div>
    </div>
  )
}

// Endpoint Card Component
const EndpointCard = ({
  endpoint,
  test,
  onTestPermissions,
  accessSummary,
  normalizeScope,
  normalizeScopes,
  copyToClipboard,
  expandedResponses,
  setExpandedResponses
}: {
  endpoint: EndpointInfo
  test?: EndpointTest
  onTestPermissions: (endpoint: EndpointInfo) => void
  accessSummary: (test?: EndpointTest) => { label: string, variant: any }
  normalizeScope: (s?: string) => string | undefined
  normalizeScopes: (arr?: string[]) => string[]
  copyToClipboard: (text: string) => Promise<void>
  expandedResponses: Record<string, boolean>
  setExpandedResponses: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}) => {
  const key = `${endpoint.method}:${endpoint.path}`
  const summary = accessSummary(test)

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <MethodBadge method={endpoint.method} />
              <code className="text-sm font-mono text-muted-foreground truncate">
                {endpoint.path}
              </code>
            </div>
            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusIndicator
              status={
                summary.label === 'Granted' ? 'success' :
                summary.label === 'Forbidden' ? 'error' :
                summary.label === 'Auth Required' ? 'warning' : 'info'
              }
              label={summary.label}
            />
            {endpoint.requiresAuth && (
              <div className="flex items-center gap-1">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Auth Required</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick permission preview (uses same group semantics) */}
        {(test?.permissionDetails?.requiredPermissions || test?.permissionDetails?.requiredPermission) && (
          <div className="flex items-center gap-2 pt-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Requires:</span>
            <div className="flex flex-col gap-1">
              {normalizePermissionGroups(
                test?.permissionDetails?.requiredPermissions?.length
                  ? test.permissionDetails.requiredPermissions
                  : test?.permissionDetails?.requiredPermission,
                normalizeScope
              ).map((group, gi) => (
                <div key={`req-mini-${gi}`} className="flex flex-wrap items-center gap-1">
                  {group.map((p, idx) => (
                    <span key={`${p}-${idx}`} className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30 px-2 py-1">
                        {p}
                      </Badge>
                      {idx < group.length - 1 && (
                        <span className="text-[10px] text-muted-foreground mx-1">OR</span>
                      )}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <Button
          size="sm"
          onClick={() => onTestPermissions(endpoint)}
          disabled={test?.isTesting}
          className="w-full"
        >
          {test?.isTesting ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Test Permissions
            </>
          )}
        </Button>

        {test?.lastTested && (
          <div className="space-y-3">
            {/* Test Results Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Unauthorized</span>
                  </div>
                  <Badge
                    variant={test.unauthorizedStatus === 401 ? "destructive" : test.unauthorizedStatus === 200 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {test.unauthorizedStatus}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {test.unauthorizedStatus === 401 ? 'Authentication required' : 'Public access'}
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Authorized</span>
                  </div>
                  {typeof test.authorizedStatus === 'number' && (
                    <Badge
                      variant={test.authorizedStatus === 200 ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {test.authorizedStatus}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {test.authorizedStatus === 200 ? 'Access granted' :
                   test.authorizedStatus && test.authorizedStatus >= 400 ? 'Access denied' : 'Not tested'}
                </div>
              </div>
            </div>

            {/* Detailed Permission Information */}
            <PermissionDetails
              permissionDetails={test.permissionDetails}
              normalizeScope={normalizeScope}
              normalizeScopes={normalizeScopes}
              copyToClipboard={copyToClipboard}
            />

            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Last tested: {test.lastTested.toLocaleTimeString()}
            </div>

            {/* Raw Response Viewer */}
            <Collapsible
              open={expandedResponses[key] || false}
              onOpenChange={(open) => setExpandedResponses(prev => ({ ...prev, [key]: open }))}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    {expandedResponses[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span>View Raw Responses</span>
                  </div>
                  {expandedResponses[key] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Unauthorized Response</span>
                    </div>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-40">
                      {JSON.stringify(test.unauthorizedResponse, null, 2)}
                    </pre>
                  </div>
                  {test.authorizedResponse && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Authorized Response</span>
                      </div>
                      <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-40">
                        {JSON.stringify(test.authorizedResponse, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Category Status Summary Component
const CategoryStatusSummary = ({
  endpoints,
  endpointTests
}: {
  endpoints: EndpointInfo[]
  endpointTests: Record<string, EndpointTest>
}) => {
  // Calculate status counts
  const statusCounts = endpoints.reduce(
    (acc, endpoint) => {
      const test = endpointTests[`${endpoint.method}:${endpoint.path}`]
      if (!test || !test.lastTested) {
        acc.untested++
        return acc
      }

      // Use authorized status if available, otherwise unauthorized
      const status = test.authorizedStatus ?? test.unauthorizedStatus ?? 0

      if (status === null || status === undefined) {
        acc.untested++
      } else if (status >= 200 && status < 300) {
        acc.success++
      } else if (status >= 400 && status < 500) {
        acc.clientError++
      } else if (status >= 500) {
        acc.serverError++
      } else {
        acc.untested++
      }

      return acc
    },
    { success: 0, clientError: 0, serverError: 0, untested: 0 }
  )

  const total = endpoints.length
  const tested = total - statusCounts.untested

  if (tested === 0) {
    return (
      <div className="flex items-center gap-4">
        {/* Empty Status Bar */}
        <div className="flex-1 flex h-2 bg-muted rounded-full overflow-hidden">
          <div className="flex-1 bg-muted-foreground/20" />
        </div>

        {/* Status Counts */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
            <span className="text-muted-foreground">
              {total} pending
            </span>
          </div>
        </div>
      </div>
    )
  }

  const successPercent = (statusCounts.success / tested) * 100
  const clientErrorPercent = (statusCounts.clientError / tested) * 100
  const serverErrorPercent = (statusCounts.serverError / tested) * 100

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4">
        {/* Status Bar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex-1 flex h-2 bg-muted rounded-full overflow-hidden cursor-help">
              {statusCounts.success > 0 && (
                <div
                  className="bg-green-500 transition-all duration-300"
                  style={{ width: `${successPercent}%` }}
                />
              )}
              {statusCounts.clientError > 0 && (
                <div
                  className="bg-red-500 transition-all duration-300"
                  style={{ width: `${clientErrorPercent}%` }}
                />
              )}
              {statusCounts.serverError > 0 && (
                <div
                  className="bg-purple-500 transition-all duration-300"
                  style={{ width: `${serverErrorPercent}%` }}
                />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div className="font-semibold mb-1">Test Results Summary</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>Allowed (2xx): {statusCounts.success}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span>Not allowed (4xx): {statusCounts.clientError}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span>Errors (5xx): {statusCounts.serverError}</span>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Status Counts */}
        <div className="flex items-center gap-3 text-xs">
          {statusCounts.success > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {statusCounts.success}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span>Allowed (2xx responses)</span>
              </TooltipContent>
            </Tooltip>
          )}
          {statusCounts.clientError > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {statusCounts.clientError}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span>Not allowed (4xx responses)</span>
              </TooltipContent>
            </Tooltip>
          )}
          {statusCounts.serverError > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {statusCounts.serverError}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span>Server errors (5xx responses)</span>
              </TooltipContent>
            </Tooltip>
          )}
          {statusCounts.untested > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <div className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
                  <span className="text-muted-foreground">
                    {statusCounts.untested} pending
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <span>Endpoints not yet tested</span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

// Category Section Component
const CategorySection = ({
  category,
  endpoints,
  endpointTests,
  onTestPermissions,
  accessSummary,
  normalizeScope,
  normalizeScopes,
  copyToClipboard,
  expandedResponses,
  setExpandedResponses,
  collapsedCategories,
  toggleCategory
}: {
  category: string
  endpoints: EndpointInfo[]
  endpointTests: Record<string, EndpointTest>
  onTestPermissions: (endpoint: EndpointInfo) => void
  accessSummary: (test?: EndpointTest) => { label: string, variant: any }
  normalizeScope: (s?: string) => string | undefined
  normalizeScopes: (arr?: string[]) => string[]
  copyToClipboard: (text: string) => Promise<void>
  expandedResponses: Record<string, boolean>
  setExpandedResponses: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  collapsedCategories: Record<string, boolean>
  toggleCategory: (category: string) => void
}) => {
  const CategoryIcon = CATEGORY_ICONS[category] || Settings
  const isCollapsed = collapsedCategories[category] || false

  return (
    <Collapsible open={!isCollapsed} onOpenChange={() => toggleCategory(category)}>
      <div className="space-y-4">
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer hover:bg-muted/30 -mx-4 px-4 py-2 rounded-lg transition-colors">
            <div className="flex items-center gap-3 pb-2">
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
              )}
              <CategoryIcon className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-xl font-semibold">{category}</h3>
              <Badge variant="secondary" className="ml-auto">
                {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {/* Status Summary - Always visible */}
            {isCollapsed && (
              <div className="mt-2">
                <CategoryStatusSummary
                  endpoints={endpoints}
                  endpointTests={endpointTests}
                />
              </div>
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4">
          {/* Status Summary - When expanded, show in content area */}
          {!isCollapsed && (
            <div className="px-4 py-2 bg-muted/20 rounded-lg border">
              <CategoryStatusSummary
                endpoints={endpoints}
                endpointTests={endpointTests}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {endpoints.map(endpoint => (
              <EndpointCard
                key={`${endpoint.method}:${endpoint.path}`}
                endpoint={endpoint}
                test={endpointTests[`${endpoint.method}:${endpoint.path}`]}
                onTestPermissions={onTestPermissions}
                accessSummary={accessSummary}
                normalizeScope={normalizeScope}
                normalizeScopes={normalizeScopes}
                copyToClipboard={copyToClipboard}
                expandedResponses={expandedResponses}
                setExpandedResponses={setExpandedResponses}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

const ENDPOINTS: EndpointInfo[] = [
  // Health endpoints
  { path: '/api/health', method: 'GET', description: 'Health check endpoint', category: 'System', requiresAuth: false },
  // Metrics endpoints
  { path: '/api/metrics', method: 'GET', description: 'Get system metrics', category: 'System', requiresAuth: true },
  
  // Admin endpoints
  { path: '/api/admin/check-access', method: 'GET', description: 'Check admin access', category: 'Admin', requiresAuth: true },
  { path: '/api/admin/plans', method: 'GET', description: 'List all subscription plans', category: 'Admin', requiresAuth: true },
  { path: '/api/admin/plans', method: 'POST', description: 'Create new subscription plan', category: 'Admin', requiresAuth: true },
  { path: '/api/admin/plans/:slug/activate', method: 'POST', description: 'Activate a plan', category: 'Admin', requiresAuth: true },
  { path: '/api/admin/plans/:slug/deactivate', method: 'POST', description: 'Deactivate a plan', category: 'Admin', requiresAuth: true },
  
  // User endpoints
  { path: '/api/me/subscription', method: 'GET', description: 'Get user subscription info', category: 'User', requiresAuth: true },
  
  // Plans endpoints
  { path: '/api/plans', method: 'GET', description: 'List available plans', category: 'Plans', requiresAuth: false },
  
  // Bazaar endpoints
  { path: '/api/bazaar/items', method: 'GET', description: 'Get bazaar items', category: 'Bazaar', requiresAuth: true },
  { path: '/api/bazaar/items/DIAMOND_SPREADING', method: 'GET', description: 'Get specific bazaar item', category: 'Bazaar', requiresAuth: true },
  { path: '/api/bazaar/items/DIAMOND_SPREADING/history', method: 'GET', description: 'Get item price history', category: 'Bazaar', requiresAuth: true },
  
  // Skyblock endpoints
  { path: '/api/skyblock/items', method: 'GET', description: 'Get skyblock items', category: 'Skyblock', requiresAuth: true },
  
  // Strategies endpoints
  { path: '/api/strategies/flipping', method: 'GET', description: 'Get flipping strategies', category: 'Strategies', requiresAuth: false }
]

export default function AdminEndpointsPage() {
  const { isAuthenticated, getAccessTokenSilently, isLoading: authLoading, user, error: auth0Error } = useAuth0()
  const { toast } = useToast()
  const [endpointTests, setEndpointTests] = useState<Record<string, EndpointTest>>({})
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('')
  const [requestMethod, setRequestMethod] = useState<string>('GET')
  const [requestBody, setRequestBody] = useState<string>('')
  const [requestHeaders, setRequestHeaders] = useState<string>('')
  const [isMakingRequest, setIsMakingRequest] = useState(false)
  const [lastResponse, setLastResponse] = useState<any>(null)
  const [expandedResponses, setExpandedResponses] = useState<Record<string, boolean>>({})
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  const normalizeScope = (s?: string) => (s ? s.replace(/^SCOPE_/, '') : s)
  const normalizeScopes = (arr?: string[]) => (arr ? arr.map(p => normalizeScope(p)!) : [])

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: 'Copied', description: text })
    } catch (e) {
      toast({ title: 'Copy failed', description: 'Could not copy to clipboard', variant: 'destructive' })
    }
  }

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const accessSummary = (test?: EndpointTest) => {
    if (!test || !test.lastTested) return { label: 'Untested', variant: 'outline' as const }

    // Prioritize authorized status if available
    if (typeof test.authorizedStatus === 'number') {
      if (test.authorizedStatus === 200) return { label: 'Granted', variant: 'default' as const }
      if (test.authorizedStatus >= 400) return { label: 'Forbidden', variant: 'destructive' as const }
    }

    // Fall back to unauthorized status analysis
    if (test.unauthorizedStatus === 401) return { label: 'Auth Required', variant: 'secondary' as const }
    if (test.unauthorizedStatus === 200) return { label: 'Public Access', variant: 'default' as const }
    if (test.unauthorizedStatus && test.unauthorizedStatus >= 400) return { label: 'Error', variant: 'destructive' as const }

    return { label: 'Unknown', variant: 'outline' as const }
  }

  // Use the admin access hook
  const { hasAdminAccess, loading: adminLoading, error } = useAdminAccess()

  // Initialize endpoint tests
  useEffect(() => {
    const initialTests: Record<string, EndpointTest> = {}
    ENDPOINTS.forEach(endpoint => {
      const key = `${endpoint.method}:${endpoint.path}`
      initialTests[key] = {
        path: endpoint.path,
        method: endpoint.method,
        isTesting: false
      }
    })
    setEndpointTests(initialTests)
  }, [])

  const testEndpointPermissions = useCallback(async (endpoint: EndpointInfo) => {
    const key = `${endpoint.method}:${endpoint.path}`
    setEndpointTests(prev => ({
      ...prev,
      [key]: { ...prev[key], isTesting: true }
    }))

    try {
      // Prepare request body for POST endpoints that need validation
      const getTestRequestBody = (method: string, path: string) => {
        if (method === 'POST' && path === '/api/admin/plans') {
          return JSON.stringify({
            slug: 'test-plan',
            name: 'Test Plan',
            stripePriceId: 'price_test123',
            featuresJson: '{"features": ["test"]}',
            active: false
          })
        }
        return undefined
      }

      const testRequestBody = getTestRequestBody(endpoint.method, endpoint.path)

      // Test unauthorized access (no auth header)
      const noAuthResponse = await fetch(endpoint.path, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: testRequestBody
      })

      let noAuthData = null
      try {
        noAuthData = await noAuthResponse.json()
      } catch {
        try {
          noAuthData = await noAuthResponse.text()
        } catch {
          noAuthData = null
        }
      }

      // Test authorized access if user is authenticated
      let authorizedData: any = null
      let authorizedStatus: number | null = null
      let permissionDetailsAuthorized: EndpointTest["permissionDetails"] = null
      let permissionDetailsUnauthorized: EndpointTest["permissionDetails"] = null

      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently()
          const authorizedResponse = await fetch(endpoint.path, {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: testRequestBody
          })
          
          authorizedStatus = authorizedResponse.status
          
          try {
            authorizedData = await authorizedResponse.json()
          } catch {
            try {
              authorizedData = await authorizedResponse.text()
            } catch {
              authorizedData = null
            }
          }

          // Extract permission details from error responses (authorized)
          if (authorizedResponse.status >= 400) {
            if (authorizedData && typeof authorizedData === 'object') {
              const requiredList = Array.isArray(authorizedData.requiredPermissions) ? authorizedData.requiredPermissions : undefined
              const requiredLabel = requiredList && requiredList.length > 0
                ? requiredList.join(' OR ')
                : authorizedData.requiredPermission
              permissionDetailsAuthorized = {
                requiredPermission: requiredLabel,
                requiredPermissions: requiredList,
                currentPermissions: authorizedData.currentPermissions,
                missingPermissions: authorizedData.missingPermissions,
                error: authorizedData.error,
                details: authorizedData.details
              }
            }
          }
        } catch (error) {
          console.error('Error testing authorized access:', error)
        }
      }

      // Extract permission details from unauthorized responses
      if (noAuthResponse.status >= 400) {
        if (noAuthData && typeof noAuthData === 'object') {
          const requiredList = Array.isArray(noAuthData.requiredPermissions) ? noAuthData.requiredPermissions : undefined
          const requiredLabel = requiredList && requiredList.length > 0
            ? requiredList.join(' OR ')
            : noAuthData.requiredPermission
          permissionDetailsUnauthorized = {
            requiredPermission: requiredLabel,
            requiredPermissions: requiredList,
            currentPermissions: noAuthData.currentPermissions,
            missingPermissions: noAuthData.missingPermissions,
            error: noAuthData.error,
            details: noAuthData.details
          }
        }
      }

      // Prefer authorized permission details; fall back to unauthorized if available
      const permissionDetails = permissionDetailsAuthorized || permissionDetailsUnauthorized || null

      setEndpointTests(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          unauthorizedStatus: noAuthResponse.status,
          unauthorizedResponse: noAuthData,
          authorizedStatus,
          authorizedResponse: authorizedData,
          permissionDetails,
          lastTested: new Date(),
          isTesting: false
        }
      }))

      toast({
        title: "Permission Test Complete",
        description: `Tested ${endpoint.method} ${endpoint.path}`,
      })

    } catch (error) {
      console.error('Error testing endpoint:', error)
      setEndpointTests(prev => ({
        ...prev,
        [key]: { ...prev[key], isTesting: false }
      }))
      
      toast({
        title: "Test Failed",
        description: `Failed to test ${endpoint.method} ${endpoint.path}`,
        variant: "destructive"
      })
    }
  }, [isAuthenticated, getAccessTokenSilently, toast])

  const [isTestingAll, setIsTestingAll] = useState(false)
  const [testingProgress, setTestingProgress] = useState(0)

  const testAllEndpoints = useCallback(async () => {
    setIsTestingAll(true)
    setTestingProgress(0)
    
    for (let i = 0; i < ENDPOINTS.length; i++) {
      const endpoint = ENDPOINTS[i]
      await testEndpointPermissions(endpoint)
      
      // Update progress
      const progress = ((i + 1) / ENDPOINTS.length) * 100
      setTestingProgress(progress)
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    setIsTestingAll(false)
    setTestingProgress(0)
  }, [testEndpointPermissions])

  const makeRequest = async () => {
    if (!selectedEndpoint) {
      toast({
        title: "Error",
        description: "Please select an endpoint first",
        variant: "destructive"
      })
      return
    }

    setIsMakingRequest(true)
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      // Parse custom headers
      if (requestHeaders.trim()) {
        try {
          const parsedHeaders = JSON.parse(requestHeaders)
          Object.assign(headers, parsedHeaders)
        } catch (error) {
          toast({
            title: "Invalid Headers",
            description: "Headers must be valid JSON",
            variant: "destructive"
          })
          return
        }
      }

      // Add auth token if user is authenticated
      if (isAuthenticated) {
        const token = await getAccessTokenSilently()
        headers['Authorization'] = `Bearer ${token}`
      }

      const options: RequestInit = {
        method: requestMethod,
        headers
      }

      // Add body for non-GET requests
      if (requestMethod !== 'GET' && requestBody.trim()) {
        try {
          options.body = requestBody
        } catch (error) {
          toast({
            title: "Invalid Body",
            description: "Request body must be valid",
            variant: "destructive"
          })
          return
        }
      }

      const response = await fetch(selectedEndpoint, options)
      let responseData = null
      
      try {
        responseData = await response.json()
      } catch {
        responseData = await response.text()
      }

      setLastResponse({
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      })

      toast({
        title: "Request Complete",
        description: `Status: ${response.status} ${response.statusText}`,
      })

    } catch (error) {
      console.error('Error making request:', error)
      toast({
        title: "Request Failed",
        description: "Failed to make request",
        variant: "destructive"
      })
    } finally {
      setIsMakingRequest(false)
    }
  }

  // Show loading while Auth0 is initializing
  if (authLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Admin - API Endpoints</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Admin - API Endpoints</h2>
        <div className="space-y-4">
          <p>You need to login to access this page.</p>
          {auth0Error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">Auth0 Error: {auth0Error.message}</p>
            </div>
          )}
          <div className="pt-4">
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              size="sm"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Admin - API Endpoints</h2>
        <p className="text-red-500">Error: {error}</p>
      </div>
    )
  }

  // Show loading state while checking admin access OR if still loading
  if (adminLoading || (!hasAdminAccess && !error)) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Admin - API Endpoints</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Only show access denied if we're sure the user doesn't have access
  if (!hasAdminAccess && error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Admin - API Endpoints</h2>
        <p className="text-red-500">Access denied. You don't have admin permissions.</p>
      </div>
    )
  }

  const categories = [...new Set(ENDPOINTS.map(e => e.category))]

    return (
    <div className="space-y-8">
      {/* Enhanced Header Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-muted-foreground" />
            <div>
              <h2 className="text-3xl font-bold tracking-tight">API Endpoints</h2>
              <p className="text-muted-foreground">Test permissions, validate access, and debug API endpoints</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Button 
                onClick={testAllEndpoints} 
                variant="outline" 
                className="gap-2 relative overflow-hidden"
                disabled={isTestingAll}
              >
                {/* Progress Bar Background */}
                {isTestingAll && (
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-200/30 to-yellow-200/30" />
                )}
                
                {/* Progress Bar Fill */}
                {isTestingAll && (
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-amber-300/60 to-yellow-300/60 transition-all duration-300 ease-out"
                    style={{ 
                      width: `${testingProgress}%`,
                      transition: 'width 0.3s ease-out'
                    }}
                  />
                )}
                
                {/* Content */}
                <div className="relative z-10 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  {isTestingAll ? 'Testing...' : 'Test All Endpoints'}
                </div>
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsedCategories({})}
                className="h-8 px-3 text-xs"
              >
                <ChevronDown className="h-3 w-3 mr-1" />
                Expand All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const allCollapsed = categories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
                  setCollapsedCategories(allCollapsed)
                }}
                className="h-8 px-3 text-xs"
              >
                <ChevronRight className="h-3 w-3 mr-1" />
                Collapse All
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>{ENDPOINTS.length} endpoints across {categories.length} categories</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="endpoints" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="endpoints" className="gap-2">
            <Settings className="h-4 w-4" />
            Endpoints & Permissions
          </TabsTrigger>
          <TabsTrigger value="tester" className="gap-2">
            <Play className="h-4 w-4" />
            Request Tester
          </TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-8 mt-6">
          {categories.map(category => (
            <CategorySection
              key={category}
              category={category}
              endpoints={ENDPOINTS.filter(endpoint => endpoint.category === category)}
              endpointTests={endpointTests}
              onTestPermissions={testEndpointPermissions}
              accessSummary={accessSummary}
              normalizeScope={normalizeScope}
              normalizeScopes={normalizeScopes}
              copyToClipboard={copyToClipboard}
              expandedResponses={expandedResponses}
              setExpandedResponses={setExpandedResponses}
              collapsedCategories={collapsedCategories}
              toggleCategory={toggleCategory}
            />
          ))}
        </TabsContent>

        <TabsContent value="tester" className="space-y-6">
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <Play className="h-6 w-6 text-muted-foreground" />
                <div>
                  <CardTitle className="text-xl">API Request Tester</CardTitle>
                  <p className="text-sm text-muted-foreground">Make custom requests to test endpoints directly</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="endpoint" className="text-sm font-medium flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Endpoint
                  </Label>
                  <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select an endpoint to test" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENDPOINTS.map(endpoint => (
                        <SelectItem key={`${endpoint.method}:${endpoint.path}`} value={endpoint.path}>
                          <div className="flex items-center gap-2">
                            <MethodBadge method={endpoint.method} />
                            <span className="font-mono text-sm">{endpoint.path}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method" className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    HTTP Method
                  </Label>
                  <Select value={requestMethod} onValueChange={setRequestMethod}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">
                        <div className="flex items-center gap-2">
                          <MethodBadge method="GET" />
                          <span>GET</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="POST">
                        <div className="flex items-center gap-2">
                          <MethodBadge method="POST" />
                          <span>POST</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="PUT">
                        <div className="flex items-center gap-2">
                          <MethodBadge method="PUT" />
                          <span>PUT</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="DELETE">
                        <div className="flex items-center gap-2">
                          <MethodBadge method="DELETE" />
                          <span>DELETE</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="PATCH">
                        <div className="flex items-center gap-2">
                          <MethodBadge method="PATCH" />
                          <span>PATCH</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="headers" className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Custom Headers (JSON)
                </Label>
                <Textarea
                  id="headers"
                  placeholder='{"X-Custom-Header": "value", "Authorization": "Bearer token"}'
                  value={requestHeaders}
                  onChange={(e) => setRequestHeaders(e.target.value)}
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>

              {requestMethod !== 'GET' && (
                <div className="space-y-2">
                  <Label htmlFor="body" className="text-sm font-medium flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Request Body
                  </Label>
                  <Textarea
                    id="body"
                    placeholder="Request body content (JSON, text, etc.)"
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    rows={6}
                    className="font-mono text-sm"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={makeRequest}
                  disabled={isMakingRequest || !selectedEndpoint}
                  size="lg"
                  className="gap-2"
                >
                  {isMakingRequest ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Making Request...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Make Request
                    </>
                  )}
                </Button>
              </div>

              {lastResponse && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {lastResponse.status >= 400 ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      <h4 className="font-semibold text-lg">Last Response</h4>
                    </div>
                    <Badge
                      variant={lastResponse.status >= 400 ? "destructive" : "default"}
                      className="text-sm px-3 py-1"
                    >
                      {lastResponse.status} {lastResponse.statusText}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Headers</span>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-4">
                        <pre className="text-xs overflow-auto max-h-40 font-mono">
                          {JSON.stringify(lastResponse.headers, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Response Body</span>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-4">
                        <pre className="text-xs overflow-auto max-h-40 font-mono">
                          {JSON.stringify(lastResponse.data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
