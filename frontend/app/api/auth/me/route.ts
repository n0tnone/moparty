import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, cookieName } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(cookieName())?.value
  if (!token) return NextResponse.json({ user: null })

  const user = await verifyToken(token)
  if (!user) return NextResponse.json({ user: null })

  return NextResponse.json({ user })
}