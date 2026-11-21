/* 알림 수신용 서비스워커 (Firebase Cloud Messaging)
 * - 앱이 꺼져 있거나 다른 탭에 있을 때 도착한 알림을 화면에 띄운다
 * - PWA 서비스워커와 겹치지 않도록 별도 scope로 등록함 (src/services/notificationService.js)
 */

self.addEventListener('push', (event) => {
  let payload
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { notification: { body: event.data && event.data.text() } }
  }

  const n = payload.notification || {}
  const data = payload.data || {}
  const title = n.title || data.title || '또랑또랑'
  const options = {
    body: n.body || data.body || '오늘의 학습을 시작해 볼까요?',
    icon: n.icon || '/favicon.svg',
    data: { url: data.url || (payload.fcmOptions && payload.fcmOptions.link) || '/' },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// 알림을 누르면 앱 열기 (이미 열려 있으면 그 창으로)
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const opened = windows.find((w) => w.url.startsWith(self.location.origin))
      if (opened) {
        opened.focus()
        return opened.navigate ? opened.navigate(url) : undefined
      }
      return self.clients.openWindow(url)
    }),
  )
})
