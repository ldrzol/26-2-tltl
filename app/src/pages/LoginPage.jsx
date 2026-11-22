import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signInWithEmail, signInWithGoogle, resetPassword } from '../services/authService'
import { authErrorMessage } from '../utils/authErrors'
import GoogleButton from '../components/GoogleButton'
import logo from '../assets/figma/logo.svg'
import { TopBar } from '../components/AppChrome'

// 로그인에 성공하면 AuthContext가 바뀌고 PublicOnlyRoute가 알아서 다음 화면으로 보낸다
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function run(action) {
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      await action()
    } catch (e) {
      const msg = authErrorMessage(e)
      if (msg) setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    run(() => signInWithEmail({ email: email.trim(), password }))
  }

  function handleReset() {
    if (!email.trim()) {
      setError('비밀번호를 재설정할 이메일을 먼저 입력해주세요.')
      return
    }
    run(async () => {
      await resetPassword(email.trim())
      setInfo('비밀번호 재설정 메일을 보냈어요. 메일함을 확인해주세요.')
    })
  }

  return (
    <div className="auth-page">
      <TopBar title="" to="/welcome" />
      <img src={logo} alt="또랑또랑" className="auth-logo" width="150" height="42" />
      <h1 className="auth-heading">다시 만나서 반가워요</h1>
      <p className="auth-sub">로그인하고 오늘의 학습을 이어가요</p>
      <div className="auth-card">
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="field-label">
            이메일
            <input
              className="field"
              type="email"
              placeholder="example@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field-label">
            비밀번호
            <input
              className="field"
              type="password"
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}
          {info && <p className="auth-info">{info}</p>}

          <button type="submit" className="btn btn-primary btn-lg btn-submit" disabled={submitting}>
            {submitting ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <button type="button" className="auth-link" onClick={handleReset} disabled={submitting}>
          비밀번호를 잊으셨나요?
        </button>

        <div className="auth-divider"><span>또는</span></div>

        <GoogleButton onClick={() => run(signInWithGoogle)} disabled={submitting} />

        <p className="auth-foot">
          아직 계정이 없나요? <Link viewTransition to="/signup">회원가입</Link>
        </p>
      </div>
    </div>
  )
}
