'use client'

import { useEffect, useRef, useState } from 'react'

interface Toast {
  id: string
  text: string
  type: 'action' | 'chat'
  nickname?: string
}

interface Props {
  toasts: Toast[]
}

export default function PlayerToast({ toasts, chatOpen }: { toasts: Toast[], chatOpen: boolean }) {
  if (toasts.length === 0 || chatOpen) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 90,
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