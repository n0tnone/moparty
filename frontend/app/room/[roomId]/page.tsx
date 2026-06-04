'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import io, { Socket } from 'socket.io-client'
import dynamic from 'next/dynamic'
import UserAvatar from '@/components/Avatar'
import { playNotify } from '@/lib/notify'
import PlayerToast from '@/components/PlayerToast'

const VideoPlayer = dynamic(() => import('@/components/VideoPlayer'), { ssr: false })

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
}

const isPolina = (name: string) => {
  const n = name.trim().toLowerCase()
  return (
    n.startsWith('полин') ||
    n.startsWith('поля') ||
    n.startsWith('полян') ||
    n.startsWith('палин') ||
    n === 'пол'
  )
}

const POLINA_FACTS = [
  { emoji: '🌸', title: 'А вы знали?', text: 'Полина — самая красивая девушка во всей вселенной. Это научно доказанный факт ✨' },
  { emoji: '💜', title: 'Секретная информация', text: 'Учёные установили: когда Полина улыбается, настроение поднимается у всех в радиусе 100 метров 😊' },
  { emoji: '✨', title: 'Официальная статистика', text: 'По данным мировой статистики, Полина является причиной хорошего настроения у окружающих в 99.9% случаев 📊' },
  { emoji: '🌙', title: 'Исторический факт', text: 'Говорят, из-за таких людей как Полина астрономы называют самые яркие звёзды особыми именами ⭐' },
  { emoji: '🎀', title: 'Психологический факт', text: 'Психологи утверждают: одно присутствие Полины делает любую вечеринку в десять раз лучше 🎉' },
]

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
const EMOJIS = ['❤️','😂','😮','👍','🔥','🎬','😭','🤣','💀','👀','🙌','✨']

