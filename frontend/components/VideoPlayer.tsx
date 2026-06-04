'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Socket } from 'socket.io-client'

interface Props {
  src: string
  socket: Socket | null
  roomId: string
}

export default function VideoPlayer({ src, socket, roomId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<any>(null)
  const isSyncing = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const initRef = useRef(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [buffered, setBuffered] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showRates, setShowRates] = useState(false)
  const [seeking, setSeeking] = useState(false)

  const isMobile = () => typeof window !== 'undefined' &&
    (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768)

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const resetHideTimer = useCallback(() => {
    setShowControls(true)
    clearTimeout(hideTimer.current ?? undefined)
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, 3000)
  }, [playing])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const init = async () => {
      try {
        const vjsModule = await import('video.js')
        const videojs = vjsModule.default
        await import('video.js/dist/video-js.css')

        if (!videoRef.current) return

        const player = videojs(videoRef.current, {
          controls: false,
          autoplay: false,
          preload: 'auto',
          fill: true,
          muted: false,
          volume: 1,
          sources: [{
            src: src.split('||')[0],
            type: src.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'
          }],
          html5: {
            vhs: {
              overrideNative: !isMobile(),
              smoothQualityChange: true,
              handleManifestRedirects: true,
            },
            nativeVideoTracks: isMobile(),
            nativeAudioTracks: isMobile(),
            nativeTextTracks: false,
          },
        })

        playerRef.current = player
        ;(window as any).__mopartyPlayer = player

        player.ready(() => {
          player.muted(false)
          player.volume(1)
          setReady(true)
        })

        player.on('play', () => {
          setPlaying(true)
          if (!isSyncing.current) socket?.emit('player_play', { roomId, currentTime: player.currentTime() })
        })
        player.on('pause', () => {
          setPlaying(false)
          if (!isSyncing.current) socket?.emit('player_pause', { roomId, currentTime: player.currentTime() })
        })
        player.on('seeked', () => {
          if (!isSyncing.current) socket?.emit('player_seek', { roomId, currentTime: player.currentTime() })
        })
        player.on('timeupdate', () => setCurrentTime(player.currentTime() || 0))
        player.on('durationchange', () => setDuration(player.duration() || 0))
        player.on('volumechange', () => {
          setVolume(player.volume() ?? 1)
          setMuted(player.muted() ?? false)
        })
        player.on('progress', () => {
          const buf = player.bufferedPercent()
          setBuffered(buf * 100)
        })
        player.on('ratechange', () => setPlaybackRate(player.playbackRate() ?? 1))
        player.on('error', () => console.warn('[VideoPlayer]', player.error()?.message))

      } catch (e) {
        console.error('VideoPlayer init failed:', e)
      }
    }

    init()

    return () => {
      clearTimeout(hideTimer.current ?? undefined)
      delete (window as any).__mopartyPlayer
      if (playerRef.current) {
        try { playerRef.current.dispose() } catch {}
        playerRef.current = null
      }
      initRef.current = false
    }
  }, [src])

  // Socket sync
  useEffect(() => {
    if (!socket) return

    const syncPlay = ({ currentTime: ct }: any) => {
      const p = playerRef.current
      if (!p) return
      isSyncing.current = true
      if (Math.abs(p.currentTime() - ct) > 1) p.currentTime(ct)
      p.play()?.catch(() => {}).finally(() => setTimeout(() => { isSyncing.current = false }, 500))
    }
    const syncPause = ({ currentTime: ct }: any) => {
      const p = playerRef.current
      if (!p) return
      isSyncing.current = true
      if (Math.abs(p.currentTime() - ct) > 1) p.currentTime(ct)
      p.pause()
      setTimeout(() => { isSyncing.current = false }, 200)
    }
    const syncSeek = ({ currentTime: ct }: any) => {
      const p = playerRef.current
      if (!p) return
      isSyncing.current = true
      p.currentTime(ct)
      setTimeout(() => { isSyncing.current = false }, 300)
    }

    socket.on('player_play', syncPlay)
    socket.on('player_pause', syncPause)
    socket.on('player_seek', syncSeek)
    return () => {
      socket.off('player_play', syncPlay)
      socket.off('player_pause', syncPause)
      socket.off('player_seek', syncSeek)
    }
  }, [socket])

  const togglePlay = () => {
    const p = playerRef.current
    if (!p) return
    p.paused() ? p.play() : p.pause()
    resetHideTimer()
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = playerRef.current
    if (!p) return
    const t = parseFloat(e.target.value)
    p.currentTime(t)
    setCurrentTime(t)
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = playerRef.current
    if (!p) return
    const v = parseFloat(e.target.value)
    p.volume(v)
    p.muted(v === 0)
  }

  const toggleMute = () => {
    const p = playerRef.current
    if (!p) return
    p.muted(!p.muted())
  }

  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  const setRate = (rate: number) => {
    playerRef.current?.playbackRate(rate)
    setPlaybackRate(rate)
    setShowRates(false)
  }

  const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => playing && setShowControls(false)}
      onTouchStart={resetHideTimer}
      onClick={() => {
        if (isMobile()) resetHideTimer()
        else togglePlay()
      }}
        style={{ width: '100%', height: '100%', minHeight: 240, position: 'relative', background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: showControls ? 'default' : 'none' }}
    >
      {/* Video.js element */}
      <div data-vjs-player style={{ width: '100%', height: '100%' }}>
        <video
          ref={videoRef}
          className="video-js"
          playsInline
        />
      </div>

      {/* Центральная кнопка play при паузе */}
      {ready && !playing && (
        <div
          onClick={togglePlay}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 2,
          }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'rgba(13,16,23,0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.15s, background 0.15s',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      )}

