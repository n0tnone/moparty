'use client'

import { GLOBAL_STYLES } from './constants'

interface Props {
  nicknameInput: string
  onChange: (val: string) => void
  onEnter: () => void
}

export default function NicknameScreen({ nicknameInput, onChange, onEnter }: Props) {
  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(91,143,255,0.12) 0%, transparent 70%)' }}>
      <style>{GLOBAL_STYLES}</style>
      <div className="glass animate-slideup" style={{ borderRadius: 'var(--radius-xl)', padding: 'clamp(28px, 6vw, 48px)', maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Как тебя зовут?</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>Выбери никнейм для комнаты</p>
        <input
          autoFocus
          value={nicknameInput}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') onEnter() }}
          placeholder="Твой никнейм"
          maxLength={20}
          style={{ width: '100%', padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: 16, fontFamily: 'var(--font-body)', marginBottom: 16, outline: 'none' }}
        />
        <button
          className="btn-press"
          onClick={onEnter}
          disabled={!nicknameInput.trim()}
          style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', background: nicknameInput.trim() ? 'var(--accent)' : 'rgba(91,143,255,0.3)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 600, cursor: nicknameInput.trim() ? 'pointer' : 'not-allowed' }}
        >
          Войти в комнату
        </button>
      </div>
    </main>
  )
}