export default function RoomPage() {
  const params = useParams()
  const roomId = params.roomId as string
  const [resolvingVideo, setResolvingVideo] = useState(false)

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

  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChatOpen = (val: boolean) => {
    chatOpenRef.current = val
    setChatOpen(val)
  }

  useEffect(() => {
    const saved = localStorage.getItem('moparty_nickname')
    if (saved) {
      setNicknameInput(saved)
        
    }
  }, [])

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (chatOpen) setUnread(0)
  }, [messages, chatOpen])

  // Socket setup after nickname
  useEffect(() => {
    
    if (!nicknameSet) return

    const s = io(BACKEND, { transports: ['websocket', 'polling'] })
    setSocket(s)
    socketRef.current = s

    s.on('connect', () => {
      setConnected(true)
      setMySocketId(s.id || '')
      s.emit('join_room', { roomId, nickname })
    })

    s.on('room_state', (data: any) => {
      if (data.videoSrc) setVideoUrl(data.videoSrc)
      if (data.members) setMembers(data.members)
      if (data.messages) setMessages(data.messages)
    })

    s.on('member_time', ({ userId, currentTime }: { userId: string; currentTime: number }) => {
      setMemberTimes(prev => ({ ...prev, [userId]: currentTime }))
    })

    s.on('members_update', (m: Member[]) => setMembers(m))

    s.on('chat_message', (msg: Message) => {
      setMessages(prev => [...prev, msg])
      if (msg.type === 'message' && msg.userId !== s.id) {
        playNotify()
        if (!chatOpenRef.current) setUnread(u => u + 1)
      }
    })

    s.on('video_changed', ({ videoSrc }: any) => {
      setVideoUrl(videoSrc)
    })

    s.on('disconnect', () => {
      setConnected(false)
      // авто-реконнект socket.io делает сам, но нужно переджойнить комнату
    })

    s.on('reconnect', () => {
      s.emit('join_room', { roomId, nickname })
    })

    const timeInterval = setInterval(() => {
      const p = (window as any).__mopartyPlayer
      if (p) {
        const t = p.currentTime()
        setMyCurrentTime(t)
        s.emit('member_time', { roomId, currentTime: t })
      }
    }, 1000)

    return () => {
      s.disconnect()
      clearInterval(timeInterval)
    }
  }, [nicknameSet, roomId, nickname])

  const sendChat = () => {
    if (!chatInput.trim()) return
    const s = socketRef.current
    if (!s?.connected) return
    s.emit('chat_message', { roomId, text: chatInput.trim() })
    setChatInput('')
    setShowEmoji(false)
    chatInputRef.current?.focus()
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
    if (isPolina(nicknameInput.trim())) {
      setPolinaScreen(true)
    } else {
      setNicknameSet(true)
    }
  }

  const setVideoFromUrl = async () => {
    if (!videoUrlInput.trim() || !socketRef.current) return
    const raw = videoUrlInput.trim()
    const isDirect = /\.(mp4|m3u8|webm|mkv|avi)(\?|$)/i.test(raw)

    let finalUrl = raw

    if (!isDirect) {
      try {
        setResolvingVideo(true)
        const res = await fetch(`${BACKEND}/api/resolve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: raw }),
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

  // ---- Nickname screen ----

  if (polinaScreen) {
    const fact = POLINA_FACTS[polinaFactIdx]
    return (
      <main style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: '#0d0f17',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Звёздочки фон */}
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)',
            width: 1 + Math.random() * 2,
            height: 1 + Math.random() * 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `sparkle ${2 + Math.random() * 3}s ${Math.random() * 4}s infinite`,
          }} />
        ))}

        <style>{`
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
          @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
          @keyframes sparkle { 0%,100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }
        `}</style>

        <div style={{
          textAlign: 'center',
          maxWidth: 400,
          animation: 'fadeInUp 0.6s ease-out',
          position: 'relative',
          zIndex: 2,
        }}>
          <div style={{ fontSize: 72, marginBottom: 16, display: 'block', animation: 'pulse 2s ease-in-out infinite' }}>
            {fact.emoji}
          </div>

          <h2 style={{
            fontSize: 22,
            fontWeight: 600,
            marginBottom: 16,
            background: 'linear-gradient(135deg, #fff 0%, #c084fc 50%, #f472b6 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'shimmer 3s linear infinite',
          }}>{fact.title}</h2>

          {/* Точки-индикаторы */}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
            {POLINA_FACTS.map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%',
                background: i === polinaFactIdx ? '#c084fc' : 'rgba(255,255,255,0.2)',
                transform: i === polinaFactIdx ? 'scale(1.4)' : 'scale(1)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>

          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: 32, minHeight: 60 }}>
            {fact.text}
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setPolinaFactIdx(i => (i + 1) % POLINA_FACTS.length)}
              style={{
                padding: '12px 24px', borderRadius: 100, border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Ещё факт 💫
            </button>
            <button
              onClick={() => { setPolinaScreen(false); setNicknameSet(true) }}
              style={{
                padding: '12px 24px', borderRadius: 100,
                border: '1.5px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Войти в комнату →
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!nicknameSet) {
    return (
      <main style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(91,143,255,0.12) 0%, transparent 70%)',
      }}>
        <div className="glass animate-slideup" style={{
          borderRadius: 'var(--radius-xl)',
          padding: 'clamp(28px, 6vw, 48px)',
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 8,
          }}>Как тебя зовут?</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 28 }}>
            Выбери никнейм для комнаты
          </p>
          <input
            autoFocus
            value={nicknameInput}
            onChange={e => setNicknameInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleEnter()
            }}
            placeholder="Твой никнейм"
            maxLength={20}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-primary)',
              fontSize: 16,
              fontFamily: 'var(--font-body)',
              marginBottom: 16,
              outline: 'none',
            }}
          />
          <button
            onClick={handleEnter}
            disabled={!nicknameInput.trim()}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: nicknameInput.trim() ? 'var(--accent)' : 'rgba(91,143,255,0.3)',
              border: 'none',
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
              cursor: nicknameInput.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Войти в комнату
          </button>
        </div>
      </main>
    )
  }

  // ---- Main room ----
  return (
    <div className="room-container" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-base)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <header className="glass" style={{
        flexShrink: 0,
        padding: '12px 16px',
        background: 'rgba(9,11,16,0.75)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderBottom: '1px solid var(--glass-border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 700,
            background: 'linear-gradient(135deg, var(--text-primary), var(--accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Moparty</span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {members.slice(0, 4).map(m => (
              <div key={m.id} title={m.nickname} style={{ borderRadius: 8, overflow: 'hidden' }}>
                <UserAvatar name={m.nickname} size={28} />
              </div>
            ))}
            {members.length > 3 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{members.length - 3}</div>
            )}
          </div>

          <button onClick={copyInvite} style={{
            padding: '8px 14px',
            borderRadius: 100,
            background: copied ? 'rgba(74,222,128,0.12)' : 'var(--glass-bg)',
            border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'var(--glass-border)'}`,
            color: copied ? '#4ade80' : 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
            {copied ? 'Скопировано' : 'Пригласить'}
          </button>

          <button onClick={() => setShowVideoModal(true)} style={{
            padding: '8px 14px',
            borderRadius: 100,
            background: 'var(--accent)',
            border: 'none',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
            Видео
          </button>
        </div>
      </header>

      {/* Main content - ПЛЕЕР + ЧАТ */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* Player area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          minWidth: 0,
          overflow: 'hidden',
        }}>
          <div style={{
            flex: 1,
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: 'var(--bg-surface)',
            border: '1px solid var(--glass-border)',
            position: 'relative',
          }}>
            {videoUrl ? (
              <VideoPlayer
                src={videoUrl}
                socket={socket}
                roomId={roomId}
              />
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                color: 'var(--text-muted)',
              }}>
                <div style={{ fontSize: 56 }}>🎬</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Выберите видео</div>
                <button
                  onClick={() => setShowVideoModal(true)}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Выбрать видео
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop chat sidebar */}
        <div className="desktop-chat" style={{
          width: 320,
          flexShrink: 0,
          borderLeft: '1px solid var(--glass-border)',
          background: 'rgba(13,16,23,0.6)',
        }}>
          {/* Members block */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--glass-border)',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>
              Участники ({members.length})
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <UserAvatar name={m.nickname} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.nickname}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {m.id === mySocketId
                        ? formatTime(myCurrentTime)
                        : memberTimes[m.id] !== undefined ? formatTime(memberTimes[m.id]) : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat messages block */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <ChatPanel
              messages={messages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              sendChat={sendChat}
              showEmoji={showEmoji}
              setShowEmoji={setShowEmoji}
              addEmoji={addEmoji}
              chatInputRef={chatInputRef}
              chatEndRef={chatEndRef}
              myId={mySocketId}
              EMOJIS={EMOJIS}
            />
          </div>
        </div>
      </div>

      {/* Mobile chat FAB button */}
      <button
        className="chat-fab"
        onClick={() => handleChatOpen(true)}
      >
        💬
        {unread > 0 && (
          <div style={{
            position: 'absolute',
            top: -4, right: -4,
            width: 20, height: 20,
            borderRadius: '50%',
            background: '#f87171',
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--bg-base)',
          }}>{unread > 9 ? '9+' : unread}</div>
        )}
      </button>

      {/* Mobile chat overlay */}
      {chatOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(9,11,16,0.8)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => handleChatOpen(false)}
        >
          <div
            className="glass"
            style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              height: '70vh',
              borderRadius: '24px 24px 0 0',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--glass-border)',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Чат</span>
              <button onClick={() => handleChatOpen(false)} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}>✕</button>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <ChatPanel
                messages={messages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                sendChat={sendChat}
                showEmoji={showEmoji}
                setShowEmoji={setShowEmoji}
                addEmoji={addEmoji}
                chatInputRef={chatInputRef}
                chatEndRef={chatEndRef}
                myId={mySocketId}
                EMOJIS={EMOJIS}
              />
            </div>
          </div>
        </div>
      )}

      {/* Video source modal */}
      {showVideoModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(9,11,16,0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowVideoModal(false)}
        >
          <div
            className="glass"
            style={{
              borderRadius: 'var(--radius-xl)',
              padding: 32,
              maxWidth: 440,
              width: '100%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24 }}>Выбрать видео</h3>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Ссылка на видео
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={videoUrlInput}
                  onChange={e => setVideoUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && setVideoFromUrl()}
                  placeholder="https://vk.com/video-xxx или .mp4"
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={setVideoFromUrl}
                  disabled={resolvingVideo || !videoUrlInput.trim()}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: videoUrlInput.trim() ? 'var(--accent)' : 'rgba(91,143,255,0.2)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: videoUrlInput.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  {resolvingVideo ? '...' : 'Открыть'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', margin: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>или</div>

            <input type="file" ref={fileInputRef} accept="video/*" onChange={setVideoFromFile} style={{ display: 'none' }} />
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📁 Локальный файл
            </button>
          </div>
        </div>
      )}
      <PlayerToast socket={socket} mySocketId={mySocketId} />
    </div>
  )
}

