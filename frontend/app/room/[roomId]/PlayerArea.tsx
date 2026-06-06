'use client'

import { Socket } from 'socket.io-client'
import dynamic from 'next/dynamic'
import Icon from '@/components/Icon'

const VideoPlayer = dynamic(() => import('@/components/VideoPlayer'), { ssr: false })

interface Props {
  videoUrl: string
  socket: Socket | null
  roomId: string
  initialTime: number
  isMobile: boolean
  chatOpen: boolean
  unread: number
  onOpenChat: () => void
  onOpenVideoModal: () => void
}

export default function PlayerArea({ videoUrl, socket, roomId, initialTime, isMobile, chatOpen, unread, onOpenChat, onOpenVideoModal }: Props) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: isMobile ? 0 : 16, minWidth: 0, overflow: 'hidden' }}>
      <div style={{ flex: 1, borderRadius: isMobile ? 0 : 'var(--radius-lg)', overflow: 'hidden', background: isMobile ? '#000' : 'var(--bg-surface)', border: isMobile ? 'none' : '1px solid var(--glass-border)', position: 'relative' }}>

        {/* Кнопка чата (mobile) */}
        <button
          className="btn-press"
          onClick={onOpenChat}
          style={{ position: 'absolute', top: 16, right: 16, zIndex: 20, width: 48, height: 48, borderRadius: 12, background: 'rgba(13,16,23,0.75)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', display: isMobile ? 'flex' : 'none', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.3)', cursor: 'pointer' }}
        >
          <Icon name="chat" size={24} />
          {unread > 0 && (
            <div style={{ position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: '50%', background: '#f87171', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0d1017', pointerEvents: 'none', padding: '0 5px' }}>
              {unread > 99 ? '99+' : unread > 9 ? '9+' : unread}
            </div>
          )}
        </button>

        {videoUrl ? (
          <VideoPlayer src={videoUrl} socket={socket} roomId={roomId} initialTime={initialTime} />
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--text-muted)' }}>
            <Icon name="film" size={64} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>Выберите видео</div>
            <button
              className="btn-press"
              onClick={onOpenVideoModal}
              style={{ padding: '12px 24px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              Выбрать видео
            </button>
          </div>
        )}
      </div>
    </div>
  )
}