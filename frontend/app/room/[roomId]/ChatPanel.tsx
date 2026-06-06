'use client'

import UserAvatar from '@/components/Avatar'
import Icon from '@/components/Icon'
import { isPolina } from './types'
import type { Message } from './types'

interface Props {
  messages: Message[]
  chatInput: string
  onInputChange: (val: string) => void
  sendChat: () => void
  showEmoji: boolean
  setShowEmoji: (v: boolean | ((prev: boolean) => boolean)) => void
  addEmoji: (e: string) => void
  chatInputRef: React.RefObject<HTMLInputElement | null>
  chatEndRef: React.RefObject<HTMLDivElement | null>
  myId: string
  myNickname: string
  EMOJIS: string[]
  typingUsers?: Record<string, string>
  hasMoreMessages: boolean
  loadingMore: boolean
  onLoadMore: () => void
  chatScrollRef: React.RefObject<HTMLDivElement | null>
}

export default function ChatPanel({
  messages, chatInput, onInputChange, sendChat, showEmoji, setShowEmoji, addEmoji,
  chatInputRef, chatEndRef, myId, myNickname, EMOJIS, typingUsers = {},
  hasMoreMessages, loadingMore, onLoadMore, chatScrollRef,
}: Props) {
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollTop < 50 && !loadingMore && hasMoreMessages) onLoadMore?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Сообщения */}
      <div
        ref={chatScrollRef}
        className="chat-messages-container"
        onScroll={handleScroll}
        style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0 }}
      >
        {hasMoreMessages && (
          <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
            {loadingMore ? (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Загрузка...</span>
            ) : (
              <button
                className="btn-press"
                onClick={onLoadMore}
                style={{ fontSize: 12, color: 'var(--accent)', background: 'rgba(91,143,255,0.08)', border: '1px solid rgba(91,143,255,0.2)', borderRadius: 100, cursor: 'pointer', padding: '5px 16px', fontWeight: 600, transition: 'all 0.2s' }}
              >
                Загрузить ещё
              </button>
            )}
          </div>
        )}

        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>Пока нет сообщений 👀</div>
        )}

        {messages.map(msg =>
          msg.type === 'system' ? (
            <div key={msg.id} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>{msg.text}</div>
          ) : (
            <ChatMessage key={msg.id} msg={msg} isMyMsg={msg.userId === myId} myNickname={myNickname} />
          )
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Эмодзи */}
      {showEmoji && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--glass-border)', display: 'flex', flexWrap: 'wrap', gap: 4, flexShrink: 0 }}>
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => addEmoji(e)}
              style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '4px 6px', borderRadius: 8, minWidth: 44, minHeight: 44, transition: 'transform 0.1s' }}
              onMouseDown={ev => (ev.currentTarget.style.transform = 'scale(0.85)')}
              onMouseUp={ev => (ev.currentTarget.style.transform = 'scale(1)')}
            >{e}</button>
          ))}
        </div>
      )}

      {/* Typing */}
      {Object.keys(typingUsers).length > 0 && (
        <div style={{ padding: '4px 16px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', flexShrink: 0 }}>
          {Object.values(typingUsers).join(', ')} печатает...
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0, overflow: 'hidden' }}>
        <button
          className="btn-press"
          onClick={() => setShowEmoji(v => !v)}
          style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: showEmoji ? 'var(--accent-dim)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showEmoji ? 'var(--accent)' : 'var(--glass-border)'}`, fontSize: 18, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="emoji" size={20} style={{ color: showEmoji ? 'var(--accent)' : 'rgba(255,255,255,0.6)' }} />
        </button>
        <input
          ref={chatInputRef}
          value={chatInput}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendChat()}
          placeholder="Сообщение..."
          maxLength={500}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: 16, outline: 'none' }}
        />
        <button
          className="btn-press"
          onClick={sendChat}
          disabled={!chatInput.trim()}
          style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: chatInput.trim() ? 'var(--accent)' : 'rgba(91,143,255,0.2)', border: 'none', color: '#fff', cursor: chatInput.trim() ? 'pointer' : 'not-allowed', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="send" size={20} />
        </button>
      </div>
    </div>
  )
}

// ── Одно сообщение ──
function ChatMessage({ msg, isMyMsg, myNickname }: { msg: Message; isMyMsg: boolean; myNickname: string }) {
  const isPolinaMsg = isPolina(msg.nickname || '')
  const isMyPolinaMsg = isMyMsg && isPolina(myNickname || '')
  const isPink = isPolinaMsg || isMyPolinaMsg

  return (
    <div
      style={{ display: 'flex', flexDirection: isMyMsg ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 6, animation: 'msgIn 0.25s cubic-bezier(0.2,0.9,0.4,1.1) both' }}
    >
      {!isMyMsg && (
        <div style={{ flexShrink: 0, borderRadius: 8, overflow: 'hidden', width: 28, height: 28 }}>
          <UserAvatar name={msg.nickname || '?'} size={28} />
        </div>
      )}
      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMyMsg ? 'flex-end' : 'flex-start' }}>
        {!isMyMsg && (
          <div style={{ fontSize: 11, color: isPolinaMsg ? 'rgba(236,72,153,0.8)' : 'var(--text-muted)', marginBottom: 3, paddingLeft: 4 }}>
            {msg.nickname}
          </div>
        )}
        <div style={{
          padding: '8px 12px',
          borderRadius: isMyMsg ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isMyMsg
            ? isMyPolinaMsg ? 'linear-gradient(135deg, rgba(236,72,153,0.6), rgba(192,132,252,0.5))' : 'var(--accent)'
            : isPolinaMsg ? 'linear-gradient(135deg, rgba(236,72,153,0.25), rgba(192,132,252,0.2))' : 'rgba(255,255,255,0.07)',
          border: isMyMsg
            ? isMyPolinaMsg ? '1px solid rgba(236,72,153,0.4)' : 'none'
            : isPolinaMsg ? '1px solid rgba(236,72,153,0.3)' : '1px solid rgba(255,255,255,0.06)',
          fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word', color: 'var(--text-primary)',
          boxShadow: isMyMsg
            ? isMyPolinaMsg ? '0 2px 16px rgba(236,72,153,0.35)' : '0 2px 12px rgba(91,143,255,0.25)'
            : isPolinaMsg ? '0 2px 12px rgba(236,72,153,0.15)' : 'none',
          position: 'relative' as const, overflow: 'hidden',
        }}>
          {isPink && (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmerPolina 3s linear infinite', pointerEvents: 'none' }} />
          )}
          {msg.text}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>
          {new Date(msg.ts).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}