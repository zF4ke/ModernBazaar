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
  const { user, isAuthenticated, getAccessTokenSilently } = useAuth0()
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

  const refreshTokenWithPolling = async (opts?: { maxAttempts?: number; intervalMs?: number; force?: boolean }) => {
    const maxAttempts = opts?.maxAttempts ?? 12
    const intervalMs = opts?.intervalMs ?? 1500
    const force = opts?.force ?? false
    if (!force && tokenRefreshDoneRef.current) return
    tokenRefreshDoneRef.current = true
    setIsRefreshingToken(true)
    console.log(`🔄 A tentar obter novo access token com novas permissões (até ${maxAttempts} tentativas)...`) // debug header

    let permissionsFound: string[] | null = null
    let lastError: any = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`⏳ Tentativa ${attempt}/${maxAttempts}...`)
      const hangWarningTimer = setTimeout(() => {
        console.log(`⌛ Ainda a aguardar resposta do Auth0 na tentativa ${attempt}... (verifica Allowed Web Origins e cookies de terceiros)`) // hang debug
      }, 4000)
      try {
        const start = performance.now()
        const freshToken = await getAccessTokenSilently({
          cacheMode: 'off',
          detailedResponse: false,
          timeoutInSeconds: 15,
          authorizationParams: undefined // usa defaults do provider
        })
        const elapsed = Math.round(performance.now() - start)
        clearTimeout(hangWarningTimer)
        const payload = decodeJwtPayload(freshToken)
        const aud = payload?.aud
        const permissions = payload?.permissions as string[] | undefined
        const scope = payload?.scope
        console.log(`🔁 Tentativa ${attempt}: tempo=${elapsed}ms aud=${aud} scopes=${scope || '—'} perms=${permissions?.length || 0}`)
        if (permissions && permissions.length) {
          console.log('✅ Permissions obtidas:', permissions)
          permissionsFound = permissions
          if (!pageReloadedRef.current) {
            // marcar persistência ANTES do reload para não repetir
            markSetupDonePersistent()
            pageReloadedRef.current = true
            console.log('🔃 A recarregar página para aplicar novas permissões...')
            setTimeout(() => {
              try { window.location.reload() } catch {}
            }, 50)
          }
          break
        }
      } catch (err: any) {
        clearTimeout(hangWarningTimer)
        lastError = err
        console.warn(`⚠️ Erro na tentativa ${attempt}:`, err?.error || err?.message || err)
        if (err?.error && err?.error_description) {
          console.warn('ℹ️ Detalhe Auth0:', err.error, '-', err.error_description)
        }
      }
      if (!permissionsFound && attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, intervalMs))
      }
    }

    if (!permissionsFound) {
      if (lastError) {
        console.warn('❗ Polling terminou sem permissions. Último erro:', lastError)
      } else {
        console.warn('❗ Polling terminou sem permissions e sem erros explícitos (possível cache ou RBAC não refletido ainda).')
      }
      // permitir forçar outra ronda manual mais tarde
      tokenRefreshDoneRef.current = false
    }

    setIsRefreshingToken(false)
  }

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
          const token = await getAccessTokenSilently().catch(e => { console.warn('⚠️ Falha token inicial:', e); return null })
          guard()
          await new Promise(r => setTimeout(r, 200))
          const response = await fetch('/api/me/setup', {
            method: 'POST',
            headers: token ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } : { 'Content-Type': 'application/json' }
          })
          if (!response.ok) {
            console.warn('⚠️ Setup backend falhou:', response.status)
            setIsSetupComplete(false)
            tokenRefreshDoneRef.current = false // permitir nova tentativa futura
            return
          }
          console.log('✅ Setup concluído, a refrescar token...')
          markSetupDonePersistent() // marcar logo após setup backend
          tokenRefreshDoneRef.current = false // garantir polling mesmo se corrida anterior marcou
          await refreshTokenWithPolling()
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

  // Expor debug manual no browser
  if (typeof window !== 'undefined') {
    ;(window as any).__userSetupDebug = {
      forceRefresh: (options?: { maxAttempts?: number; intervalMs?: number }) => refreshTokenWithPolling({ ...options, force: true }),
      state: () => ({
        userSub: user?.sub,
        isSetupComplete,
        isSettingUp,
        isRefreshingToken,
        setupAttempted: setupAttemptedRef.current,
        tokenRefreshDone: tokenRefreshDoneRef.current,
        pageReloaded: pageReloadedRef.current
      })
    }
  }

  return {
    isSetupComplete,
    isSettingUp,
    isRefreshingToken,
    needsSetup: (user?.loginsCount === 1 || user?.loginsCount === undefined) && !isSetupComplete && !persistedDone,
    refreshToken: (options?: { maxAttempts?: number; intervalMs?: number; force?: boolean }) => refreshTokenWithPolling(options)
  }
}
