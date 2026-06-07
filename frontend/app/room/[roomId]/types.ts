export interface Message {
  id: string
  type: 'message' | 'system'
  userId?: string
  nickname?: string
  text: string
  ts: number
}

export interface Member {
  id: string
  nickname: string
  messageCount?: number
  country?: { flag: string; name: string }
}

export interface Toast {
  id: string
  text: string
  type: 'action' | 'chat'
  nickname?: string
}

export const getCountryInfo = (): { flag: string; name: string } => {
  if (typeof navigator === 'undefined') return { flag: ' ', name: 'Unknown' }
  const lang = navigator.language || ''
  const map: Record<string, { flag: string; name: string }> = {
    'ru':    { flag: '🇷🇺', name: 'Россия' },
    'ru-RU': { flag: '🇷🇺', name: 'Россия' },
    'en-US': { flag: '🇺🇸', name: 'США' },
    'en-GB': { flag: '🇬🇧', name: 'Великобритания' },
    'uk':    { flag: '🇺🇦', name: 'Украина' },
    'be':    { flag: '🇧🇾', name: 'Беларусь' },
    'kk':    { flag: '🇰🇿', name: 'Казахстан' },
    'de':    { flag: '🇩🇪', name: 'Германия' },
    'fr':    { flag: '🇫🇷', name: 'Франция' },
    'es':    { flag: '🇪🇸', name: 'Испания' },
    'tr':    { flag: '🇹🇷', name: 'Турция' },
    'pl':    { flag: '🇵🇱', name: 'Польша' },
    'fi':    { flag: '🇫🇮', name: 'Финляндия' },
    'ja':    { flag: '🇯🇵', name: 'Япония' },
    'zh':    { flag: '🇨🇳', name: 'Китай' },
  }
  return map[lang] || map[lang.split('-')[0]] || { flag: ' ', name: lang || 'Unknown' }
}

export const isPolina = (name: string) => {
  const n = name.trim().toLowerCase()
  return (
    n.startsWith('полин') || n.startsWith('поля') ||
    n.startsWith('полян') || n.startsWith('палин') || n === 'пол' || n.startsWith('чепурка')
  )
}

export const formatTime = (sec: number) => {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}