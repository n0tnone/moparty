'use client'

import { useEffect, useState, memo } from 'react'

const cache = new Map<string, string>()

type IconName =
  | 'people' | 'share' | 'video' | 'chat' | 'close'
  | 'film' | 'send' | 'check' | 'folder' | 'clock'
  | 'message' | 'globe' | 'emoji'

interface IconProps {
  name: IconName
  size?: number
  className?: string
  style?: React.CSSProperties
}

const Icon = memo(({ name, size = 24, className, style }: IconProps) => {
  const [svg, setSvg] = useState<string>(() => cache.get(name) ?? '')

  useEffect(() => {
    if (cache.has(name)) {
      setSvg(cache.get(name)!)
      return
    }
    fetch(`/icons/${name}.svg`)
      .then(r => r.text())
      .then(text => {
        cache.set(name, text)
        setSvg(text)
      })
  }, [name])

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', width: size, height: size, flexShrink: 0, ...style }}
      dangerouslySetInnerHTML={svg ? { __html: svg.replace(/<svg/, `<svg width="${size}" height="${size}"`) } : undefined}
    />
  )
})

Icon.displayName = 'Icon'

export default Icon
export type { IconName }