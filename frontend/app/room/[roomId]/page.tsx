'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import io, { Socket } from 'socket.io-client'
import dynamic from 'next/dynamic'
import UserAvatar from '@/components/Avatar'
import { playNotify } from '@/lib/notify'
import PlayerToast from '@/components/PlayerToast'
import Icon from '@/components/Icon'

const VideoPlayer = dynamic(() => import('@/components/VideoPlayer'), { ssr: false })


// ───────────────  Константы  ───────────────
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
const LOGO_SRC = '/moparty-logo.svg'

const EMOJIS = ['👍', '❤️', '🔥', '😂', '🎬', '😮', '👏', '💡', '🎯', '🚀', '💥', '🎉']

// Определяем страну по языку браузера (для флага)
const getCountryInfo = (): { flag: string; name: string } => {
  if (typeof navigator === 'undefined') return { flag: ' ', name: 'Unknown' }
  const lang = navigator.language || ''
  const map: Record<string, { flag: string; name: string }> = {
    'ru': { flag: '🇷🇺', name: 'Россия' },
    'ru-RU': { flag: '🇷🇺', name: 'Россия' },
    'en-US': { flag: '🇺🇸', name: 'США' },
    'en-GB': { flag: '🇬🇧', name: 'Великобритания' },
    'uk': { flag: '🇺🇦', name: 'Украина' },
    'be': { flag: '🇧🇾', name: 'Беларусь' },
    'kk': { flag: '🇰🇿', name: 'Казахстан' },
    'de': { flag: '🇩🇪', name: 'Германия' },
    'fr': { flag: '🇫🇷', name: 'Франция' },
    'es': { flag: '🇪🇸', name: 'Испания' },
    'tr': { flag: '🇹🇷', name: 'Турция' },
    'pl': { flag: '🇵🇱', name: 'Польша' },
    'fi': { flag: '🇫🇮', name: 'Финляндия' },
    'ja': { flag: '🇯🇵', name: 'Япония' },
    'zh': { flag: '🇨🇳', name: 'Китай' },
  }
  return map[lang] || map[lang.split('-')[0]] || { flag: ' ', name: lang || 'Unknown' }
}

// Глобальные стили анимаций
const GLOBAL_STYLES = `
  @keyframes fadeInOverlay { from { opacity: 0 } to { opacity: 1 } }
  @keyframes slideUpSheet { from { transform: translateY(100%) } to { transform: translateY(0) } }
  @keyframes modalIn { from { opacity: 0; transform: scale(0.9) translateY(20px) } to { opacity: 1; transform: scale(1) translateY(0) } }
  @keyframes msgIn { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes shimmerPolina { 0% { background-position: -200% center } 100% { background-position: 200% center } }
  @keyframes membersSlideUp { from { transform: translateY(100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  @keyframes statIn { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: translateX(0) } }
  @keyframes sparkle { 0%,100% { opacity: 0; transform: scale(0) } 50% { opacity: 1; transform: scale(1) } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.1) } }
  @keyframes shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
  @keyframes btnPop { 0% { transform: scale(1) } 50% { transform: scale(0.92) } 100% { transform: scale(1) } }
  
  .btn-press { transition: transform 0.12s cubic-bezier(0.2,0.9,0.4,1.1), background 0.15s, border-color 0.15s, color 0.15s !important; }
  .btn-press:active { transform: scale(0.92) !important; }
  
  .member-row { 
    transition: background 0.15s, transform 0.15s; 
    border-radius: 10px;
    cursor: default;
  }
  .member-row:hover { background: rgba(255,255,255,0.04); transform: translateX(2px); }
  
  .stat-card {
    transition: transform 0.2s cubic-bezier(0.2,0.9,0.4,1.1), background 0.15s;
  }
  .stat-card:hover { transform: translateY(-2px); }
`

interface Message {
  id: string
  type: 'message' | 'system'
  userId?: string
  nickname?: string
  text: string
  ts: number
}
interface Member {
  id: string
  nickname: string
  messageCount?: number
  country?: { flag: string; name: string }
}

