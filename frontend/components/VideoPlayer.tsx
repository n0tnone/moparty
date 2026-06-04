'use client'

import { useEffect, useRef, useState } from 'react'
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
  const [videoJsLoaded, setVideoJsLoaded] = useState(false)
  const initRef = useRef(false)

  // Функция для определения мобильного устройства
  const isMobileDevice = () => {
    if (typeof window === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      || window.innerWidth < 768
  }

  useEffect(() => {
    // Предотвращаем повторную инициализацию
    if (initRef.current) return
    initRef.current = true

    let player: any

    const init = async () => {
      try {
        const vjsModule = await import('video.js')
        const videojs = vjsModule.default
        await import('video.js/dist/video-js.css')
        setVideoJsLoaded(true)

        if (!videoRef.current) {
          console.error('❌ Video ref is null')
          return
        }

        // Уничтожаем предыдущий плеер если есть
        if (playerRef.current) {
          try { playerRef.current.dispose() } catch (e) {}
          playerRef.current = null
        }

        player = videojs(videoRef.current, {
          controls: true,
          autoplay: false,
          preload: 'auto',
          fluid: false,
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
            vhs: { 
              overrideNative: !isMobileDevice(), // На мобилке используем нативные возможности
              smoothQualityChange: true,
              handleManifestRedirects: true,
            },
            nativeVideoTracks: isMobileDevice(),
            nativeAudioTracks: isMobileDevice(),
            nativeTextTracks: false,
          },
        })

        playerRef.current = player
        ;(window as any).__mopartyPlayer = player

        player.ready(() => {
          console.log('✅ Video.js player ready')
          player.muted(false)
          player.volume(1)
        })

        player.on('error', () => {
          const err = player.error()
          console.warn('[VideoPlayer] local error:', err?.message)
        })

        // Обработчики событий с защитой от рекурсии
        player.on('play', () => {
          if (isSyncing.current) {
            console.log('🔄 Ignoring play event (syncing)')
            return
          }
          const currentTime = player.currentTime()
          console.log('▶️ Emitting play:', currentTime)
          socket?.emit('player_play', { roomId, currentTime })
        })

        player.on('pause', () => {
          if (isSyncing.current) {
            console.log('🔄 Ignoring pause event (syncing)')
            return
          }
          const currentTime = player.currentTime()
          console.log('⏸️ Emitting pause:', currentTime)
          socket?.emit('player_pause', { roomId, currentTime })
        })

        player.on('seeked', () => {
          if (isSyncing.current) {
            console.log('🔄 Ignoring seeked event (syncing)')
            return
          }
          const currentTime = player.currentTime()
          console.log('⏩ Emitting seek:', currentTime)
          socket?.emit('player_seek', { roomId, currentTime })
        })

      } catch (error) {
        console.error('❌ Failed to initialize video.js:', error)
        
        // Fallback: используем нативный video элемент
        if (videoRef.current && !playerRef.current) {
          const nativeVideo = videoRef.current
          nativeVideo.controls = true
          nativeVideo.playsInline = true
          nativeVideo.src = src
          
          ;(window as any).__mopartyPlayer = {
            currentTime: () => nativeVideo.currentTime,
            play: () => nativeVideo.play(),
            pause: () => nativeVideo.pause(),
            on: () => {},
            off: () => {},
          }
        }
      }
    }

    init()

    return () => {
      delete (window as any).__mopartyPlayer
      if (playerRef.current) {
        try { playerRef.current.dispose() } catch {}
        playerRef.current = null
      }
      initRef.current = false
    }
  }, [src]) // Переинициализируем только при смене src

  // Синхронизация через сокет
  useEffect(() => {
    if (!socket) return

    const syncPlay = ({ currentTime, userId }: { currentTime: number; userId: string }) => {
      const p = playerRef.current
      if (!p) {
        console.warn('⚠️ Player not ready for play sync')
        return
      }
      
      console.log('📥 Sync play:', currentTime, 'from:', userId)
      isSyncing.current = true
      
      try {
        const timeDiff = Math.abs(p.currentTime() - currentTime)
        if (timeDiff > 1) {
          p.currentTime(currentTime)
        }
        
        // На мобилке play() может требовать пользовательского взаимодействия
        const playPromise = p.play()
        if (playPromise) {
          playPromise.catch((err: any) => {
            console.warn('⚠️ Play failed (might need user interaction):', err.message)
          }).finally(() => {
            setTimeout(() => {
              isSyncing.current = false
            }, 500)
          })
        } else {
          setTimeout(() => {
            isSyncing.current = false
          }, 500)
        }
      } catch (err) {
        console.error('❌ Sync play error:', err)
        isSyncing.current = false
      }
    }

    const syncPause = ({ currentTime, userId }: { currentTime: number; userId: string }) => {
      const p = playerRef.current
      if (!p) {
        console.warn('⚠️ Player not ready for pause sync')
        return
      }
      
      console.log('📥 Sync pause:', currentTime, 'from:', userId)
      isSyncing.current = true
      
      try {
        const timeDiff = Math.abs(p.currentTime() - currentTime)
        if (timeDiff > 1) {
          p.currentTime(currentTime)
        }
        p.pause()
      } catch (err) {
        console.error('❌ Sync pause error:', err)
      }
      
      setTimeout(() => {
        isSyncing.current = false
      }, 200)
    }

    const syncSeek = ({ currentTime, userId }: { currentTime: number; userId: string }) => {
      const p = playerRef.current
      if (!p) {
        console.warn('⚠️ Player not ready for seek sync')
        return
      }
      
      console.log('📥 Sync seek:', currentTime, 'from:', userId)
      isSyncing.current = true
      
      try {
        p.currentTime(currentTime)
      } catch (err) {
        console.error('❌ Sync seek error:', err)
      }
      
      setTimeout(() => {
        isSyncing.current = false
      }, 300)
    }

    socket.on('player_play', syncPlay)
    socket.on('player_pause', syncPause)
    socket.on('player_seek', syncSeek)

    return () => {
      socket.off('player_play', syncPlay)
      socket.off('player_pause', syncPause)
      socket.off('player_seek', syncSeek)
    }
  }, [socket, roomId])

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: 240, 
        position: 'relative',
        background: '#000',
      }}
    >
      {videoJsLoaded ? (
        <div data-vjs-player style={{ width: '100%', height: '100%' }}>
          <video
            ref={videoRef}
            className="video-js vjs-big-play-centered"
            playsInline
            // Добавляем атрибуты для мобильной совместимости
            webkit-playsinline="true"
            x5-playsinline="true"
            x-webkit-airplay="allow"
          />
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#fff',
          fontSize: 16,
        }}>
          Загрузка плеера...
        </div>
      )}
    </div>
  )
}