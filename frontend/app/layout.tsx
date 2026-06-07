import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Moparty - смотрите вместе',
  description: 'Совместный просмотр фильмов на расстоянии',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
