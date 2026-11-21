import { useEffect } from 'react'
import { resolveSettings } from '../config/settings'

const CACHE_KEY = 'ddorang:display-settings'

function apply({ fontSize, lineHeight, theme }) {
  const root = document.documentElement
  root.dataset.fontSize = fontSize
  root.dataset.lineHeight = lineHeight
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
}

/** 앱 시작 직후(로그인 확인 전) 지난번 화면 설정을 먼저 적용 → 화면 깜빡임 방지 */
export function applyCachedDisplaySettings() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    apply(resolveSettings(cached ?? {}))
  } catch {
    apply(resolveSettings())
  }
}

/**
 * 로그인한 사용자의 화면 설정(글자 크기·줄 간격·테마)을 <html>에 적용
 * CSS는 html[data-font-size] 등을 보고 --reading-font-size 같은 변수를 바꾼다 (styles/settings.css)
 * profile이 없으면(로딩 중·로그아웃) 아무것도 바꾸지 않고 캐시된 설정을 유지
 */
export function useApplySettings(profile) {
  const ready = Boolean(profile)
  const { fontSize, lineHeight, theme } = resolveSettings(profile?.settings)

  useEffect(() => {
    if (!ready) return
    const display = { fontSize, lineHeight, theme }
    apply(display)
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(display))
    } catch {
      // 저장 공간을 못 쓰는 환경(시크릿 모드 등)이면 캐시만 생략
    }
  }, [ready, fontSize, lineHeight, theme])
}