{/* Три островка */}
<div style={{
  position: 'absolute',
  bottom: 16,
  left: 0, right: 0,
  zIndex: 10,
  opacity: showControls ? 1 : 0,
  transition: 'opacity 0.3s ease',
  pointerEvents: showControls ? 'all' : 'none',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  padding: '0 16px',
  gap: 8,
}}>

  {/* Левый — громкость + play */}
  <div style={islandStyle}>
    <button onClick={togglePlay} style={btnStyle}>
      {playing ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M8 5v14l11-7z"/>
        </svg>
      )}
    </button>

    <button onClick={toggleMute} style={btnStyle}>
      {muted || volume === 0 ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <line x1="23" y1="9" x2="17" y2="15"/>
          <line x1="17" y1="9" x2="23" y2="15"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>
      )}
    </button>

    <input
      type="range" min={0} max={1} step={0.02}
      value={muted ? 0 : volume}
      onChange={handleVolume}
      className="volume-slider desktop-only"
      style={{ width: 60, cursor: 'pointer' }}
    />
  </div>

  {/* Центральный — прогресс + время */}
  <div style={{ ...islandStyle, flex: 1, maxWidth: 400, flexDirection: 'column', gap: 4, padding: '8px 14px' }}>
    {/* Прогресс */}
    <div style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center', width: '100%' }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, height: 3,
        background: 'rgba(255,255,255,0.12)', borderRadius: 100,
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${buffered}%`, background: 'rgba(255,255,255,0.2)', borderRadius: 100 }} />
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progressPercent}%`, background: 'var(--accent)', borderRadius: 100 }} />
      </div>
      <input
        type="range" min={0} max={duration || 100} step={0.1}
        value={currentTime}
        onChange={handleSeek}
        style={{ position: 'absolute', left: 0, right: 0, width: '100%', opacity: 0, cursor: 'pointer', height: 20, margin: 0 }}
      />
    </div>
    {/* Время */}
    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontVariantNumeric: 'tabular-nums', textAlign: 'center' }}>
      {formatTime(currentTime)} / {formatTime(duration)}
    </span>
  </div>

  {/* Правый — скорость + fullscreen */}
  <div style={islandStyle}>
    <div style={{ position: 'relative' }}>
      <button onClick={() => setShowRates(v => !v)} style={{ ...btnStyle, fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)', minWidth: 32 }}>
        {playbackRate}x
      </button>
      {showRates && (
        <div style={{
          position: 'absolute', bottom: 44, right: 0,
          background: 'rgba(13,16,23,0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, overflow: 'hidden', zIndex: 20,
        }}>
          {RATES.map(r => (
            <button key={r} onClick={() => setRate(r)} style={{
              display: 'block', width: '100%',
              padding: '8px 20px',
              background: r === playbackRate ? 'rgba(91,143,255,0.2)' : 'none',
              border: 'none',
              color: r === playbackRate ? 'var(--accent)' : 'rgba(255,255,255,0.8)',
              fontSize: 13, cursor: 'pointer', textAlign: 'center',
            }}>
              {r}x
            </button>
          ))}
        </div>
      )}
    </div>

    <button onClick={toggleFullscreen} style={btnStyle}>
      {isFullscreen ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      )}
    </button>
  </div>

</div>

      {/* Загрузка */}
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(9,11,16,0.6)',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Загрузка плеера...</div>
        </div>
      )}

      <style>{`
        .custom-player-island input[type=range] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        .volume-slider::-webkit-slider-runnable-track {
          height: 3px;
          background: rgba(255,255,255,0.2);
          border-radius: 100px;
        }
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px; height: 12px;
          border-radius: 50%;
          background: white;
          margin-top: -4.5px;
          cursor: pointer;
        }
        .volume-slider::-moz-range-track {
          height: 3px;
          background: rgba(255,255,255,0.2);
          border-radius: 100px;
        }
        .volume-slider::-moz-range-thumb {
          width: 12px; height: 12px;
          border-radius: 50%;
          background: white;
          border: none;
          cursor: pointer;
        }
        @media (max-width: 767px) {
          .volume-control { display: none !important; }
        }
        /* Убираем дефолтный контрол-бар */
        .video-js .vjs-control-bar { display: none !important; }
        .video-js .vjs-big-play-button { display: none !important; }
        .video-js .vjs-loading-spinner { 
          border-color: rgba(91,143,255,0.3) !important;
        }
        .video-js .vjs-loading-spinner:before,
        .video-js .vjs-loading-spinner:after {
          border-top-color: var(--accent) !important;
        }
      `}</style>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  width: 36, height: 36,
  background: 'none',
  border: 'none',
  borderRadius: 10,
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.15s',
  flexShrink: 0,
  color: 'white',
  fontSize: 13,
  padding: 0,
}

const islandStyle: React.CSSProperties = {
  background: 'rgba(13,16,23,0.72)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16,
  padding: '6px 10px',
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  flexShrink: 0,
}