'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

import { useParams } from 'next/navigation'
import io, { Socket } from 'socket.io-client'
import dynamic from 'next/dynamic'
import UserAvatar from '@/components/Avatar'
import { playNotify } from '@/lib/notify'

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
  const [unread, setUnread] = useState(0)
  const [mySocketId, setMySocketId] = useState<string>('')
  const [myCurrentTime, setMyCurrentTime] = useState<number>(0)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  useEffect(() => {
    const saved = localStorage.getItem('moparty_nickname')
    if (saved) setNicknameInput(saved)
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
      console.log('member_time received:', userId, currentTime)
      setMemberTimes(prev => ({ ...prev, [userId]: currentTime }))
    })

    s.on('members_update', (m: Member[]) => setMembers(m))

    s.on('chat_message', (msg: Message) => {
      setMessages(prev => [...prev, msg])
      if (msg.type === 'message' && msg.userId !== s.id) {
        playNotify()
        setUnread(u => u + 1)
      }
    })

    s.on('video_changed', ({ videoSrc }: any) => {
      setVideoUrl(videoSrc)
    })

    s.on('disconnect', () => setConnected(false))

    const timeInterval = setInterval(() => {
      const p = (window as any).__mopartyPlayer
      if (p) {
        const t = p.currentTime()
        setMyCurrentTime(t)  // ← добавь
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
        if (data.audioUrl) {
          finalUrl = data.directUrl + '||' + data.audioUrl
        }

        finalUrl = `${BACKEND}/api/proxy?url=${encodeURIComponent(finalUrl)}`
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
              if (e.key === 'Enter' && nicknameInput.trim()) {
                localStorage.setItem('moparty_nickname', nicknameInput.trim())
                setNickname(nicknameInput.trim())
                setNicknameSet(true)
              }
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
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
          />
          <button
            onClick={() => {
              if (nicknameInput.trim()) {
                localStorage.setItem('moparty_nickname', nicknameInput.trim())
                setNickname(nicknameInput.trim())
                setNicknameSet(true)
              }
            }}
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
              boxShadow: nicknameInput.trim() ? '0 4px 20px var(--accent-glow)' : 'none',
              transition: 'all 0.15s',
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
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-base)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(91,143,255,0.08) 0%, transparent 60%)',
      }} />

      {/* Header */}
      <header className="glass" style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '12px 16px',
        background: 'rgba(9,11,16,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        boxShadow: '0 1px 0 var(--glass-border)',
        border: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 700,
            background: 'linear-gradient(135deg, var(--text-primary), var(--accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Moparty</span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Members */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {members.slice(0, 4).map(m => (
              <div key={m.id} title={m.nickname} style={{ borderRadius: 8, overflow: 'hidden' }}>
                <UserAvatar name={m.nickname} size={28} />
              </div>
            ))}
            {members.length > 3 && (
              <div style={{
                fontSize: 11, color: 'var(--text-muted)', paddingLeft: 2,
              }}>+{members.length - 3}</div>
            )}
          </div>

          {/* Invite btn */}
          <button onClick={copyInvite} style={{
            padding: '8px 14px',
            borderRadius: 100,
            background: copied ? 'rgba(74,222,128,0.12)' : 'var(--glass-bg)',
            border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'var(--glass-border)'}`,
            color: copied ? '#4ade80' : 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}>
            {copied ? 'Скопировано' : 'Пригласить'}
          </button>

          {/* Video source btn */}
          <button onClick={() => setShowVideoModal(true)} style={{
            padding: '8px 14px',
            borderRadius: 100,
            background: 'var(--accent)',
            border: 'none',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 12px var(--accent-glow)',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
          }}>
            Видео
          </button>
        </div>
      </header>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: 0,
        position: 'relative',
        zIndex: 1,
        height: 'calc(100dvh - 57px)',
      }}>
        {/* Player area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          gap: 12,
          minWidth: 0,
        }}>
          {/* Player */}
          <div style={{
            flex: 1,
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            background: 'var(--bg-surface)',
            border: '1px solid var(--glass-border)',
            minHeight: 0,
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
                minHeight: 280,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                color: 'var(--text-muted)',
              }}>
                <div style={{ fontSize: 56 }}>🎬</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Выберите видео
                </div>
                <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 260 }}>
                  Нажми «Видео» в шапке чтобы выбрать файл или вставить ссылку
                </div>
                <button
                  onClick={() => setShowVideoModal(true)}
                  style={{
                    marginTop: 8,
                    padding: '12px 24px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px var(--accent-glow)',
                  }}
                >
                  Выбрать видео
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop chat sidebar */}
        <div style={{
          width: 320,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid var(--glass-border)',
          background: 'rgba(13,16,23,0.6)',
        }} className="desktop-chat">

          <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--glass-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Участники
              </div>
              {members.map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                   <UserAvatar name={m.nickname} size={32} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

      {/* Mobile chat FAB */}
      <button
        onClick={() => { setChatOpen(true); setUnread(0) }}
        className="mobile-chat-fab"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--accent)',
          border: 'none',
          color: '#fff',
          fontSize: 22,
          cursor: 'pointer',
          boxShadow: '0 4px 24px var(--accent-glow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
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
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(9,11,16,0.6)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setChatOpen(false)}
        >
          <div
            className="glass animate-slideup"
            style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              height: '80dvh',
              borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              background: 'rgba(13,16,23,0.95)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '16px 20px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--glass-border)',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600 }}>Чат</span>
              <button onClick={() => setChatOpen(false)} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>
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
      )}

      {/* Video source modal */}
      {showVideoModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 70,
            background: 'rgba(9,11,16,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowVideoModal(false)}
        >
          <div
            className="glass animate-slideup"
            style={{
              borderRadius: 'var(--radius-xl)',
              padding: 32,
              maxWidth: 440,
              width: '100%',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 600,
              marginBottom: 24,
            }}>Выбрать видео</h3>

            {/* URL input */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
                Прямая ссылка на видео (.mp4, .m3u8 и др.)
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={videoUrlInput}
                  onChange={e => setVideoUrlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && setVideoFromUrl()}
                  placeholder="https://example.com/video.mp4"
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
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
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
                    whiteSpace: 'nowrap',
                  }}
                >
                  {resolvingVideo ? 'Загружаем...' : 'Открыть'}
                </button>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '20px 0',
              color: 'var(--text-muted)',
              fontSize: 13,
            }}>
              <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
              или
              <div style={{ flex: 1, height: 1, background: 'var(--glass-border)' }} />
            </div>

            {/* File upload */}
            <input
              type="file"
              ref={fileInputRef}
              accept="video/*"
              onChange={setVideoFromFile}
              style={{ display: 'none' }}
            />
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
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            >
              📁 Выбрать локальный файл
            </button>

            <div style={{
              marginTop: 16,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.2)',
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}>
              ⚠️ Локальные файлы работают только у того, кто их открыл. Для совместного просмотра используй прямую ссылку.
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 767px) {
          .desktop-chat { display: none !important; }
          .mobile-chat-fab { display: flex !important; }
        }
        @media (min-width: 768px) {
          .mobile-chat-fab { display: none !important; }
        }
      `}</style>
    </div>
  )
}

