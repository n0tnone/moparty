// VideoPlayer.tsx — полная замена

'use client'

import { useEffect, useRef } from 'react'
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

  useEffect(() => {
    let player: any

    const init = async () => {
      const vjsModule = await import('video.js')
      const videojs = vjsModule.default
      await import('video.js/dist/video-js.css')

      if (!videoRef.current) return

      player = videojs(videoRef.current, {
        controls: true,
        autoplay: false,
        preload: 'auto',
        // fluid и responsive убраны — они ломают layout при ресайзе
        fill: true,
        muted: false,
        volume: 1,
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        sources: [{
          src: src.split('||')[0],
          type: src.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'
        }],
        controlBar: {
          children: [
            'playToggle',
            'volumePanel',
            'currentTimeDisplay',
            'timeDivider',
            'durationDisplay',
            'progressControl',
            'playbackRateMenuButton',
            'fullscreenToggle',
          ],
        },
        html5: {
          vhs: { overrideNative: true },
          nativeVideoTracks: false,
          nativeAudioTracks: false,
          nativeTextTracks: false,
        },
      })

      playerRef.current = player
      ;(window as any).__mopartyPlayer = player

      player.ready(() => {
        player.muted(false)
        player.volume(1)
      })

      // Изолируем ошибку — не даём всплыть наружу
      player.on('error', () => {
        const err = player.error()
        console.warn('[VideoPlayer] local error:', err?.message)
        // Показываем ошибку только локально, не эмитим в сокет
      })

      player.on('play', () => {
        if (isSyncing.current) return
        socket?.emit('player_play', { roomId, currentTime: player.currentTime() })
      })

      player.on('pause', () => {
        if (isSyncing.current) return
        socket?.emit('player_pause', { roomId, currentTime: player.currentTime() })
      })

      player.on('seeked', () => {
        if (isSyncing.current) return
        socket?.emit('player_seek', { roomId, currentTime: player.currentTime() })
      })
    }

    init()

    return () => {
      delete (window as any).__mopartyPlayer
      if (playerRef.current) {
        try { playerRef.current.dispose() } catch {}
        playerRef.current = null
      }
    }
  }, [src])

  useEffect(() => {
    if (!socket) return

    const syncPlay = ({ currentTime }: { currentTime: number }) => {
      const p = playerRef.current
      if (!p) return
      isSyncing.current = true
      if (Math.abs(p.currentTime() - currentTime) > 1) p.currentTime(currentTime)
      p.play().finally(() => { isSyncing.current = false })
    }

    const syncPause = ({ currentTime }: { currentTime: number }) => {
      const p = playerRef.current
      if (!p) return
      isSyncing.current = true
      if (Math.abs(p.currentTime() - currentTime) > 1) p.currentTime(currentTime)
      p.pause()
      setTimeout(() => { isSyncing.current = false }, 200)
    }

    const syncSeek = ({ currentTime }: { currentTime: number }) => {
      const p = playerRef.current
      if (!p) return
      isSyncing.current = true
      p.currentTime(currentTime)
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

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 240, position: 'relative' }}>
      <div data-vjs-player style={{ width: '100%', height: '100%' }}>
        <video
          ref={videoRef}
          className="video-js vjs-big-play-centered"
          playsInline
        />
      </div>
    </div>
  )
}