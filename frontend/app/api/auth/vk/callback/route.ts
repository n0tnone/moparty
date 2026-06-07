import { NextRequest, NextResponse } from 'next/server'
import { signToken, isDefaultVKAvatar, cookieName, cookieOptions } from '@/lib/auth'

// Этот endpoint вызывается VK SDK на клиенте через exchangeCode
// SDK сам обменивает code → access_token и передаёт сюда
export async function POST(req: NextRequest) {
  try {
    const { access_token, user_id } = await req.json()

    if (!access_token || !user_id) {
      return NextResponse.json({ error: 'missing token' }, { status: 400 })
    }

    // Получаем профиль юзера из VK API
    const vkRes = await fetch(
      `https://api.vk.com/method/users.get?user_ids=${user_id}&fields=photo_200&access_token=${access_token}&v=5.199`
    )
    const vkData = await vkRes.json()

    if (vkData.error || !vkData.response?.[0]) {
      return NextResponse.json({ error: 'vk api error' }, { status: 400 })
    }

    const vkUser = vkData.response[0]
    const rawAvatar = vkUser.photo_200 || ''
    const avatar = rawAvatar && !isDefaultVKAvatar(rawAvatar) ? rawAvatar : null

    const user = {
      vkId: vkUser.id,
      firstName: vkUser.first_name,
      lastName: vkUser.last_name,
      avatar,
      nickname: vkUser.first_name, // дефолт, юзер может поменять в комнате
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