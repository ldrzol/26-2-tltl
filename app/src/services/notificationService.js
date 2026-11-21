import { getMessaging, getToken, deleteToken, onMessage, isSupported } from 'firebase/messaging'
import { arrayRemove, arrayUnion, serverTimestamp, updateDoc } from 'firebase/firestore'
import { app } from '../firebase'
import { userDoc } from './userService'

/**
 * 푸시 알림 (Firebase Cloud Messaging)
 *
 * 흐름: 알림 켜기 → 브라우저 권한 요청 → 서비스워커 등록 → 기기 토큰 발급 → users.fcmTokens에 저장
 * 발송: 현재는 Firebase 콘솔 > Messaging 에서 직접 보낸다 (자동 발송은 유료 서버 필요)
 */

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY
const SW_URL = '/firebase-messaging-sw.js'
const SW_SCOPE = '/firebase-cloud-messaging-push-scope' // PWA 서비스워커와 분리
const TOKEN_KEY = 'ddorang:fcm-token'

export class NotificationError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

/** 이 브라우저에서 푸시를 쓸 수 있는지 */
export async function canUsePush() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false
  try {
    return await isSupported()
  } catch {
    return false
  }
}

export function browserPermission() {
  return 'Notification' in window ? Notification.permission : 'unsupported'
}

async function registerWorker() {
  return navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })
}

/** 알림 켜기: 권한 요청 → 토큰 저장 */
export async function enableNotifications(uid) {
  if (!(await canUsePush())) {
    throw new NotificationError('unsupported', '이 브라우저는 알림을 지원하지 않아요.')
  }
  if (!VAPID_KEY) {
    throw new NotificationError('no-vapid', '알림 설정값(VAPID 키)이 없어요. .env.local을 확인해주세요.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new NotificationError(
      'denied',
      '알림 권한이 꺼져 있어요. 브라우저 설정에서 이 사이트의 알림을 허용해주세요.',
    )
  }

  const registration = await registerWorker()
  const token = await getToken(getMessaging(app), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  })

  await updateDoc(userDoc(uid), {
    fcmTokens: arrayUnion(token),
    'settings.notifications.enabled': true,
    updatedAt: serverTimestamp(),
  })
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // 저장 못 해도 동작에는 문제 없음 (끌 때 토큰 정리만 못 함)
  }
  return token
}

/** 알림 끄기: 이 기기 토큰 삭제 */
export async function disableNotifications(uid) {
  let token = null
  try {
    token = localStorage.getItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // 무시
  }

  if (await canUsePush()) {
    try {
      await deleteToken(getMessaging(app))
    } catch (e) {
      console.warn('[notification] 토큰 삭제 실패', e)
    }
  }

  const data = { 'settings.notifications.enabled': false, updatedAt: serverTimestamp() }
  if (token) data.fcmTokens = arrayRemove(token)
  await updateDoc(userDoc(uid), data)
}

/** 앱을 보고 있는 중(포그라운드)에 도착한 알림도 화면에 띄우기 */
export async function listenForegroundMessages() {
  if (!(await canUsePush()) || browserPermission() !== 'granted') return () => {}
  const registration = await registerWorker()
  return onMessage(getMessaging(app), (payload) => {
    const n = payload.notification || {}
    registration.showNotification(n.title || '또랑또랑', {
      body: n.body || '',
      icon: '/favicon.svg',
      data: { url: payload.data?.url || '/' },
    })
  })
}
