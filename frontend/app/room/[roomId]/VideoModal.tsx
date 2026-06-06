'use client'

import { useRef } from 'react'
import Icon from '@/components/Icon'

interface Props {
  videoUrlInput: string
  resolvingVideo: boolean
  onChange: (val: string) => void
  onSubmit: () => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClose: () => void
}

export default function VideoModal({ videoUrlInput, resolvingVideo, onChange, onSubmit, onFileChange, onClose }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeInOverlay 0.2s ease both' }}
      onClick={onClose}
    >
      <div
        className="glass"
        style={{ borderRadius: 'var(--radius-xl)', padding: 32, maxWidth: 440, width: '100%', animation: 'modalIn 0.3s cubic-bezier(0.2,0.9,0.4,1.1) both' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Выбрать видео</h3>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Ссылка на видео</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={videoUrlInput}
              onChange={e => onChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSubmit()}
              placeholder="https://vk.com/video-xxx или .mp4"
              style={{ flex: 1, padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
            />
            <button
              className="btn-press"
              onClick={onSubmit}
              disabled={resolvingVideo || !videoUrlInput.trim()}
              style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: videoUrlInput.trim() ? 'var(--accent)' : 'rgba(91,143,255,0.2)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: videoUrlInput.trim() ? 'pointer' : 'not-allowed' }}
            >
              {resolvingVideo ? '...' : 'Открыть'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', margin: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>или</div>

        <input type="file" ref={fileInputRef} accept="video/*" onChange={onFileChange} style={{ display: 'none' }} />
        <button
          className="btn-press"
          onClick={() => fileInputRef.current?.click()}
          style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Icon name="folder" size={20} /> Локальный файл
        </button>
      </div>
    </div>
  )
}