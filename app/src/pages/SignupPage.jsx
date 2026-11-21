import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signUpWithEmail, signInWithGoogle } from '../services/authService'
import { authErrorMessage } from '../utils/authErrors'
import GoogleButton from '../components/GoogleButton'
import { NICKNAME_MAX, validateNickname } from '../utils/nickname'

function validate({ name, email, password, passwordConfirm }) {
  const nameError = validateNickname(name)
  if (nameError) return nameError
  if (!email) return '이메일을 입력해주세요.'
  if (password.length < 6) return '비밀번호는 6자 이상이어야 해요.'
  if (password !== passwordConfirm) return '비밀번호가 서로 달라요.'
  return null
}

// 가입 성공 → users 문서(level 0) 생성 → PublicOnlyRoute가 진단 테스트 화면으로 보낸다
export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirm: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function run(action) {
    setError('')
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
    const values = { ...form, name: form.name.trim(), email: form.email.trim() }
    const invalid = validate(values)
    if (invalid) {
      setError(invalid)
      return
    }
    run(() => signUpWithEmail(values))
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">회원가입</h1>
        <p className="auth-muted">또랑또랑과 문해력 여행을 시작해요</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label>
            닉네임
            <input
              type="text"
              autoComplete="nickname"
              maxLength={NICKNAME_MAX}
              value={form.name}
              onChange={update('name')}
              required
            />
          </label>
          <label>
            이메일
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
              required
            />
          </label>
          <label>
            비밀번호 <span className="auth-hint">(6자 이상)</span>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
              required
            />
          </label>
          <label>
            비밀번호 확인
            <input
              type="password"
              autoComplete="new-password"
              value={form.passwordConfirm}
              onChange={update('passwordConfirm')}
              required
            />
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '가입 중…' : '가입하기'}
          </button>
        </form>

        <div className="auth-divider"><span>또는</span></div>

        <GoogleButton onClick={() => run(signInWithGoogle)} disabled={submitting} label="Google로 시작하기" />

        <p className="auth-muted">
          이미 계정이 있나요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  )
}
