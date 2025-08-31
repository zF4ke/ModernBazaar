"use client"

import { useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Github, 
  ArrowRight
} from 'lucide-react'

export default function CustomLoginPage() {
  const { loginWithRedirect } = useAuth0()
  const [isLoading, setIsLoading] = useState(false)

  const handleSocialLogin = async (connection: string) => {
    setIsLoading(true)
    try {
      await loginWithRedirect({
        authorizationParams: {
          connection,
          // Explicitly include audience so Auth0 issues a Refresh Token
          audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
          scope: 'openid profile email offline_access'
        },
        appState: { returnTo: '/dashboard' }
      })
    } catch (error) {
      console.error('Login error:', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'rgb(10, 10, 10)'
    }}>
      <div className="w-full max-w-sm space-y-6">
        {/* Login Card */}
        <Card className="border border-white/10 backdrop-blur-sm shadow-2xl" style={{
          background: 'radial-gradient(ellipse at top left, rgba(255,255,255,0.025) 0%, transparent 55%), radial-gradient(ellipse at bottom right, rgba(255,255,255,0.02) 0%, transparent 55%)',
          backgroundColor: 'rgba(255,255,255,0.06)'
        }}>
          <CardHeader className="text-center space-y-3 pb-6">
            <CardTitle className="text-4xl font-bold tracking-tight text-white">Modern Bazaar</CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Choose your login method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 mt-2">
            {/* Discord Login */}
            <Button
              onClick={() => handleSocialLogin('discord')}
              disabled={isLoading}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white border-0 h-12 text-base font-medium transition-all duration-200 active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Continue with Discord
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>

            <Separator className="bg-white/20" />

            {/* Other Social Options */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleSocialLogin('github')}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="h-11 border-white/20 text-white hover:bg-white/10 hover:border-white/30 transition-all duration-200 active:scale-[0.98] bg-[#24292e] hover:bg-[#2f363d] border-[#444d56] hover:border-[#586069] shadow-md hover:shadow-lg"
              >
                <Github className="h-4 w-4 mr-2" />
                GitHub
              </Button>
              <Button
                onClick={() => handleSocialLogin('google-oauth2')}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="h-11 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-700 transition-all duration-200 active:scale-[0.98] bg-white hover:border-gray-400 shadow-md hover:shadow-lg"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