const isPolina = (name: string) => {
  const n = name.trim().toLowerCase()
  return (
    n.startsWith('полин') || n.startsWith('поля') ||
    n.startsWith('полян') || n.startsWith('палин') || n === 'пол'
  )
}
const POLINA_FACTS = [
  { emoji: '🌸', title: 'А вы знали?', text: 'Полина — самая красивая девушка во всей вселенной. Это научно доказанный факт ✨' },
  { emoji: '💜', title: 'Секретная информация', text: 'Учёные установили: когда Полина улыбается, настроение поднимается у всех в радиусе 100 метров 😊' },
  { emoji: '✨', title: 'Официальная статистика', text: 'По данным мировой статистики, Полина является причиной хорошего настроения у окружающих в 99.9% случаев 📊' },
  { emoji: '🌙', title: 'Исторический факт', text: 'Говорят, из-за таких людей как Полина астрономы называют самые яркие звёзды особыми именами ⭐' },
  { emoji: '🎀', title: 'Психологический факт', text: 'Психологи утверждают: одно присутствие Полины делает любую вечеринку в десять раз лучше 🎉' },
]

// ═══════════════════════════════════════════════════════════════════
//  MembersModal — модалка «Кто смотрит»
// ═══════════════════════════════════════════════════════════════════
interface MembersModalProps {
  members: Member[]
  memberTimes: Record<string, number>
  mySocketId: string
  myCurrentTime: number
  messages: Message[]
  onClose: () => void
}

function MembersModal({ members, memberTimes, mySocketId, myCurrentTime, messages, onClose }: MembersModalProps) {
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Считаем сообщения на участника
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
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(9,11,16,0.75)',
          backdropFilter: 'blur(12px)',
          animation: 'fadeInOverlay 0.2s ease both',
        }}
        onClick={onClose}
      >
        <div
          className="glass"
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            borderRadius: '20px 20px 0 0',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'membersSlideUp 0.4s cubic-bezier(0.2,0.9,0.4,1.1) both',
            background: 'rgba(13,16,23,0.95)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderBottom: 'none',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Ручка */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
          </div>

          {/* Хедер */}
          <div style={{
            padding: '12px 20px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid var(--glass-border)',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Кто смотрит</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {members.length} {members.length === 1 ? 'участник' : members.length < 5 ? 'участника' : 'участников'}
              </div>
            </div>
            <button
              className="btn-press"
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="close" size={20} />
            </button>
          </div>

          {/* Статистика комнаты */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            padding: '16px 20px',
            borderBottom: '1px solid var(--glass-border)',
            flexShrink: 0,
          }}>
            {[
              { icon: <Icon name="people" size={20} />, label: 'Зрителей', value: members.length },
              { icon: <Icon name="message" size={20} />, label: 'Сообщений', value: totalMessages },
              { icon: <Icon name="globe" size={20} />, label: 'Стран', value: new Set(members.map(m => m.country?.flag || ' ')).size },
            ].map((stat, i) => (
            <div
              key={i}
              className="stat-card"
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.07)',
                padding: '10px 12px',
                animation: `statIn 0.3s ${i * 0.07}s ease both`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ color: 'var(--accent)', opacity: 0.8, display: 'flex' }}>{stat.icon}</span>
                <span style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{stat.value}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
            ))}
          </div>

          {/* Список участников */}
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
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 10px',
                    marginBottom: 4,
                    animation: `statIn 0.3s ${i * 0.05}s ease both`,
                  }}
                >
                  {/* Аватар */}
                  <div style={{ borderRadius: 10, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                    <UserAvatar name={m.nickname} size={40} />
                    {isMe && (
                      <div style={{
                        position: 'absolute', bottom: -2, right: -2,
                        width: 10, height: 10, borderRadius: '50%',
                        background: '#22c55e',
                        border: '2px solid rgba(13,16,23,0.95)',
                      }} />
                    )}
                  </div>

                  {/* Инфо */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{
                        fontSize: 14, fontWeight: 600,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: isMe ? 'var(--accent)' : 'var(--text-primary)',
                      }}>
                        {m.nickname}
                      </span>
                      {isMe && (
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          background: 'rgba(91,143,255,0.15)',
                          border: '1px solid rgba(91,143,255,0.3)',
                          color: 'var(--accent)',
                          borderRadius: 4,
                          padding: '1px 5px',
                        }}>ТЫ</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Таймер */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-muted)', fontSize: 12 }}>
                        <Icon name="clock" size={20} />
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                          {formatTime(time)}
                        </span>
                      </div>
                      {/* Сообщения */}
                      {msgCount > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-muted)', fontSize: 12 }}>
                          <Icon name="message" size={20} />
                          <span>{msgCount}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Флаг страны */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 2, flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 24, lineHeight: 1 }} title={country.name}>
                      {country.flag}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', maxWidth: 50, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {country.name}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Безопасная зона снизу для iOS */}
          <div style={{ height: 'env(safe-area-inset-bottom, 0px)', flexShrink: 0 }} />
        </div>
      </div>
    </>
  )
}

