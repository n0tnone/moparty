'use client'

import UserAvatar from '@/components/Avatar'
import Icon from '@/components/Icon'
import { GLOBAL_STYLES } from './constants'
import { Member, Message, getCountryInfo, formatTime } from './types'

interface Props {
  members: Member[]
  memberTimes: Record<string, number>
  mySocketId: string
  myCurrentTime: number
  messages: Message[]
  onClose: () => void
}

export default function MembersModal({ members, memberTimes, mySocketId, myCurrentTime, messages, onClose }: Props) {
  const msgCountByUser: Record<string, number> = {}
  messages.forEach(m => {
    if (m.type === 'message' && m.userId) {
      msgCountByUser[m.userId] = (msgCountByUser[m.userId] || 0) + 1
    }
  })

  const totalMessages = messages.filter(m => m.type === 'message').length

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,0.75)', backdropFilter: 'blur(12px)', animation: 'fadeInOverlay 0.2s ease both' }}
        onClick={onClose}
      >
        <div
          className="glass"
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderRadius: '20px 20px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'membersSlideUp 0.4s cubic-bezier(0.2,0.9,0.4,1.1) both', background: 'rgba(13,16,23,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Ручка */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
          </div>

          {/* Хедер */}
          <div style={{ padding: '12px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Кто смотрит</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {members.length} {members.length === 1 ? 'участник' : members.length < 5 ? 'участника' : 'участников'}
              </div>
            </div>
            <button
              className="btn-press"
              onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          {/* Статистика */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
            {[
              { icon: <Icon name="people" size={20} />, label: 'Зрителей', value: members.length },
              { icon: <Icon name="message" size={20} />, label: 'Сообщений', value: totalMessages },
              { icon: <Icon name="globe" size={20} />, label: 'Стран', value: new Set(members.map(m => m.country?.flag || ' ')).size },
            ].map((stat, i) => (
              <div
                key={i}
                className="stat-card"
                style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px', animation: `statIn 0.3s ${i * 0.07}s ease both` }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ color: 'var(--accent)', opacity: 0.8, display: 'flex' }}>{stat.icon}</span>
                  <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{stat.value}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Список */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {members.map((m, i) => {
              const isMe = m.id === mySocketId
              const time = isMe ? myCurrentTime : (memberTimes[m.id] ?? 0)
              const msgCount = msgCountByUser[m.id] || 0
              const country = m.country || getCountryInfo()

              return (
                <div
                  key={m.id}
                  className="member-row"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 10px', marginBottom: 4, animation: `statIn 0.3s ${i * 0.05}s ease both` }}
                >
                  <div style={{ borderRadius: 10, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                    <UserAvatar name={m.nickname} size={40} />
                    {isMe && (
                      <div style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid rgba(13,16,23,0.95)' }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isMe ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {m.nickname}
                      </span>
                      {isMe && (
                        <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(91,143,255,0.15)', border: '1px solid rgba(91,143,255,0.3)', color: 'var(--accent)', borderRadius: 4, padding: '1px 5px' }}>ТЫ</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-muted)', fontSize: 12 }}>
                        <Icon name="clock" size={20} />
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{formatTime(time)}</span>
                      </div>
                      {msgCount > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-muted)', fontSize: 12 }}>
                          <Icon name="message" size={20} />
                          <span>{msgCount}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <span style={{ fontSize: 24, lineHeight: 1 }} title={country.name}>{country.flag}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 50, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{country.name}</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ height: 'env(safe-area-inset-bottom, 0px)', flexShrink: 0 }} />
        </div>
      </div>
    </>
  )
}