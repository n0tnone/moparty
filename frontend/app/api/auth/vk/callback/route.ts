import { NextRequest, NextResponse } from 'next/server'
import { signToken, isDefaultVKAvatar, cookieName, cookieOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { vk_id, first_name, last_name, photo_200 } = await req.json()

    if (!vk_id || !first_name) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    }

    const avatar = photo_200 && !isDefaultVKAvatar(photo_200) ? photo_200 : null

    const user = {
      vkId: vk_id,
      firstName: first_name,
      lastName: last_name,
      avatar,
      nickname: first_name,
    }

    const token = await signToken(user)
    const res = NextResponse.json({ ok: true, user })
    res.cookies.set(cookieName(), token, cookieOptions())
    return res
  } catch (e) {
    console.error('VK auth callback error:', e)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}