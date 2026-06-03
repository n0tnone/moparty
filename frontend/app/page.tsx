'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const createRoom = async () => {
    setLoading(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
      const res = await fetch(`${backendUrl}/api/rooms`, { method: 'POST' })
      const { roomId } = await res.json()
      router.push(`/room/${roomId}`)
    } catch (e) {
      alert('Не удалось создать комнату. Проверьте соединение.')
      setLoading(false)
    }
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
      {/* Logo */}
      <div style={{ marginBottom: 48, textAlign: 'center' }} className="animate-card">
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
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          color: 'var(--text-secondary)',
          letterSpacing: '0.02em',
        }}>Смотрите вместе. На расстоянии.</div>
      </div>

      {/* Card */}
      <div className="glass animate-card" style={{
        borderRadius: 'var(--radius-xl)',
        padding: 'clamp(28px, 6vw, 48px)',
        maxWidth: 460,
        width: '100%',
        textAlign: 'center',
        animationDelay: '0.08s',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 20,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}>Создайте комнату</h2>
        <p style={{
          fontSize: 14,
          color: 'var(--text-secondary)',
          marginBottom: 32,
          lineHeight: 1.6,
        }}>
          Получите ссылку-приглашение и смотрите с&nbsp;другом синхронно — пауза, перемотка, всё вместе.
        </p>

        <button
          onClick={createRoom}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: 'var(--radius-md)',
            background: loading ? 'rgba(91,143,255,0.4)' : 'var(--accent)',
            border: 'none',
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 24px var(--accent-glow)',
            transition: 'all 0.15s ease',
            letterSpacing: '0.01em',
          }}
          onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = 'var(--accent-hover)' }}
          onMouseLeave={e => { if (!loading) (e.target as HTMLButtonElement).style.background = 'var(--accent)' }}
        >
          {loading ? 'Создаём...' : '🚀 Создать комнату'}
        </button>

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
          💡 Регистрация не нужна — просто выбери никнейм и кидай ссылку другу
        </div>
      </div>

      {/* Features */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginTop: 32,
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: 460,
      }} className="animate-card" >
        {[
          { icon: '🎥', label: 'Файл или ссылка' },
          { icon: '🔄', label: 'Синхронизация' },
          { icon: '💬', label: 'Чат с эмодзи' },
          { icon: '📱', label: 'Для телефона' },
        ].map(f => (
          <div key={f.label} className="glass" style={{
            padding: '8px 14px',
            borderRadius: 100,
            fontSize: 13,
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>
    </main>
  )
}
