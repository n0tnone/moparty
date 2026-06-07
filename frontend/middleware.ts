import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, cookieName } from '@/lib/auth'

// Роуты которые требуют авторизации
const PROTECTED = ['/', '/room']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtected = PROTECTED.some(p =>
    pathname === p || pathname.startsWith('/room/')
  )

  if (!isProtected) return NextResponse.next()

  const token = req.cookies.get(cookieName())?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const user = await verifyToken(token)
  if (!user) {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.set(cookieName(), '', { maxAge: 0, path: '/' })
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/room/:path*'],
}