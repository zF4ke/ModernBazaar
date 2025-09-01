"use client"

import { ReactNode } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, LogIn, ArrowRight } from "lucide-react"
import Link from "next/link"
import { GradientSection } from "@/components/gradient-section"

interface LoginCheckProps {
  // Feature name for display
  featureName: string
  // Feature description
  featureDescription: string
  // Icon component for the feature
  icon: ReactNode
  // Children to render when user is authenticated
  children: ReactNode
}

export function LoginCheck({
  featureName,
  featureDescription,
  icon,
  children
}: LoginCheckProps) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0()

  // Show loading state
  if (isLoading) {
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
        
        <div className="w-full">
          <div className="text-center rounded-xl border border-border/40 bg-background relative overflow-hidden min-h-[calc(100vh-27vh)] flex flex-col justify-center">
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-foreground">Loading...</h2>
                  <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
                    Please wait while we verify your authentication status
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show login prompt for unauthenticated users
  if (!isAuthenticated) {
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

                                                     <div>
                 <div className="absolute inset-0 pointer-events-none" style={{
                   background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.01) 0%, rgba(100, 100, 100, 0.01) 30%, transparent 70%)'
                 }}></div>
                 <div className="absolute inset-0 pointer-events-none" style={{
                   background: 'radial-gradient(ellipse at top right, rgba(255, 255, 255, 0.005) 0%, rgba(255, 255, 255, 0.0) 40%, transparent 70%)'
                 }}></div>
                 <div className="absolute inset-0 pointer-events-none" style={{
                   background: 'radial-gradient(ellipse at bottom left, rgba(255, 255, 255, 0.005) 0%, rgba(255, 255, 255, 0.0) 40%, transparent 70%)'
                 }}></div>
               </div>
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
                  <LogIn className="h-10 w-10 text-primary" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-bold text-foreground">Sign In Required</h2>
                  <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
                    Please sign in to access our powerful trading tools and features
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  onClick={() => loginWithRedirect()} 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg px-8 py-3 text-base font-medium text-white"
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign In
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <Button variant="ghost" size="lg" asChild className="text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200 px-6 py-3">
                  <Link href="/dashboard">
                    Back to Dashboard
                  </Link>
                </Button>
              </div>
              
              <div className="max-w-lg mx-auto p-4 rounded-lg bg-muted/20 border border-border/30">
                <div className="flex items-start gap-3 text-left">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    You need to be signed in to access {featureName}. Once you sign in, you'll be able to use all our premium trading features and tools.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // User is authenticated - render children
  return <>{children}</>
}
