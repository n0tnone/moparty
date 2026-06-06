'use client'

import UserAvatar from '@/components/Avatar'
import Icon from '@/components/Icon'
import { LOGO_SRC } from './constants'
import { Member } from './types'

interface Props {
  members: Member[]
  isMobile: boolean
  copied: boolean
  onCopyInvite: () => void
  onOpenMembers: () => void
  onOpenVideoModal: () => void
}

export default function RoomHeader({ members, isMobile, copied, onCopyInvite, onOpenMembers, onOpenVideoModal }: Props) {
  return (
    <header
      className="glass"
      style={{ flexShrink: 0, padding: '12px 16px', background: 'rgba(9,11,16,0.75)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--glass-border)' }}
    >
      {/* Лого */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src={LOGO_SRC}
          alt="MOPARTY"
          style={{ height: 32, width: 'auto' }}
          onError={e => {
            const t = e.currentTarget.nextSibling as HTMLElement
            if (t) t.style.display = 'block'
            e.currentTarget.style.display = 'none'
          }}
        />
        <span style={{ display: 'none', fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>MOPARTY</span>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Участники */}
        <button
          className="btn-press"
          onClick={onOpenMembers}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', padding: '6px 12px', borderRadius: 10, border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          {isMobile ? (
            <>
              <Icon name="people" size={20} />
              <div style={{ background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 11, minWidth: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {members.length}
              </div>
            </>
          ) : (
            <>
              {members.slice(0, 4).map(m => (
                <div key={m.id} title={m.nickname} style={{ borderRadius: 8, overflow: 'hidden' }}>
                  <UserAvatar name={m.nickname} size={28} />
                </div>
              ))}
              {members.length > 3 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{members.length - 3}</div>}
              <div style={{ background: '#22c55e', width: 8, height: 8, borderRadius: '50%', marginLeft: 2 }} />
            </>
          )}
        </button>

        {/* Пригласить */}
        {isMobile ? (
          <button
            className="btn-press"
            onClick={onCopyInvite}
            title={copied ? 'Скопировано' : 'Пригласить'}
            style={{ width: 36, height: 36, borderRadius: 8, background: copied ? 'rgba(74,222,128,0.12)' : 'var(--glass-bg)', border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'var(--glass-border)'}`, color: copied ? '#4ade80' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            {copied ? <Icon name="check" size={20} /> : <Icon name="share" size={20} />}
          </button>
        ) : (
          <button
            className="btn-press"
            onClick={onCopyInvite}
            style={{ padding: '8px 14px', borderRadius: 8, background: copied ? 'rgba(74,222,128,0.12)' : 'var(--glass-bg)', border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'var(--glass-border)'}`, color: copied ? '#4ade80' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {copied ? <Icon name="check" size={20} /> : <Icon name="share" size={20} />}
            {copied ? 'Скопировано' : 'Пригласить'}
          </button>
        )}

        {/* Видео */}
        {isMobile ? (
          <button
            className="btn-press"
            onClick={onOpenVideoModal}
            title="Видео"
            style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <Icon name="video" size={20} />
          </button>
        ) : (
          <button
            className="btn-press"
            onClick={onOpenVideoModal}
            style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Icon name="video" size={20} />
            Видео
          </button>
        )}
      </div>
    </header>
  )
}