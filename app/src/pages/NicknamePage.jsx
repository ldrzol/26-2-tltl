import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { updateNickname } from '../services/userService'
import { logout } from '../services/authService'
import { NICKNAME_MAX, validateNickname } from '../utils/nickname'
import logo from '../assets/figma/logo.svg'
import { TopBar } from '../components/AppChrome'

// 구글 첫 가입 시 닉네임 정하기. 저장되면 needsNickname=false → 가드가 진단 화면으로 보낸다
export default function NicknamePage() {
  const { user, profile } = useAuth()
  const [name, setName] = useState(() => (profile.name || '').slice(0, NICKNAME_MAX))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    const invalid = validateNickname(trimmed)
    if (invalid) {
      setError(invalid)
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await updateNickname(user.uid, trimmed)
    } catch (err) {
      console.error('[nickname] 저장 실패', err)
      setError('닉네임을 저장하지 못했어요. 잠시 후 다시 시도해주세요.')
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <TopBar title="" onBack={logout} />
      <img src={logo} alt="또랑또랑" className="auth-logo" width="150" height="42" />
      <h1 className="auth-heading">닉네임을 정해주세요</h1>
      <p className="auth-sub">또랑또랑에서 사용할 이름이에요</p>
      <div className="auth-card">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="field-label">
            닉네임
            <input
              className="field"
              type="text"
              placeholder="사용할 이름"
              autoComplete="nickname"
              maxLength={NICKNAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary btn-lg btn-submit" disabled={submitting}>
            {submitting ? '저장 중…' : '시작하기'}
          </button>
        </form>

        <button type="button" className="auth-link" onClick={logout} disabled={submitting}>
          다른 계정으로 로그인
        </button>
      </div>
    </div>
  )
}
