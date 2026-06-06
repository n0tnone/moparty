'use client'

import Icon from '@/components/Icon'
import { EMOJIS } from './constants'
import { Message } from './types'
import ChatPanel from './ChatPanel'

interface Props {
  messages: Message[]
  chatInput: string
  onInputChange: (val: string) => void
  sendChat: () => void
  showEmoji: boolean
  setShowEmoji: (v: boolean | ((prev: boolean) => boolean)) => void
  addEmoji: (e: string) => void
  chatInputRef: React.RefObject<HTMLInputElement | null>
  mobileChatEndRef: React.RefObject<HTMLDivElement | null>
  mobileChatScrollRef: React.RefObject<HTMLDivElement | null>
  mySocketId: string
  myNickname: string
  typingUsers: Record<string, string>
  hasMoreMessages: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onClose: () => void
}

export default function MobileChatOverlay({
  messages, chatInput, onInputChange, sendChat,
  showEmoji, setShowEmoji, addEmoji,
  chatInputRef, mobileChatEndRef, mobileChatScrollRef,
  mySocketId, myNickname, typingUsers,
  hasMoreMessages, loadingMore, onLoadMore, onClose,
}: Props) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(9,11,16,0.8)', backdropFilter: 'blur(8px)', animation: 'fadeInOverlay 0.25s ease both' }}
      onClick={onClose}
    >
      <div
        className="glass"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70vh', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUpSheet 0.35s cubic-bezier(0.2,0.9,0.4,1.1) both' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Хедер */}
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Чат</span>
          <button
            className="btn-press"
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div ref={mobileChatScrollRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          <ChatPanel
            messages={messages}
            chatInput={chatInput}
            onInputChange={onInputChange}
            sendChat={sendChat}
            showEmoji={showEmoji}
            setShowEmoji={setShowEmoji}
            addEmoji={addEmoji}
            chatInputRef={chatInputRef}
            chatEndRef={mobileChatEndRef}
            myId={mySocketId}
            myNickname={myNickname}
            EMOJIS={EMOJIS}
            typingUsers={typingUsers}
            hasMoreMessages={hasMoreMessages}
            loadingMore={loadingMore}
            onLoadMore={onLoadMore}
            chatScrollRef={mobileChatScrollRef}
          />
        </div>
      </div>
    </div>
  )
}