import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  FONT_SIZE_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  THEME_OPTIONS,
  resolveSettings,
} from '../config/settings'
import { updateSettings, resetLearning } from '../services/settingsService'
import { updateNickname } from '../services/userService'
import { logout, resetPassword } from '../services/authService'
import {
  browserPermission,
  canUsePush,
  disableNotifications,
  enableNotifications,
} from '../services/notificationService'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { NICKNAME_MAX, validateNickname } from '../utils/nickname'
import { authErrorMessage } from '../utils/authErrors'
import { Section, Segmented, Toggle } from '../components/settings/Controls'
import ResetLearningDialog from '../components/settings/ResetLearningDialog'

const APP_VERSION = import.meta.env.VITE_APP_VERSION

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const settings = resolveSettings(profile.settings)
  const [message, setMessage] = useState(null) // { type: 'info' | 'error', text }
  const [showReset, setShowReset] = useState(false)

  const notify = (text, type = 'info') => setMessage({ type, text })

  // 설정 하나 저장 (화면은 Firestore 실시간 구독으로 바로 바뀜)
  async function save(changes) {
    try {
      await updateSettings(user.uid, changes)
    } catch (e) {
      console.error('[settings] 저장 실패', e)
      notify('설정을 저장하지 못했어요.', 'error')
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <Link to="/home" className="auth-link" aria-label="홈으로">‹ 홈</Link>
        <h1>설정</h1>
      </header>

      {message && (
        <p className={message.type === 'error' ? 'auth-error' : 'auth-info'} role="status">
          {message.text}
        </p>
      )}

      <AccountSection user={user} profile={profile} notify={notify} />

      <NotificationSection uid={user.uid} enabled={settings.notifications.enabled} notify={notify} />

      <Section title="화면·읽기">
        <Segmented
          label="글자 크기"
          options={FONT_SIZE_OPTIONS}
          value={settings.fontSize}
          onChange={(v) => save({ fontSize: v })}
        />
        <Segmented
          label="줄 간격"
          options={LINE_HEIGHT_OPTIONS}
          value={settings.lineHeight}
          onChange={(v) => save({ lineHeight: v })}
        />
        <p className="reading-preview">
          춘향은 자라면서 글과 바느질, 음악까지 두루 익혔고, 용모와 마음씨가 고을에 소문이 날 만큼 뛰어났다.
        </p>
        <Segmented
          label="테마"
          options={THEME_OPTIONS}
          value={settings.theme}
          onChange={(v) => save({ theme: v })}
        />
      </Section>

      <InstallSection />

      <Section title="정보">
        <Link to="/privacy" className="setting-row setting-link">개인정보 처리방침 <span>›</span></Link>
        <Link to="/terms" className="setting-row setting-link">이용약관 <span>›</span></Link>
        <div className="setting-row">
          <span className="setting-label">버전</span>
          <span className="setting-desc">{APP_VERSION} · Team MZ</span>
        </div>
      </Section>

      <Section title="기타">
        <button type="button" className="setting-row setting-link" onClick={logout}>
          로그아웃
        </button>
        <button type="button" className="setting-row setting-link danger" onClick={() => setShowReset(true)}>
          학습 기록 초기화
        </button>
      </Section>

      {showReset && (
        // 초기화되면 레벨 0 → 가드가 자동으로 초기 진단 화면으로 보낸다
        <ResetLearningDialog onConfirm={() => resetLearning(user.uid)} onCancel={() => setShowReset(false)} />
      )}
    </div>
  )
}

function AccountSection({ user, profile, notify }) {
  const [name, setName] = useState(profile.name)
  const [busy, setBusy] = useState(false)
  const changed = name.trim() !== profile.name

  async function saveName(e) {
    e.preventDefault()
    const trimmed = name.trim()
    const invalid = validateNickname(trimmed)
    if (invalid) return notify(invalid, 'error')
    setBusy(true)
    try {
      await updateNickname(user.uid, trimmed)
      notify('닉네임을 바꿨어요.')
    } catch (err) {
      console.error(err)
      notify('닉네임을 저장하지 못했어요.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function sendReset() {
    setBusy(true)
    try {
      await resetPassword(user.email)
      notify(`${user.email}로 비밀번호 재설정 메일을 보냈어요.`)
    } catch (err) {
      notify(authErrorMessage(err) ?? '메일을 보내지 못했어요.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="계정">
      <form className="setting-row" onSubmit={saveName}>
        <label className="setting-label" htmlFor="nickname">닉네임</label>
        <div className="inline-edit">
          <input
            id="nickname"
            className="text-input"
            value={name}
            maxLength={NICKNAME_MAX}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn btn-small" disabled={!changed || busy}>저장</button>
        </div>
      </form>
      <div className="setting-row">
        <span className="setting-label">이메일</span>
        <span className="setting-desc">{user.email}</span>
      </div>
      {profile.provider === 'password' ? (
        <button type="button" className="setting-row setting-link" onClick={sendReset} disabled={busy}>
          비밀번호 변경 <span className="setting-desc">재설정 메일 보내기 ›</span>
        </button>
      ) : (
        <div className="setting-row">
          <span className="setting-label">로그인 방식</span>
          <span className="setting-desc">Google 계정</span>
        </div>
      )}
    </Section>
  )
}

function NotificationSection({ uid, enabled, notify }) {
  const [supported, setSupported] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    canUsePush().then(setSupported)
  }, [])

  async function toggle(on) {
    setBusy(true)
    try {
      if (on) {
        await enableNotifications(uid)
        notify('알림을 켰어요.')
      } else {
        await disableNotifications(uid)
        notify('알림을 껐어요.')
      }
    } catch (e) {
      console.error('[notification]', e)
      notify(e.message || '알림 설정을 바꾸지 못했어요.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const blocked = browserPermission() === 'denied'

  return (
    <Section title="알림">
      <Toggle
        label="알림 받기"
        desc={
          supported === false
            ? '이 브라우저는 알림을 지원하지 않아요. (아이폰은 홈 화면에 앱을 추가해야 해요)'
            : blocked
              ? '브라우저에서 알림이 차단돼 있어요. 사이트 설정에서 허용해주세요.'
              : undefined
        }
        checked={enabled}
        onChange={toggle}
        disabled={busy || supported === false}
      />
    </Section>
  )
}

function InstallSection() {
  const { status, install } = useInstallPrompt()

  let content
  if (status === 'installed') {
    content = <span className="setting-desc">이미 앱으로 설치되어 있어요 ✓</span>
  } else if (status === 'ready') {
    content = (
      <button type="button" className="btn btn-small" onClick={install}>설치</button>
    )
  } else if (status === 'ios') {
    content = <span className="setting-desc">Safari 공유 버튼 → ‘홈 화면에 추가’</span>
  } else {
    content = <span className="setting-desc">브라우저 메뉴에서 ‘앱 설치’를 선택하세요</span>
  }

  return (
    <Section title="앱">
      <div className="setting-row">
        <span className="setting-label">홈 화면에 설치</span>
        {content}
      </div>
    </Section>
  )
}
