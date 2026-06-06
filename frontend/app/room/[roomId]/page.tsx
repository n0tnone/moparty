'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import io, { Socket } from 'socket.io-client'
import { playNotify } from '@/lib/notify'
import PlayerToast from '@/components/PlayerToast'

import { BACKEND, GLOBAL_STYLES, EMOJIS } from './constants'
import { Message, Member, Toast, getCountryInfo, isPolina } from './types'

import NicknameScreen from './NicknameScreen'
import PolinaScreen from './PolinaScreen'
import RoomHeader from './RoomHeader'
import PlayerArea from './PlayerArea'
import DesktopSidebar from './DesktopSidebar'
import MobileChatOverlay from './MobileChatOverlay'
import VideoModal from './VideoModal'
import MembersModal from './MembersModal'

export default function RoomPage() {
  const params = useParams()
  const roomId = params.roomId as string

  // ── Auth ──
  const [nickname, setNickname] = useState('')
  const [nicknameSet, setNicknameSet] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [showPolina, setShowPolina] = useState(false)

  // ── Socket ──
  const [socket, setSocket] = useState<Socket | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [mySocketId, setMySocketId] = useState('')

  // ── Room state ──
  const [members, setMembers] = useState<Member[]>([])
  const [memberTimes, setMemberTimes] = useState<Record<string, number>>({})
  const [myCurrentTime, setMyCurrentTime] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const messagesRef = useRef<Message[]>([])
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const isLoadingMoreRef = useRef(false)

  // ── Video ──
  const [videoUrl, setVideoUrl] = useState('')
  const [videoUrlInput, setVideoUrlInput] = useState('')
  const [resolvingVideo, setResolvingVideo] = useState(false)
  const [initialTime, setInitialTime] = useState(0)

  // ── UI ──
  const [isMobile, setIsMobile] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const chatOpenRef = useRef(false)
  const [unread, setUnread] = useState(0)
  const [chatInput, setChatInput] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({})
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const toastCounter = useRef(0)

  const chatInputRef = useRef<HTMLInputElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)
  const mobileChatScrollRef = useRef<HTMLDivElement>(null)
  const mobileChatEndRef = useRef<HTMLDivElement>(null)

  const [myCountry] = useState(() => getCountryInfo())

  // ── Init ──
  useEffect(() => {
    const saved = localStorage.getItem('moparty_nickname')
    if (saved) setNicknameInput(saved)
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Scroll on new messages ──
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

  // ── Socket connection ──
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
      if (userId !== s.id) addToast({ id: 'play', text: `▶ ${nickname} запустил видео`, type: 'action' }, 3000)
    })
    s.on('player_pause', ({ nickname, userId }: any) => {
      if (userId !== s.id) addToast({ id: 'pause', text: `⏸ ${nickname} поставил на паузу`, type: 'action' }, 3000)
    })
    s.on('player_seek', ({ nickname, userId }: any) => {
      if (userId !== s.id) addToast({ id: 'seek', text: `⏩ ${nickname} перемотал`, type: 'action' }, 3000)
    })

    s.on('chat_message', (msg: Message) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        const next = [...prev, msg]
        if (next.length > 200) next.shift()
        messagesRef.current = next
        return next
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

    s.on('more_messages', ({ messages: older, hasMore }: any) => {
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

  // ── Helpers ──
  const addToast = (toast: Omit<Toast, never>, duration: number) => {
    const uniqueId = toast.type === 'action' ? toast.id : `${toast.id}_${++toastCounter.current}`
    const t = { ...toast, id: uniqueId }
    if (toastTimers.current[uniqueId]) clearTimeout(toastTimers.current[uniqueId])
    setToasts(prev => [...prev.filter(x => x.id !== uniqueId), t])
    toastTimers.current[uniqueId] = setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== uniqueId))
      delete toastTimers.current[uniqueId]
    }, duration)
  }

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
      setTimeout(() => mobileChatEndRef.current?.scrollIntoView({ behavior: 'instant' }), 380)
    }
    setUnread(0)
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
    if (isPolina(nicknameInput.trim())) setShowPolina(true)
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

  // ── Screens ──
  if (showPolina) return <PolinaScreen onEnter={() => { setShowPolina(false); setNicknameSet(true) }} />
  if (!nicknameSet) return <NicknameScreen nicknameInput={nicknameInput} onChange={setNicknameInput} onEnter={handleEnter} />

  // ── Room ──
  return (
    <div className="room-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', position: 'relative', overflow: 'hidden' }}>
      <style>{GLOBAL_STYLES}</style>

      <RoomHeader
        members={members}
        isMobile={isMobile}
        copied={copied}
        onCopyInvite={copyInvite}
        onOpenMembers={() => setShowMembersModal(true)}
        onOpenVideoModal={() => setShowVideoModal(true)}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        <PlayerArea
          videoUrl={videoUrl}
          socket={socket}
          roomId={roomId}
          initialTime={initialTime}
          isMobile={isMobile}
          chatOpen={chatOpen}
          unread={unread}
          onOpenChat={() => handleChatOpen(true)}
          onOpenVideoModal={() => setShowVideoModal(true)}
        />

        {!isMobile && (
          <DesktopSidebar
            members={members}
            mySocketId={mySocketId}
            myCurrentTime={myCurrentTime}
            memberTimes={memberTimes}
            messages={messages}
            chatInput={chatInput}
            onInputChange={handleChatInput}
            sendChat={sendChat}
            showEmoji={showEmoji}
            setShowEmoji={setShowEmoji}
            addEmoji={addEmoji}
            chatInputRef={chatInputRef}
            chatEndRef={chatEndRef}
            typingUsers={typingUsers}
            hasMoreMessages={hasMoreMessages}
            loadingMore={loadingMore}
            onLoadMore={loadMoreMessages}
            chatScrollRef={chatScrollRef}
            myNickname={nickname}
          />
        )}
      </div>

      {isMobile && chatOpen && (
        <MobileChatOverlay
          messages={messages}
          chatInput={chatInput}
          onInputChange={handleChatInput}
          sendChat={sendChat}
          showEmoji={showEmoji}
          setShowEmoji={setShowEmoji}
          addEmoji={addEmoji}
          chatInputRef={chatInputRef}
          mobileChatEndRef={mobileChatEndRef}
          mobileChatScrollRef={mobileChatScrollRef}
          mySocketId={mySocketId}
          myNickname={nickname}
          typingUsers={typingUsers}
          hasMoreMessages={hasMoreMessages}
          loadingMore={loadingMore}
          onLoadMore={loadMoreMessages}
          onClose={() => handleChatOpen(false)}
        />
      )}

      {showVideoModal && (
        <VideoModal
          videoUrlInput={videoUrlInput}
          resolvingVideo={resolvingVideo}
          onChange={setVideoUrlInput}
          onSubmit={setVideoFromUrl}
          onFileChange={setVideoFromFile}
          onClose={() => setShowVideoModal(false)}
        />
      )}

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