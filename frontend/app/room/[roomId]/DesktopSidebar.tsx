'use client'

import UserAvatar from '@/components/Avatar'
import { Member, Message, formatTime } from './types'
import ChatPanel from './ChatPanel'
import { EMOJIS } from './constants'

interface Props {
  members: Member[]
  mySocketId: string
  myCurrentTime: number
  memberTimes: Record<string, number>
  messages: Message[]
  chatInput: string
  onInputChange: (val: string) => void
  sendChat: () => void
  showEmoji: boolean
  setShowEmoji: (v: boolean | ((prev: boolean) => boolean)) => void
  addEmoji: (e: string) => void
  chatInputRef: React.RefObject<HTMLInputElement | null>
  chatEndRef: React.RefObject<HTMLDivElement | null>
  typingUsers: Record<string, string>
  hasMoreMessages: boolean
  loadingMore: boolean
  onLoadMore: () => void
  chatScrollRef: React.RefObject<HTMLDivElement | null>
  myNickname: string
}

export default function DesktopSidebar({
  members, mySocketId, myCurrentTime, memberTimes,
  messages, chatInput, onInputChange, sendChat,
  showEmoji, setShowEmoji, addEmoji,
  chatInputRef, chatEndRef, typingUsers,
  hasMoreMessages, loadingMore, onLoadMore, chatScrollRef, myNickname,
}: Props) {
  return (
    <div
      className="desktop-chat"
      style={{ 

            flexShrink: 0, 
            borderLeft: '1px solid var(--glass-border)', 
            background: 'rgba(13,16,23,0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',  // ← вот это главное
            minWidth: 0,
            }}
    >
      {/* Участники */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>
          Участники ({members.length})
        </div>
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <UserAvatar name={m.nickname} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nickname}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {m.id === mySocketId ? formatTime(myCurrentTime) : memberTimes[m.id] !== undefined ? formatTime(memberTimes[m.id]) : '—'}
                </div>
              </div>
              <span title={m.country?.name || ''}>{m.country?.flag || ' '}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Чат */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <ChatPanel
          messages={messages}
          chatInput={chatInput}
          onInputChange={onInputChange}
          sendChat={sendChat}
          showEmoji={showEmoji}
          setShowEmoji={setShowEmoji}
          addEmoji={addEmoji}
          chatInputRef={chatInputRef}
          chatEndRef={chatEndRef}
          myId={mySocketId}
          myNickname={myNickname}
          EMOJIS={EMOJIS}
          typingUsers={typingUsers}
          hasMoreMessages={hasMoreMessages}
          loadingMore={loadingMore}
          onLoadMore={onLoadMore}
          chatScrollRef={chatScrollRef}
        />
      </div>
    </div>
  )
}