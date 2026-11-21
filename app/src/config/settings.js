/** 설정 기본값과 선택지 — users/{uid}.settings (docs/data-structure.md 11절) */

export const DEFAULT_SETTINGS = {
  fontSize: 'medium', // small | medium | large
  lineHeight: 'normal', // normal | wide
  theme: 'system', // system | light | dark
  notifications: {
    enabled: false,
  },
}

export const FONT_SIZE_OPTIONS = [
  { value: 'small', label: '작게' },
  { value: 'medium', label: '보통' },
  { value: 'large', label: '크게' },
]

export const LINE_HEIGHT_OPTIONS = [
  { value: 'normal', label: '보통' },
  { value: 'wide', label: '넓게' },
]

export const THEME_OPTIONS = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
]

/** 저장된 설정 + 기본값 합치기 (예전에 가입해 settings가 없는 사용자 대비) */
export function resolveSettings(saved = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...saved,
    notifications: { ...DEFAULT_SETTINGS.notifications, ...saved.notifications },
  }
}
