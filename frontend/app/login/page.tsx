'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

declare global {
  interface Window {
    VKIDSDK: any
  }
}

export default function LoginPage() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const sdkReady = useRef(false)

  useEffect(() => {
    // Проверяем уже залогинен ли
    fetch('/api/auth/me').then(r => r.json()).then(({ user }) => {
      if (user) router.replace('/')
    })
  }, [])

  useEffect(() => {
    if (sdkReady.current) return

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js'
    script.onload = () => initSDK()
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  const initSDK = () => {
    if (!window.VKIDSDK || !containerRef.current) return
    sdkReady.current = true

    const VKID = window.VKIDSDK

    VKID.Config.init({
      app: 54626988,
      redirectUrl: 'https://moparty-front.onrender.com/api/auth/vk/callback',
      responseMode: VKID.ConfigResponseMode.Callback,
      source: VKID.ConfigSource.LOWCODE,
      scope: '',
    })

    const oneTap = new VKID.OneTap()
    oneTap
      .render({
        container: containerRef.current,
        scheme: 'dark',
        showAlternativeLogin: true,
        styles: { borderRadius: 12, width: 280 },
      })
      .on(VKID.WidgetEvents.ERROR, (error: any) => {
        console.error('VK ID error:', error)
      })
    .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload: any) => {
    console.log('VK payload:', JSON.stringify(payload))
    const { code, device_id } = payload

    try {
        const data = await VKID.Auth.exchangeCode(code, device_id)
        console.log('exchangeCode result:', JSON.stringify(data))

        const res = await fetch('/api/auth/vk/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            access_token: data.access_token,
            user_id: data.user_id,
        }),
        })

        const resBody = await res.json()
        console.log('callback response:', res.status, JSON.stringify(resBody))

        if (!res.ok) throw new Error('auth failed')

        router.replace('/')
    } catch (e) {
        console.error('Login error full:', e)
        alert('Не удалось войти. Попробуй ещё раз.')
    }
    })
  }

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(91,143,255,0.12) 0%, transparent 70%)',
    }}>
      {/* Лого */}
      <div style={{ marginBottom: 48, textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(32px, 8vw, 56px)',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 8,
        }}>Moparty</div>
        <div style={{
          fontSize: 16,
          color: 'var(--text-secondary)',
          letterSpacing: '0.02em',
        }}>Смотрите вместе. На расстоянии.</div>
      </div>

      {/* Карточка */}
      <div className="glass" style={{
        borderRadius: 'var(--radius-xl)',
        padding: 'clamp(28px, 6vw, 48px)',
        maxWidth: 400,
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}>Войдите через ВКонтакте</h2>
        <p style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          marginBottom: 32,
          lineHeight: 1.6,
        }}>
          Нужно один раз — потом 30 дней без повторного входа
        </p>

        {/* VK One Tap монтируется сюда */}
        <div
          ref={containerRef}
          style={{ display: 'flex', justifyContent: 'center', minHeight: 56 }}
        />

        <div style={{
          marginTop: 24,
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--accent-dim)',
          border: '1px solid rgba(91,143,255,0.2)',
          fontSize: 13,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}>
          🔒 Только имя и аватарка — больше ничего не запрашиваем
        </div>
      </div>
    </main>
  )
}