// ---- ChatPanel component (ИСПРАВЛЕННЫЙ) ----
function ChatPanel({ messages, chatInput, setChatInput, sendChat, showEmoji, setShowEmoji, addEmoji, chatInputRef, chatEndRef, myId, EMOJIS }: any) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Messages container - скролл тут */}
      <div className="chat-messages-container" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minHeight: 0,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 40 }}>
            Пока нет сообщений 👀
          </div>
        )}
        {messages.map((msg: Message) =>
          msg.type === 'system' ? (
            <div key={msg.id} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>
              {msg.text}
            </div>
          ) : (
            <div key={msg.id} style={{
              display: 'flex',
              flexDirection: msg.userId === myId ? 'row-reverse' : 'row',
              gap: 8,
              alignItems: 'flex-end',
              marginBottom: 2,
            }}>
              <div style={{ borderRadius: 6, overflow: 'hidden', flexShrink: 0, width: 26, height: 26 }}>
                <UserAvatar name={msg.nickname || '?'} size={26} />
              </div>
              <div style={{ maxWidth: '75%' }}>
                {msg.userId !== myId && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, paddingLeft: 2 }}>
                    {msg.nickname}
                  </div>
                )}
                <div style={{
                  padding: '8px 12px',
                  borderRadius: msg.userId === myId ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                  background: msg.userId === myId ? 'var(--accent-dim)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${msg.userId === myId ? 'rgba(91,143,255,0.2)' : 'var(--glass-border)'}`,
                  fontSize: 14,
                  lineHeight: 1.4,
                  wordBreak: 'break-word',
                }}>
                  {msg.text}
                </div>
              </div>
            </div>
          )
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid var(--glass-border)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          flexShrink: 0,
        }}>
          {EMOJIS.map((e: string) => (
            <button key={e} onClick={() => addEmoji(e)} style={{
              background: 'none',
              border: 'none',
              fontSize: 22,
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 8,
              minWidth: 44,
              minHeight: 44,
            }}>
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div style={{
        padding: '12px',
        borderTop: '1px solid var(--glass-border)',
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end',
        flexShrink: 0,
      }}>
        <button onClick={() => setShowEmoji((v: boolean) => !v)} style={{
          width: 40, height: 40,
          borderRadius: 'var(--radius-sm)',
          background: showEmoji ? 'var(--accent-dim)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${showEmoji ? 'var(--accent)' : 'var(--glass-border)'}`,
          fontSize: 18,
          cursor: 'pointer',
          flexShrink: 0,
        }}>😊</button>

        <input
          ref={chatInputRef}
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendChat()}
          placeholder="Сообщение..."
          maxLength={500}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)',
            fontSize: 16,
            outline: 'none',
          }}
        />

        <button
          onClick={sendChat}
          disabled={!chatInput.trim()}
          style={{
            width: 40, height: 40,
            borderRadius: 'var(--radius-sm)',
            background: chatInput.trim() ? 'var(--accent)' : 'rgba(91,143,255,0.2)',
            border: 'none',
            color: '#fff',
            fontSize: 18,
            cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
            flexShrink: 0,
          }}
        >➤</button>
      </div>
      
    </div>
  )
}