export default function RoomPage() {
  const params = useParams()
  const roomId = params.roomId as string
  const [resolvingVideo, setResolvingVideo] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)

  const [nickname, setNickname] = useState('')
  const [nicknameSet, setNicknameSet] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [memberTimes, setMemberTimes] = useState<Record<string, number>>({})

  const [socket, setSocket] = useState<Socket | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [videoUrlInput, setVideoUrlInput] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const chatOpenRef = useRef(false)
  const [unread, setUnread] = useState(0)
  const [mySocketId, setMySocketId] = useState<string>('')
  const [myCurrentTime, setMyCurrentTime] = useState<number>(0)
  const [polinaScreen, setPolinaScreen] = useState(false)
  const [polinaFactIdx, setPolinaFactIdx] = useState(0)
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({})
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [isMobile, setIsMobile] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesRef = useRef<Message[]>([])
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const [toasts, setToasts] = useState<Array<{id: string; text: string; type: 'action'|'chat'; nickname?: string}>>([])
  const toastTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [initialTime, setInitialTime] = useState(0)
  const isLoadingMoreRef = useRef(false)
  const mobileChatScrollRef = useRef<HTMLDivElement>(null)
  const mobileChatEndRef = useRef<HTMLDivElement>(null)

  const [myCountry] = useState(() => getCountryInfo())

  const handleChatOpen = (val: boolean) => {
    chatOpenRef.current = val
    setChatOpen(val)
    if (val) {
      if (messages.length > 20) {
        const sliced = messages.slice(-20)
        setMessages(sliced)
        messagesRef.current = sliced
        setHasMoreMessages(true)
      }
      setTimeout(() => {
        mobileChatEndRef.current?.scrollIntoView({ behavior: 'instant' })
      }, 380)
    }
    setUnread(0)
  }

  useEffect(() => {
    const saved = localStorage.getItem('moparty_nickname')
    if (saved) setNicknameInput(saved)
  }, [])

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isLoadingMoreRef.current) { isLoadingMoreRef.current = false; return }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (isMobile && chatOpen) {
      requestAnimationFrame(() => {
        if (mobileChatScrollRef.current) mobileChatScrollRef.current.scrollTop = mobileChatScrollRef.current.scrollHeight
        mobileChatEndRef.current?.scrollIntoView({ behavior: 'instant' })
      })
    }
    if (chatOpen) setUnread(0)
  }, [messages, chatOpen, isMobile])

  useEffect(() => {
    if (!nicknameSet) return

    const s = io(BACKEND, { transports: ['websocket', 'polling'] })
    setSocket(s)
    socketRef.current = s

    s.on('connect', () => {
      setConnected(true)
      setMySocketId(s.id || '')
      s.emit('join_room', { roomId, nickname, country: myCountry })
    })

    s.on('room_state', (data: any) => {
      if (data.videoSrc) setVideoUrl(data.videoSrc)
      if (data.state?.currentTime > 0) setInitialTime(data.state.currentTime)
      if (data.members) setMembers(data.members)
      if (data.messages) {
        setMessages(data.messages)
        messagesRef.current = data.messages
        setHasMoreMessages(data.totalMessages > data.messages.length)
      }
    })

    s.on('member_time', ({ userId, currentTime }: { userId: string; currentTime: number }) => {
      setMemberTimes(prev => ({ ...prev, [userId]: currentTime }))
    })

    s.on('members_update', (m: Member[]) => setMembers(m))

    s.on('player_play', ({ nickname, userId }: any) => {
      if (userId === s.id) return
      addToast({ id: 'play', text: `▶ ${nickname} запустил видео`, type: 'action' }, 3000)
    })
    s.on('player_pause', ({ nickname, userId }: any) => {
      if (userId === s.id) return
      addToast({ id: 'pause', text: `⏸ ${nickname} поставил на паузу`, type: 'action' }, 3000)
    })
    s.on('player_seek', ({ nickname, userId }: any) => {
      if (userId === s.id) return
      addToast({ id: 'seek', text: `⏩ ${nickname} перемотал`, type: 'action' }, 3000)
    })

    s.on('chat_message', (msg: Message) => {
      setMessages(prevMessages => {
        if (prevMessages.some(m => m.id === msg.id)) return prevMessages
        const newMessages = [...prevMessages, msg]
        if (newMessages.length > 200) newMessages.shift()
        messagesRef.current = newMessages
        return newMessages
      })
      if (msg.type === 'message' && msg.userId !== s.id) {
        playNotify()
        if (!chatOpenRef.current) setUnread(u => u + 1)
        if (isMobile && 'vibrate' in navigator) navigator.vibrate?.(100)
        const duration = Math.min(2000 + msg.text.length * 40, 5000)
        addToast({ id: 'chat', text: msg.text, type: 'chat', nickname: msg.nickname }, duration)
      }
    })

    s.on('video_changed', ({ videoSrc }: any) => setVideoUrl(videoSrc))
    s.on('disconnect', () => setConnected(false))
    s.on('reconnect', () => s.emit('join_room', { roomId, nickname, country: myCountry }))

    s.on('typing_start', ({ userId, nickname }: { userId: string; nickname: string }) => {
      setTypingUsers(prev => ({ ...prev, [userId]: nickname }))
      clearTimeout(typingTimers.current[userId])
      typingTimers.current[userId] = setTimeout(() => {
        setTypingUsers(prev => { const n = { ...prev }; delete n[userId]; return n })
      }, 3000)
    })
    s.on('typing_stop', ({ userId }: { userId: string }) => {
      clearTimeout(typingTimers.current[userId])
      setTypingUsers(prev => { const n = { ...prev }; delete n[userId]; return n })
    })

    s.on('more_messages', ({ messages: older, hasMore }) => {
      isLoadingMoreRef.current = true
      setMessages(prev => {
        const merged = [...older, ...prev]
        messagesRef.current = merged
        return merged
      })
      setHasMoreMessages(hasMore)
      setLoadingMore(false)
    })

    const timeInterval = setInterval(() => {
      const p = (window as any).__mopartyPlayer
      if (p) {
        const t = p.currentTime()
        setMyCurrentTime(t)
        s.emit('member_time', { roomId, currentTime: t })
      }
    }, 1000)

    return () => { s.disconnect(); clearInterval(timeInterval) }
  }, [nicknameSet, roomId, nickname])

  const toastCounter = useRef(0)
  const addToast = (toast: {id: string; text: string; type: 'action'|'chat'; nickname?: string}, duration: number) => {
    const uniqueId = toast.type === 'action' ? toast.id : `${toast.id}_${++toastCounter.current}`
    const t = { ...toast, id: uniqueId }
    if (toastTimers.current[uniqueId]) clearTimeout(toastTimers.current[uniqueId])
    setToasts(prev => [...prev.filter(x => x.id !== uniqueId), t])
    toastTimers.current[uniqueId] = setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== uniqueId))
      delete toastTimers.current[uniqueId]
    }, duration)
  }

  const sendChat = () => {
    if (!chatInput.trim()) return
    const s = socketRef.current
    if (!s?.connected) return
    s.emit('chat_message', { roomId, text: chatInput.trim() })
    s.emit('typing_stop', { roomId })
    setChatInput('')
    setShowEmoji(false)
    chatInputRef.current?.focus()
  }

  const handleChatInput = (val: string) => {
    setChatInput(val)
    const s = socketRef.current
    if (!s?.connected) return
    if (val.trim()) s.emit('typing_start', { roomId })
    else s.emit('typing_stop', { roomId })
  }

  const addEmoji = (e: string) => {
    setChatInput(prev => prev + e)
    setShowEmoji(false)
    chatInputRef.current?.focus()
  }

  const copyInvite = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleEnter = () => {
    if (!nicknameInput.trim()) return
    localStorage.setItem('moparty_nickname', nicknameInput.trim())
    setNickname(nicknameInput.trim())
    if (isPolina(nicknameInput.trim())) setPolinaScreen(true)
    else setNicknameSet(true)
  }

  const loadMoreMessages = () => {
    if (loadingMore || !hasMoreMessages || !messages.length) return
    isLoadingMoreRef.current = true
    setLoadingMore(true)
    socketRef.current?.emit('load_more_messages', { roomId, beforeId: messages[0].id })
  }

  const setVideoFromUrl = async () => {
    if (!videoUrlInput.trim() || !socketRef.current) return
    const raw = videoUrlInput.trim()
    const isDirect = /\.(mp4|m3u8|webm|mkv|avi)(\?|$)/i.test(raw)
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    let finalUrl = raw
    if (!isDirect) {
      try {
        setResolvingVideo(true)
        const res = await fetch(`${BACKEND}/api/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: raw, isIOS }),
        })
        const data = await res.json()
        if (!res.ok || !data.directUrl) throw new Error(data.error || 'ошибка')
        finalUrl = data.directUrl
      } catch (e: any) {
        alert('Не удалось загрузить видео: ' + e.message)
        setResolvingVideo(false)
        return
      } finally {
        setResolvingVideo(false)
      }
    }
    socketRef.current?.emit('set_video', { roomId, videoSrc: finalUrl, videoType: 'url' })
    setVideoUrl(finalUrl)
    setVideoUrlInput('')
    setShowVideoModal(false)
  }

  const setVideoFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !socketRef.current) return
    const url = URL.createObjectURL(file)
    socketRef.current.emit('set_video', { roomId, videoSrc: url, videoType: 'local' })
    setVideoUrl(url)
    setShowVideoModal(false)
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // ──────── Polina screen ────────
  if (polinaScreen) {
    const fact = POLINA_FACTS[polinaFactIdx]
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
              <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === polinaFactIdx ? '#c084fc' : 'rgba(255,255,255,0.2)', transform: i === polinaFactIdx ? 'scale(1.4)' : 'scale(1)', transition: 'all 0.3s' }} />
            ))}
          </div>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 32, minHeight: 60 }}>{fact.text}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-press" onClick={() => setPolinaFactIdx(i => (i + 1) % POLINA_FACTS.length)} style={{ padding: '12px 24px', borderRadius: 100, border: 'none', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Ещё факт 💫</button>
            <button className="btn-press" onClick={() => { setPolinaScreen(false); setNicknameSet(true) }} style={{ padding: '12px 24px', borderRadius: 100, border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Войти в комнату →</button>
          </div>
        </div>
      </main>
    )
  }

  if (!nicknameSet) {
    return (
      <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(91,143,255,0.12) 0%, transparent 70%)' }}>
        <style>{GLOBAL_STYLES}</style>
        <div className="glass animate-slideup" style={{ borderRadius: 'var(--radius-xl)', padding: 'clamp(28px, 6vw, 48px)', maxWidth: 400, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Как тебя зовут?</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>Выбери никнейм для комнаты</p>
          <input autoFocus value={nicknameInput} onChange={e => setNicknameInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleEnter() }} placeholder="Твой никнейм" maxLength={20} style={{ width: '100%', padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: 16, fontFamily: 'var(--font-body)', marginBottom: 16, outline: 'none' }} />
          <button className="btn-press" onClick={handleEnter} disabled={!nicknameInput.trim()} style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', background: nicknameInput.trim() ? 'var(--accent)' : 'rgba(91,143,255,0.3)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 600, cursor: nicknameInput.trim() ? 'pointer' : 'not-allowed' }}>Войти в комнату</button>
        </div>
      </main>
    )
  }

  // ──────── ОСНОВНАЯ КОМНАТА ────────
  return (
    <div className="room-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', position: 'relative', overflow: 'hidden' }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Header */}
      <header className="glass" style={{ flexShrink: 0, padding: '12px 16px', background: 'rgba(9,11,16,0.75)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--glass-border)' }}>
        {/* Логотип */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={LOGO_SRC} alt="MOPARTY" style={{ height: 32, width: 'auto' }}
            onError={(e) => {
              // Если лого не загрузилось — показываем текст
              const t = e.currentTarget.nextSibling as HTMLElement
              if (t) t.style.display = 'block'
              e.currentTarget.style.display = 'none'
            }}
          />
          <span style={{ display: 'none', fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>MOPARTY</span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Блок участников — кликабельный, открывает модалку */}
          <button
            className="btn-press"
            onClick={() => setShowMembersModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.06)',
              padding: '6px 12px',
              borderRadius: 10,
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
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

          {/* Кнопка «Пригласить» */}
          {isMobile ? (
            <button className="btn-press" onClick={copyInvite} title={copied ? 'Скопировано' : 'Пригласить'} style={{ width: 36, height: 36, borderRadius: 8, background: copied ? 'rgba(74,222,128,0.12)' : 'var(--glass-bg)', border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'var(--glass-border)'}`, color: copied ? '#4ade80' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              {copied ? <Icon name="check" size={20} /> : <Icon name="share" size={20} />}
            </button>
          ) : (
            <button className="btn-press" onClick={copyInvite} style={{ padding: '8px 14px', borderRadius: 8, background: copied ? 'rgba(74,222,128,0.12)' : 'var(--glass-bg)', border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'var(--glass-border)'}`, color: copied ? '#4ade80' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
              {copied ? <Icon name="check" size={20} /> : <Icon name="share" size={20} />}
              {copied ? 'Скопировано' : 'Пригласить'}
            </button>
          )}

          {/* Кнопка «Видео» */}
          {isMobile ? (
            <button className="btn-press" onClick={() => setShowVideoModal(true)} title="Видео" style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <Icon name="video" size={20} />
            </button>
          ) : (
            <button className="btn-press" onClick={() => setShowVideoModal(true)} style={{ padding: '8px 14px', borderRadius: 8, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="video" size={20} />
              Видео
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* Player area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: isMobile ? 0 : 16, minWidth: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, borderRadius: isMobile ? 0 : 'var(--radius-lg)', overflow: 'hidden', background: isMobile ? '#000' : 'var(--bg-surface)', border: isMobile ? 'none' : '1px solid var(--glass-border)', position: 'relative' }}>
            {/* Кнопка чата поверх плеера (mobile) */}
            <button
              className="btn-press"
              onClick={() => handleChatOpen(true)}
              style={{ 
                position: 'absolute', 
                top: 16, 
                right: 16, 
                zIndex: 20, 
                width: 48,  // было 36
                height: 48, // было 36
                borderRadius: 12, // было 8
                background: 'rgba(13,16,23,0.75)', 
                backdropFilter: 'blur(16px) saturate(180%)', 
                WebkitBackdropFilter: 'blur(16px) saturate(180%)', 
                border: '1px solid rgba(255,255,255,0.15)', 
                color: 'white', 
                display: isMobile ? 'flex' : 'none', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                cursor: 'pointer'
              }}
            >
              <Icon name="chat" size={24} />
                {unread > 0 && (
                  <div style={{ 
                    position: 'absolute', 
                    top: -4, 
                    right: -4, 
                    minWidth: 20, 
                    height: 20, 
                    borderRadius: '50%', 
                    background: '#f87171', 
                    fontSize: 11, 
                    fontWeight: 700, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    border: '2px solid #0d1017', 
                    pointerEvents: 'none',
                    padding: '0 5px'
                  }}>
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
                <button className="btn-press" onClick={() => setShowVideoModal(true)} style={{ padding: '12px 24px', borderRadius: 'var(--radius-md)', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                  Выбрать видео
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop chat sidebar */}
        <div className="desktop-chat" style={{ width: 320, flexShrink: 0, borderLeft: '1px solid var(--glass-border)', background: 'rgba(13,16,23,0.6)' }}>
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
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <ChatPanel messages={messages} chatInput={chatInput} onInputChange={handleChatInput} sendChat={sendChat} showEmoji={showEmoji} setShowEmoji={setShowEmoji} addEmoji={addEmoji} chatInputRef={chatInputRef} chatEndRef={chatEndRef} myId={mySocketId} EMOJIS={EMOJIS} typingUsers={typingUsers} hasMoreMessages={hasMoreMessages} loadingMore={loadingMore} onLoadMore={loadMoreMessages} chatScrollRef={chatScrollRef} myNickname={nickname} />
          </div>
        </div>
      </div>

      {/* Mobile chat overlay */}
      {chatOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(9,11,16,0.8)', backdropFilter: 'blur(8px)', animation: 'fadeInOverlay 0.25s ease both' }} onClick={() => handleChatOpen(false)}>
          <div className="glass" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70vh', borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'slideUpSheet 0.35s cubic-bezier(0.2,0.9,0.4,1.1) both' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Чат</span>
              <button className="btn-press" onClick={() => handleChatOpen(false)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="close" size={20} />
              </button>
            </div>
            <div ref={mobileChatScrollRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <ChatPanel messages={messages} chatInput={chatInput} onInputChange={handleChatInput} sendChat={sendChat} showEmoji={showEmoji} setShowEmoji={setShowEmoji} addEmoji={addEmoji} chatInputRef={chatInputRef} chatEndRef={mobileChatEndRef} myId={mySocketId} EMOJIS={EMOJIS} typingUsers={typingUsers} hasMoreMessages={hasMoreMessages} loadingMore={loadingMore} onLoadMore={loadMoreMessages} chatScrollRef={mobileChatScrollRef} myNickname={nickname} />
            </div>
          </div>
        </div>
      )}

      {/* Video source modal */}
      {showVideoModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,11,16,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeInOverlay 0.2s ease both' }} onClick={() => setShowVideoModal(false)}>
          <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: 32, maxWidth: 440, width: '100%', animation: 'modalIn 0.3s cubic-bezier(0.2,0.9,0.4,1.1) both' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Выбрать видео</h3>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Ссылка на видео</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={videoUrlInput} onChange={e => setVideoUrlInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && setVideoFromUrl()} placeholder="https://vk.com/video-xxx или .mp4" style={{ flex: 1, padding: '12px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }} />
                <button className="btn-press" onClick={setVideoFromUrl} disabled={resolvingVideo || !videoUrlInput.trim()} style={{ padding: '12px 16px', borderRadius: 'var(--radius-sm)', background: videoUrlInput.trim() ? 'var(--accent)' : 'rgba(91,143,255,0.2)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: videoUrlInput.trim() ? 'pointer' : 'not-allowed' }}>
                  {resolvingVideo ? '...' : 'Открыть'}
                </button>
              </div>
            </div>
            <div style={{ textAlign: 'center', margin: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>или</div>
            <input type="file" ref={fileInputRef} accept="video/*" onChange={setVideoFromFile} style={{ display: 'none' }} />
            <button className="btn-press" onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Icon name="folder" size={20} /> Локальный файл
            </button>
          </div>
        </div>
      )}

      {/* Members modal */}
      {showMembersModal && (
        <MembersModal
          members={members}
          memberTimes={memberTimes}
          mySocketId={mySocketId}
          myCurrentTime={myCurrentTime}
          messages={messages}
          onClose={() => setShowMembersModal(false)}
        />
      )}

      <PlayerToast toasts={toasts} chatOpen={chatOpen} />
    </div>
  )
}

// ═══════════════  ChatPanel  ═══════════════
function ChatPanel({ messages, chatInput, onInputChange, sendChat, showEmoji, setShowEmoji, addEmoji, chatInputRef, chatEndRef, myId, EMOJIS, typingUsers = {}, hasMoreMessages, loadingMore, onLoadMore, chatScrollRef, myNickname }: any) {
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (el.scrollTop < 50 && !loadingMore && hasMoreMessages) onLoadMore?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div ref={chatScrollRef} className="chat-messages-container" onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0 }}>
        {hasMoreMessages && (
          <div style={{ textAlign: 'center', padding: '4px 0 8px' }}>
            {loadingMore ? (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Загрузка...</span>
            ) : (
              <button className="btn-press" onClick={onLoadMore} style={{ fontSize: 12, color: 'var(--accent)', background: 'rgba(91,143,255,0.08)', border: '1px solid rgba(91,143,255,0.2)', borderRadius: 100, cursor: 'pointer', padding: '5px 16px', fontWeight: 600, transition: 'all 0.2s' }}>Загрузить ещё</button>
            )}
          </div>
        )}
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>Пока нет сообщений 👀</div>
        )}
        {messages.map((msg: Message) =>
          msg.type === 'system' ? (
            <div key={msg.id} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>{msg.text}</div>
          ) : (
            (() => {
              const isMyMsg = msg.userId === myId
              const isPolinaMsg = isPolina(msg.nickname || '')
              const isMyPolinaMsg = isMyMsg && isPolina(myNickname || '')
              const isPink = isPolinaMsg || isMyPolinaMsg
              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: isMyMsg ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginBottom: 6, animation: 'msgIn 0.25s cubic-bezier(0.2,0.9,0.4,1.1) both' }}>
                  {!isMyMsg && (
                    <div style={{ flexShrink: 0, borderRadius: 8, overflow: 'hidden', width: 28, height: 28 }}>
                      <UserAvatar name={msg.nickname || '?'} size={28} />
                    </div>
                  )}
                  <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMyMsg ? 'flex-end' : 'flex-start' }}>
                    {!isMyMsg && (
                      <div style={{ fontSize: 11, color: isPolinaMsg ? 'rgba(236,72,153,0.8)' : 'var(--text-muted)', marginBottom: 3, paddingLeft: 4 }}>{msg.nickname}</div>
                    )}
                    <div style={{ padding: '8px 12px', borderRadius: isMyMsg ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: isMyMsg ? isMyPolinaMsg ? 'linear-gradient(135deg, rgba(236,72,153,0.6), rgba(192,132,252,0.5))' : 'var(--accent)' : isPolinaMsg ? 'linear-gradient(135deg, rgba(236,72,153,0.25), rgba(192,132,252,0.2))' : 'rgba(255,255,255,0.07)', border: isMyMsg ? isMyPolinaMsg ? '1px solid rgba(236,72,153,0.4)' : 'none' : isPolinaMsg ? '1px solid rgba(236,72,153,0.3)' : '1px solid rgba(255,255,255,0.06)', fontSize: 14, lineHeight: 1.45, wordBreak: 'break-word', color: 'var(--text-primary)', boxShadow: isMyMsg ? isMyPolinaMsg ? '0 2px 16px rgba(236,72,153,0.35)' : '0 2px 12px rgba(91,143,255,0.25)' : isPolinaMsg ? '0 2px 12px rgba(236,72,153,0.15)' : 'none', position: 'relative' as const, overflow: 'hidden' }}>
                      {isPink && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)', backgroundSize: '200% 100%', animation: 'shimmerPolina 3s linear infinite', pointerEvents: 'none' }} />}
                      {msg.text}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>
                      {new Date(msg.ts).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })()
          )
        )}
        <div ref={chatEndRef} />
      </div>

      {showEmoji && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--glass-border)', display: 'flex', flexWrap: 'wrap', gap: 4, flexShrink: 0 }}>
          {EMOJIS.map((e: string) => (
            <button key={e} onClick={() => addEmoji(e)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: '4px 6px', borderRadius: 8, minWidth: 44, minHeight: 44, transition: 'transform 0.1s' }}
              onMouseDown={ev => (ev.currentTarget.style.transform = 'scale(0.85)')}
              onMouseUp={ev => (ev.currentTarget.style.transform = 'scale(1)')}
            >{e}</button>
          ))}
        </div>
      )}

      {Object.keys(typingUsers).length > 0 && (
        <div style={{ padding: '4px 16px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', flexShrink: 0 }}>
          {Object.values(typingUsers).join(', ')} печатает...
        </div>
      )}

      <div style={{ padding: '12px', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
        <button className="btn-press" onClick={() => setShowEmoji((v: boolean) => !v)} style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: showEmoji ? 'var(--accent-dim)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showEmoji ? 'var(--accent)' : 'var(--glass-border)'}`, fontSize: 18, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="emoji" size={20} style={{ color: showEmoji ? 'var(--accent)' : 'rgba(255,255,255,0.6)' }} />
        </button>
        <input ref={chatInputRef} value={chatInput} onChange={e => onInputChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Сообщение..." maxLength={500} style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: 16, outline: 'none' }} />
        <button className="btn-press" onClick={sendChat} disabled={!chatInput.trim()} style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: chatInput.trim() ? 'var(--accent)' : 'rgba(91,143,255,0.2)', border: 'none', color: '#fff', cursor: chatInput.trim() ? 'pointer' : 'not-allowed', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="send" size={20} />
        </button>
      </div>
    </div>
  )
}