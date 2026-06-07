import { SignJWT, jwtVerify } from 'jose'

export interface VKUser {
  vkId: number
  firstName: string
  lastName: string
  avatar: string | null  // null если дефолтная аватарка ВК
  nickname: string       // сохранённый никнейм или firstName по умолчанию
}

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
const COOKIE_NAME = 'moparty_auth'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 дней

export async function signToken(user: VKUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<VKUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as VKUser
  } catch {
    return null
  }
}

export function cookieName() {
  return COOKIE_NAME
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  }
}

export function isDefaultVKAvatar(url: string): boolean {
  return (
    url.includes('camera_200') ||
    url.includes('no_photo') ||
    url.includes('question_rec') ||
    url.includes('blind_prof') ||
    /vk\.com\/images\/camera/.test(url)
  )
}