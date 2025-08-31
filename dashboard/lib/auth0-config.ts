export const auth0Config = {
  domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN || '',
  clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '',
  authorizationParams: {
    redirect_uri: process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI || 
                  (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : ''),
    audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || '',
    scope: 'openid profile email'
  },
  // Custom login page configuration
  cacheLocation: 'localStorage',
  useRefreshTokens: true,
  // Custom login page URL
  customLoginPage: '/login'
}

// Discord connection configuration
export const discordConfig = {
  connection: 'discord',
  scope: 'identify email',
  prompt: 'consent'
}

// Available social connections
export const socialConnections = [
  'discord',
  'github',
  'google-oauth2',
//   'auth0' // For email/password
] as const

export type SocialConnection = typeof socialConnections[number]

