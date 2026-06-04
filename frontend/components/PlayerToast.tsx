// components/PlayerToast.tsx
'use client'

import { useEffect, useState, useRef } from 'react'

interface Toast {
  id: string
  text: string
  type: 'action' | 'chat'
  nickname?: string
}

interface Props {
  socket: any
  mySocketId: string
}

export default function PlayerToast({ socket, mySocketId }: Props) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const addToast = (toast: Toast, duration: number) => {
    setToasts(prev => [...prev.slice(-2), toast]) // максимум 3
    timerRef.current[toast.id] = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id))
      delete timerRef.current[toast.id]
    }, duration)
  }

  useEffect(() => {
    if (!socket) return

    socket.on('player_play', ({ currentTime, nickname }: any) => {
      if (!nickname) return
      addToast({ id: Date.now()+'play', text: `▶ ${nickname} запустил видео`, type: 'action' }, 3000)
    })

    socket.on('player_pause', ({ currentTime, nickname }: any) => {
      if (!nickname) return
      addToast({ id: Date.now()+'pause', text: `⏸ ${nickname} поставил на паузу`, type: 'action' }, 3000)
    })

    socket.on('player_seek', ({ currentTime, nickname }: any) => {
      if (!nickname) return
      addToast({ id: Date.now()+'seek', text: `⏩ ${nickname} перемотал`, type: 'action' }, 3000)
    })

    socket.on('chat_message', (msg: any) => {
      if (msg.type !== 'message') return
      if (msg.userId === mySocketId) return
      const duration = Math.min(2000 + msg.text.length * 40, 5000)
      addToast({
        id: msg.id,
        text: msg.text,
        type: 'chat',
        nickname: msg.nickname,
      }, duration)
    })

    return () => {
      socket.off('player_play')
      socket.off('player_pause')
      socket.off('player_seek')
      socket.off('chat_message')
    }
  }, [socket, mySocketId])

  if (toasts.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: 16,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            background: 'rgba(13,16,23,0.82)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: toast.type === 'chat' ? '8px 14px' : '7px 14px',
            maxWidth: 260,
            animation: 'toastIn 0.25s cubic-bezier(0.2,0.9,0.4,1.1) both',
          }}
        >
          {toast.type === 'chat' && toast.nickname && (
            <div style={{ fontSize: 11, color: 'rgba(91,143,255,0.9)', marginBottom: 2, fontWeight: 600 }}>
              {toast.nickname}
            </div>
          )}
          <div style={{ fontSize: 13, color: 'rgba(240,242,247,0.92)', lineHeight: 1.4 }}>
            {toast.text}
          </div>
        </div>
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-12px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  )
}