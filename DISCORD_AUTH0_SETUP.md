# Discord + Auth0 Setup Guide

This guide will help you set up Discord authentication in Auth0 and configure your custom login page.

## 🎯 Prerequisites

- Auth0 account
- Discord Developer account
- Your application already configured in Auth0

## 🔧 Step 1: Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name (e.g., "Modern Bazaar")
4. Go to "OAuth2" section
5. Copy the **Client ID** and **Client Secret**

## 🔑 Step 2: Configure Discord OAuth2

In Discord Developer Portal:

1. **Redirects**: Add your Auth0 callback URL:
   ```
   https://YOUR_AUTH0_DOMAIN/login/callback
   ```

2. **Scopes**: Enable these scopes:
   - `identify` - Get user's username and avatar
   - `email` - Get user's email address

## 🌐 Step 3: Configure Auth0

### 3.1 Add Discord Social Connection

1. Go to Auth0 Dashboard → **Authentication** → **Social**
2. Click **Discord**
3. Fill in the details:
   - **Client ID**: Your Discord app client ID
   - **Client Secret**: Your Discord app client secret
   - **Callback URL**: `https://YOUR_AUTH0_DOMAIN/login/callback`

### 3.2 Configure Connection Settings

1. **Permissions**: Ensure these are enabled:
   - `openid`
   - `profile`
   - `email`

2. **Attributes**: Map Discord fields to Auth0:
   - `nickname` → `nickname`
   - `email` → `email`
   - `avatar` → `picture`

### 3.3 Update Application Settings

1. Go to **Applications** → Your App
2. **Allowed Callback URLs**: Add your custom login page
3. **Allowed Logout URLs**: Add your logout redirect
4. **Allowed Web Origins**: Add your domain

## 🚀 Step 4: Environment Variables

Update your `.env.local` file:

```bash
# Auth0 Configuration
NEXT_PUBLIC_AUTH0_DOMAIN=your-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
NEXT_PUBLIC_AUTH0_AUDIENCE=https://your-api.audience
NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3001

# Discord Configuration (if needed)
NEXT_PUBLIC_DISCORD_CLIENT_ID=your-discord-client-id
```

## 🎨 Step 5: Custom Login Page

The custom login page is already created at `/dashboard/app/login/page.tsx` with:

- **Discord Login**: Primary button with Discord branding
- **Email Login**: Traditional email/password
- **Other Social**: GitHub, Google options
- **Modern Design**: Matches your app's theme

## 🔄 Step 6: Update Auth0 Rules (Optional)

Create a rule to handle Discord user data:

```javascript
function (user, context, callback) {
  // If user logged in with Discord
  if (context.connection === 'discord') {
    // Set nickname from Discord
    if (user.nickname) {
      user.user_metadata = user.user_metadata || {};
      user.user_metadata.nickname = user.nickname;
    }
    
    // Set avatar from Discord
    if (user.picture && user.picture.includes('discord')) {
      user.user_metadata = user.user_metadata || {};
      user.user_metadata.avatar = user.picture;
    }
  }
  
  callback(null, user, context);
}
```

## 🧪 Step 7: Testing

1. **Start your app**: `npm run dev`
2. **Navigate to**: `/login`
3. **Test Discord login**: Click "Continue with Discord"
4. **Verify redirect**: Should redirect to Discord OAuth
5. **Check callback**: Should return to your app authenticated

## 🐛 Troubleshooting

### Common Issues:

1. **"Invalid redirect_uri"**
   - Check Discord OAuth2 redirect URLs
   - Verify Auth0 callback URLs

2. **"Connection not found"**
   - Ensure Discord connection is enabled in Auth0
   - Check connection name matches code

3. **"Scope not allowed"**
   - Verify Discord app has correct scopes
   - Check Auth0 connection permissions

### Debug Steps:

1. Check browser console for errors
2. Verify Auth0 logs in dashboard
3. Test with Auth0's test connection feature
4. Ensure all environment variables are set

## 📱 Usage in Code

```typescript
import { useAuth0 } from '@auth0/auth0-react'

const { loginWithRedirect } = useAuth0()

// Login with Discord
const handleDiscordLogin = () => {
  loginWithRedirect({
    connection: 'discord',
    appState: { returnTo: window.location.origin }
  })
}
```

## 🎉 Success!

Once configured, users can:
- Login with Discord (primary method)
- Use email/password as fallback
- Access all Auth0 features
- Have consistent user experience

## 🔒 Security Notes

- Discord tokens are handled by Auth0
- No sensitive data stored in your app
- Auth0 handles token refresh
- Users can disconnect Discord anytime

---

**Need Help?** Check Auth0's [Discord documentation](https://auth0.com/docs/connections/social/discord) for more details.
