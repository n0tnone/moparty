'use client'

import { useState } from 'react'
import { GLOBAL_STYLES, POLINA_FACTS } from './constants'

interface Props {
  onEnter: () => void
}

export default function PolinaScreen({ onEnter }: Props) {
  const [factIdx, setFactIdx] = useState(0)
  const fact = POLINA_FACTS[factIdx]

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#0d0f17', position: 'relative', overflow: 'hidden' }}>
      <style>{GLOBAL_STYLES}</style>

      {Array.from({ length: 40 }).map((_, i) => (
        <div key={i} style={{ position: 'absolute', borderRadius: '50%', background: 'rgba(255,255,255,0.6)', width: 1 + Math.random() * 2, height: 1 + Math.random() * 2, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animation: `sparkle ${2 + Math.random() * 3}s ${Math.random() * 4}s infinite` }} />
      ))}

      <div style={{ textAlign: 'center', maxWidth: 400, animation: 'fadeInUp 0.6s ease-out', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 72, marginBottom: 16, display: 'block', animation: 'pulse 2s ease-in-out infinite' }}>{fact.emoji}</div>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16, background: 'linear-gradient(135deg, #fff 0%, #c084fc 50%, #f472b6 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 3s linear infinite' }}>{fact.title}</h2>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
          {POLINA_FACTS.map((_, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === factIdx ? '#c084fc' : 'rgba(255,255,255,0.2)', transform: i === factIdx ? 'scale(1.4)' : 'scale(1)', transition: 'all 0.3s' }} />
          ))}
        </div>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 32, minHeight: 60 }}>{fact.text}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn-press"
            onClick={() => setFactIdx(i => (i + 1) % POLINA_FACTS.length)}
            style={{ padding: '12px 24px', borderRadius: 100, border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Ещё факт 💫
          </button>
          <button
            className="btn-press"
            onClick={onEnter}
            style={{ padding: '12px 24px', borderRadius: 100, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Войти в комнату →
          </button>
        </div>
      </div>
    </main>
  )
}