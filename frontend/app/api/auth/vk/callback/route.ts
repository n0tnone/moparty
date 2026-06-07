import { NextRequest, NextResponse } from 'next/server'
import { signToken, isDefaultVKAvatar, cookieName, cookieOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[CB] raw body:', JSON.stringify(body))
    console.log('[CB] access_token:', body.access_token)
    console.log('[CB] user_id:', body.user_id)

    const { access_token, user_id } = body

    if (!access_token || !user_id) {
      console.error('[CB] missing fields — access_token:', !!access_token, '| user_id:', !!user_id)
      return NextResponse.json({ error: 'missing token', got: { access_token: !!access_token, user_id } }, { status: 400 })
    }

    const vkUrl = `https://api.vk.com/method/users.get?user_ids=${user_id}&fields=photo_200&access_token=${access_token}&v=5.199`
    console.log('[CB] calling VK API:', vkUrl)

    const vkRes = await fetch(vkUrl)
    const vkData = await vkRes.json()
    console.log('[CB] VK API response:', JSON.stringify(vkData))

    if (vkData.error || !vkData.response?.[0]) {
      console.error('[CB] VK API error:', JSON.stringify(vkData.error))
      return NextResponse.json({ error: 'vk api error', detail: vkData.error }, { status: 400 })
    }

    const vkUser = vkData.response[0]
    const rawAvatar = vkUser.photo_200 || ''
    const avatar = rawAvatar && !isDefaultVKAvatar(rawAvatar) ? rawAvatar : null

    const user = {
      vkId: vkUser.id,
      firstName: vkUser.first_name,
      lastName: vkUser.last_name,
      avatar,
      nickname: vkUser.first_name,
    }

    console.log('[CB] user to sign:', JSON.stringify(user))

    const token = await signToken(user)
    const res = NextResponse.json({ ok: true, user })
    res.cookies.set(cookieName(), token, cookieOptions())
    return res
  } catch (e) {
    console.error('[CB] unhandled error:', e)
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}