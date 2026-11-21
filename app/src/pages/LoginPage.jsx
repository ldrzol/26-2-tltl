import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signInWithEmail, signInWithGoogle, resetPassword } from '../services/authService'
import { authErrorMessage } from '../utils/authErrors'
import GoogleButton from '../components/GoogleButton'

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
      <div className="auth-card">
        <h1 className="auth-title">또랑또랑</h1>
        <p className="auth-muted">로그인하고 학습을 이어가요</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label>
            이메일
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}
          {info && <p className="auth-info">{info}</p>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <button type="button" className="auth-link" onClick={handleReset} disabled={submitting}>
          비밀번호를 잊으셨나요?
        </button>

        <div className="auth-divider"><span>또는</span></div>

        <GoogleButton onClick={() => run(signInWithGoogle)} disabled={submitting} />

        <p className="auth-muted">
          아직 계정이 없나요? <Link to="/signup">회원가입</Link>
        </p>
      </div>
    </div>
  )
}
