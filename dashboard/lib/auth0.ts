import { Auth0Client } from "@auth0/nextjs-auth0/server"

/**
 * Server-side Auth0 client (nextjs-auth0 v4).
 *
 * Reads these from the environment automatically:
 *   AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET, APP_BASE_URL
 *
 * The access token is minted for the Spring backend API audience so the proxy
 * routes can forward it as a Bearer token. Sessions live in an encrypted cookie,
 * so the browser never handles the access token directly.
 */
export const auth0 = new Auth0Client({
  authorizationParameters: {
    scope: "openid profile email offline_access",
    audience: process.env.AUTH0_AUDIENCE,
  },
})
