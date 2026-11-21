import { useEffect, useState } from 'react'

// 브라우저는 beforeinstallprompt를 페이지 로드 직후 한 번만 보낸다.
// 설정 화면에 들어가기 전에 지나가 버리지 않도록 모듈이 로드될 때부터 잡아둔다.
let deferredPrompt = null
const listeners = new Set()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    listeners.forEach((fn) => fn())
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    listeners.forEach((fn) => fn())
  })
}

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  )
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

/**
 * 홈 화면에 설치
 * - status: 'installed'(이미 앱으로 실행 중) | 'ready'(설치 버튼 가능) | 'ios'(수동 안내) | 'unavailable'
 * ⚠️ 'ready'가 되려면 앱에 PWA 설정(manifest, 서비스워커)이 있어야 함
 */
export function useInstallPrompt() {
  const [, rerender] = useState(0)

  useEffect(() => {
    const fn = () => rerender((n) => n + 1)
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])

  let status = 'unavailable'
  if (isStandalone()) status = 'installed'
  else if (deferredPrompt) status = 'ready'
  else if (isIos()) status = 'ios'

  async function install() {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    rerender((n) => n + 1)
    return outcome === 'accepted'
  }

  return { status, install }
}
