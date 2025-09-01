"use client"

import { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Lock, Crown, ArrowRight, Info, Shield, RefreshCw, Sparkles, TrendingUp, BarChart3, LineChart, Activity, Target, Zap } from "lucide-react"
import Link from "next/link"
import { GradientSection } from "@/components/gradient-section"
import { FeatureCard } from "@/components/feature-card"

interface PermissionCheckProps {
  // Required permission to access the feature
  requiredPermission: string
  // Feature name for display
  featureName: string
  // Feature description
  featureDescription: string
  // Icon component for the feature
  icon: ReactNode
  // Whether user has admin access (for detailed error info)
  hasAdminAccess?: boolean
  // Whether user has the required permission
  hasPermission: boolean
  // Loading state
  loading?: boolean
  // Custom upgrade message
  upgradeMessage?: string
  // Custom admin error details
  adminErrorDetails?: ReactNode
  // Children to render when permission is granted
  children: ReactNode
}

export function PermissionCheck({
  requiredPermission,
  featureName,
  featureDescription,
  icon,
  hasAdminAccess = false,
  hasPermission,
  loading = false,
  upgradeMessage,
  adminErrorDetails,
  children
}: PermissionCheckProps) {
  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <GradientSection variant="hero" padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-muted/50 border">
              {icon}
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{featureName}</h1>
              <p className="text-muted-foreground">{featureDescription}</p>
            </div>
          </div>
        </GradientSection>
        
        <FeatureCard backgroundStyle="flat" blur="sm">
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </FeatureCard>
      </div>
    )
  }

  // Show permission denied for non-admin users
  if (!hasPermission && !hasAdminAccess) {
    return (
      <div className="space-y-6">
        <GradientSection variant="hero" padding="sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-muted/50 border">
              {icon}
            </div>
            <div className="space-y-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">{featureName}</h1>
              <p className="text-muted-foreground text-sm">{featureDescription}</p>
            </div>
          </div>
        </GradientSection>
        
        
        <div className="w-full">
          <div className="text-center rounded-xl border border-border/40 bg-background relative overflow-hidden min-h-[calc(100vh-27vh)] flex flex-col justify-center">
            {/* Trading Icons Background - diagonal lines with subtle glow */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              {(() => {
                const icons = [
                  { icon: TrendingUp, size: 'h-6 w-6', color: 'text-blue-400/30' },
                  { icon: BarChart3, size: 'h-6 w-6', color: 'text-blue-400/30' },
                  { icon: LineChart, size: 'h-6 w-6', color: 'text-blue-400/30' },
                  { icon: Activity,  size: 'h-6 w-6', color: 'text-blue-400/30' },
                  { icon: Target,    size: 'h-6 w-6', color: 'text-blue-400/30' },
                  { icon: Zap,       size: 'h-6 w-6', color: 'text-blue-400/30' }
                ];

                // Parallel diagonal lines (slash direction) across full card
                const lineCount = 7;
                const itemsPerLine = 7;
                const cMin = -12;   // TL border
                const cMax = 200; // BR border
                const cStep = (cMax - cMin) / (lineCount - 1);

                const positions: Array<{ top: string; left: string; iconIndex: number }> = [];

                // Keep center clear
                const exclude = { top: 40, bottom: 60, left: 40, right: 60 };

                for (let li = 0; li < lineCount; li++) {
                  const c = cMin + li * cStep;
                  const xMin = -12;
                  const xMax = 114;
                  const xStep = (xMax - xMin) / (itemsPerLine + 1);

                  for (let k = 1; k <= itemsPerLine; k++) {
                    const x = xMin + k * xStep;
                    const y = -x + c; // y = -x + c (45°)
                    if (x < 0 || x > 100 || y < 0 || y > 100) continue;
                    if (y >= exclude.top && y <= exclude.bottom && x >= exclude.left && x <= exclude.right) continue;

                    // Mix icon types along each line deterministically
                    const iconIndex = (li * 2 + k) % icons.length;
                    positions.push({ top: `${y}%`, left: `${x}%`, iconIndex });
                  }
                }

                return positions.map((pos, index) => {
                  const iconData = icons[pos.iconIndex];
                  const IconComponent = iconData.icon;

                  return (
                    <div
                      key={index}
                      className={`absolute ${iconData.size}`}
                      style={{
                        top: pos.top,
                        left: pos.left,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <IconComponent className={`${iconData.color} drop-shadow-[0_0_8px_rgba(59,130,246,0.4)] filter blur-[0.5px]`} />
                    </div>
                  );
                });
              })()}
            </div>
            <div>
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.04) 0%, rgba(59, 130, 246, 0.02) 40%, transparent 70%)'
              }}></div>
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at top right, rgba(59, 130, 246, 0.025) 0%, rgba(59, 130, 246, 0.0) 40%, transparent 70%)'
              }}></div>
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at top left, rgba(59, 130, 246, 0.0) 0%, rgba(59, 130, 246, 0.0) 40%, transparent 70%)'
              }}></div>
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at bottom left, rgba(59, 130, 246, 0.025) 0%, rgba(59, 130, 246, 0.0) 40%, transparent 70%)'
              }}></div>
            </div>
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
                  <Lock className="h-10 w-10 text-primary" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-foreground">Premium Feature</h2>
                  <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
                    Get access to our handcrafted bazaar tools with a premium subscription
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg px-8 py-3 text-base font-medium text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                  <Link href="/dashboard/profile">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Upgrade Plan
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                </Button>
                <Button variant="ghost" size="lg" asChild className="text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200 px-6 py-3">
                  <Link href="/dashboard">
                    Back to Dashboard
                  </Link>
                </Button>
              </div>
              
              <div className="max-w-lg mx-auto p-4 rounded-lg bg-muted/20 border border-border/30">
                <div className="flex items-start gap-3 text-left">
                  <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {upgradeMessage || `You need the "${requiredPermission}" permission to access ${featureName}. Upgrade your plan to unlock this powerful trading tool.`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show detailed error for admin users
  if (!hasPermission && hasAdminAccess) {
    return (
      <div className="space-y-6">
        <GradientSection variant="hero" padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-muted/50 border">
              {icon}
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{featureName}</h1>
              <p className="text-muted-foreground">{featureDescription}</p>
            </div>
          </div>
        </GradientSection>
        
        <FeatureCard backgroundStyle="glass" blur="sm" className="border-destructive/50 bg-destructive/5">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-destructive/20 border border-destructive/30">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-destructive">Permission Error</h2>
                <p className="text-muted-foreground">
                  Access denied despite admin privileges
                </p>
              </div>
            </div>
            
            <div className="space-y-4 p-4 rounded-lg bg-muted/50 border">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">Required Permission:</span>
                  <Badge variant="outline" className="font-mono text-xs bg-muted/50">
                    {requiredPermission}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">User Status:</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
                    Admin Access
                  </Badge>
                </div>
              </div>
            </div>
            
            {adminErrorDetails && (
              <div className="p-4 rounded-lg bg-muted/50 border">
                <h4 className="text-sm font-medium mb-3 text-foreground">Technical Details:</h4>
                <div className="text-sm text-muted-foreground">
                  {adminErrorDetails}
                </div>
              </div>
            )}
            
            <div className="flex flex-wrap gap-3 pt-4">
              <Button variant="outline" size="lg" onClick={() => location.reload()} className="transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Page
              </Button>
              <Button asChild size="lg" className="transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                <Link href="/dashboard">
                  <Shield className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </FeatureCard>
      </div>
    )
  }

  // Permission granted - render children
  return <>{children}</>
}
