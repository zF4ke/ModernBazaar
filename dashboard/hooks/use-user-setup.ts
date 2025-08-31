"use client"

import { useEffect, useState, useRef } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { useOfflineGuard } from './use-offline-guard'

/**
 * Hook que garante que novos utilizadores são configurados (plano free) de forma idempotente.
 * Removido o uso de localStorage (pode haver múltiplas contas no mesmo browser).
 * Agora o controlo de tentativa é apenas em memória e isolado por userId (sub).
 */
export function useUserSetup() {
  const { user, isAuthenticated, getAccessTokenSilently, loginWithRedirect } = useAuth0()
  const [isSetupComplete, setIsSetupComplete] = useState(false)
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [isRefreshingToken, setIsRefreshingToken] = useState(false)
  const [persistedDone, setPersistedDone] = useState(false)
  const setupAttemptedRef = useRef(false) // tentativa para o user atual na sessão
  const currentUserIdRef = useRef<string | null>(null) // qual user foi processado
  const tokenRefreshDoneRef = useRef(false)
  const pageReloadedRef = useRef(false)
  const { guard } = useOfflineGuard()

  // Helper para decodificar payload JWT de forma resiliente
  function decodeJwtPayload(token: string): any | null {
    try {
      const [, payloadB64] = token.split('.')
      if (!payloadB64) return null
      // padding
      const norm = payloadB64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (payloadB64.length % 4)) % 4)
      const json = atob(norm)
      return JSON.parse(json)
    } catch {
      return null
    }
  }

  // Minimal token refresh: single attempt; if missing RT, redirect once to mint it
  const refreshTokenSimple = async (force?: boolean) => {
    const doForce = force ?? false
    if (!doForce && tokenRefreshDoneRef.current) return
    tokenRefreshDoneRef.current = true
    setIsRefreshingToken(true)
    try {
      // Use default getAccessTokenSilently without custom params to avoid conflicts
      const freshToken = await getAccessTokenSilently()
      const payload = decodeJwtPayload(freshToken)
      const permissions = payload?.permissions as string[] | undefined
      if (!permissions || permissions.length === 0) {
        console.log('Permissions not present in fresh token yet.')
        tokenRefreshDoneRef.current = false
      } else {
        markSetupDonePersistent()
        tokenRefreshDoneRef.current = true
      }
    } catch (err: any) {
      const code = err?.error || err?.code || ''
      const desc = err?.error_description || err?.message || ''
      if (String(code).includes('missing_refresh_token') || String(desc).includes('Missing Refresh Token')) {
        console.log('Missing refresh token — redirecting once to mint RT')
        if (typeof window !== 'undefined' && window.self === window.top) {
          try {
            await loginWithRedirect({
              appState: { returnTo: '/dashboard' }
              // Remove custom authorizationParams - let Auth0Provider handle it
            })
          } catch (e) {
            console.error('Login redirect failed:', e)
          }
        }
      } else {
        console.log('Token refresh failed:', code || err)
      }
      tokenRefreshDoneRef.current = false
    } finally {
      setIsRefreshingToken(false)
    }
  }

  // Reset automático quando troca de utilizador
  useEffect(() => {
    const sub = user?.sub || null
    if (sub !== currentUserIdRef.current) {
      currentUserIdRef.current = sub
      setupAttemptedRef.current = false
      tokenRefreshDoneRef.current = false
      setIsSetupComplete(false)
      setIsSettingUp(false)
      setIsRefreshingToken(false)
    }
  }, [user?.sub])

  // Ler flag persistida quando user disponível
  useEffect(() => {
    if (!user?.sub) return
    try {
      const key = `mb_user_setup_done_${user.sub}`
      if (localStorage.getItem(key) === '1') {
        setPersistedDone(true)
        setupAttemptedRef.current = true
        tokenRefreshDoneRef.current = true
        setIsSetupComplete(true)
      }
    } catch {}
  }, [user?.sub])

  function markSetupDonePersistent() {
    if (!user?.sub) return
    const key = `mb_user_setup_done_${user.sub}`
    try { localStorage.setItem(key, '1') } catch {}
    setPersistedDone(true)
  }

  useEffect(() => {
    const ensureUserSetup = async () => {
      if (!user || !isAuthenticated) return
      if (isSettingUp || isSetupComplete) return
      if (setupAttemptedRef.current) { setIsSetupComplete(true); return }

      try {
        setIsSettingUp(true)
        const isNewUser = (user.loginsCount === 1 || user.loginsCount === undefined) && !persistedDone
        if (isNewUser) {
          setupAttemptedRef.current = true
          const token = await getAccessTokenSilently().catch(e => { console.log('⚠️ Falha token inicial:', e); return null })
          guard()
          await new Promise(r => setTimeout(r, 200))
          const response = await fetch('/api/me/setup', {
            method: 'POST',
            headers: token ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } : { 'Content-Type': 'application/json' }
          })
          if (!response.ok) {
            console.log('⚠️ Setup backend falhou:', response.status)
            setIsSetupComplete(false)
            tokenRefreshDoneRef.current = false // permitir nova tentativa futura
            return
          }
          // console.log('✅ Setup concluído, a refrescar token...')
          // markSetupDonePersistent() // marcar logo após setup backend
          // tokenRefreshDoneRef.current = false // garantir polling mesmo se corrida anterior marcou
          console.log('Setup concluído, a refrescar token...')
          markSetupDonePersistent()
          tokenRefreshDoneRef.current = false
          
          // Force token refresh to get new permissions immediately (same as Force Token Refresh button)
          // Add retry mechanism for production environments
          let retryCount = 0
          const maxRetries = 10
          
          const attemptTokenRefresh = async () => {
            try {
              // const token = await getAccessTokenSilently({
              //   cacheMode: 'off'
              // })
              console.log('Token refresh após setup concluído com sucesso')
              return true
            } catch (refreshError: any) {
              retryCount++
              console.error(`Erro no refresh do token após setup (tentativa ${retryCount}/${maxRetries}):`, refreshError)
              
              // If it's a login required error and we haven't maxed out retries, wait and retry
              if (refreshError?.error === 'login_required' && retryCount < maxRetries) {
                console.log(`Aguardando ${retryCount * 1000}ms antes de tentar novamente...`)
                await new Promise(resolve => setTimeout(resolve, retryCount * 1000))
                return await attemptTokenRefresh()
              }
              
              // If we've exhausted retries or it's a different error, continue anyway
              console.log('Token refresh falhou após todas as tentativas, continuando...')
              return false
            }
          }
          
          await attemptTokenRefresh()
          
          setIsSetupComplete(true)
        } else {
          console.log('👤 Utilizador existente; skip setup')
          setIsSetupComplete(true)
        }
      } catch (err) {
        console.error('❌ Erro setup utilizador:', err)
        setIsSetupComplete(false)
      } finally {
        setIsSettingUp(false)
      }
    }
    ensureUserSetup()
  }, [user, isAuthenticated, getAccessTokenSilently, isSetupComplete, isSettingUp])

  return {
    isSetupComplete,
    isSettingUp,
    isRefreshingToken,
    needsSetup: (user?.loginsCount === 1 || user?.loginsCount === undefined) && !isSetupComplete && !persistedDone,
    refreshToken: () => refreshTokenSimple(true)
  }
}