// ---- ChatPanel component ----
function ChatPanel({ messages, chatInput, setChatInput, sendChat, showEmoji, setShowEmoji, addEmoji, chatInputRef, chatEndRef, myId, EMOJIS }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minHeight: 0 }}>
      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minHeight: 0,
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
            marginTop: 40,
          }}>Пока нет сообщений 👀</div>
        )}
        {messages.map((msg: Message) =>
          msg.type === 'system' ? (
            <div key={msg.id} style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-muted)',
              padding: '4px 0',
            }}>{msg.text}</div>
          ) : (
            <div
              key={msg.id}
              className="animate-fadein"
              style={{
                display: 'flex',
                flexDirection: msg.userId === myId ? 'row-reverse' : 'row',
                gap: 8,
                alignItems: 'flex-end',
                marginBottom: 2,
              }}
            >
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
                  borderRadius: msg.userId === myId
                    ? '16px 4px 16px 16px'
                    : '4px 16px 16px 16px',
                  background: msg.userId === myId
                    ? 'var(--accent-dim)'
                    : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${msg.userId === myId ? 'rgba(91,143,255,0.2)' : 'var(--glass-border)'}`,
                  fontSize: 14,
                  color: 'var(--text-primary)',
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
        }}>
          {EMOJIS.map((e: string) => (
            <button
              key={e}
              onClick={() => addEmoji(e)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 22,
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 8,
                transition: 'background 0.1s',
                minWidth: 44,
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={e2 => (e2.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={e2 => (e2.currentTarget.style.background = 'none')}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div style={{
        padding: '12px 12px 16px',
        borderTop: '1px solid var(--glass-border)',
        display: 'flex',
        gap: 8,
        alignItems: 'flex-end',
      }}>
        <button
          onClick={() => setShowEmoji((v: boolean) => !v)}
          style={{
            width: 40, height: 40,
            borderRadius: 'var(--radius-sm)',
            background: showEmoji ? 'var(--accent-dim)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${showEmoji ? 'var(--accent)' : 'var(--glass-border)'}`,
            fontSize: 18,
            cursor: 'pointer',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >😊</button>

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
            fontFamily: 'var(--font-body)',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--glass-border)'}
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: chatInput.trim() ? '0 2px 12px var(--accent-glow)' : 'none',
            transition: 'all 0.15s',
          }}
        >➤</button>
      </div>
    </div>
  )
}
