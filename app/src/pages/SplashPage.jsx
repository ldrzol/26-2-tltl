import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { landingPath } from '../routes/guards'

const MIN_SPLASH_MS = 1200

/** 앱 첫 화면: 로고를 잠깐 보여주고 로그인 상태에 따라 이동 */
export default function SplashPage() {
  const { user, profile, loading } = useAuth()
  const [minTimePassed, setMinTimePassed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), MIN_SPLASH_MS)
    return () => clearTimeout(t)
  }, [])

  const to = loading ? null : landingPath(user, profile)
  if (minTimePassed && to) return <Navigate to={to} replace />

  return (
    <div className="auth-page splash">
      {/* TODO: 로고 이미지 확정되면 교체 */}
      <h1 className="splash-logo">또랑또랑</h1>
      <p className="auth-muted">매일 한 걸음, 문해력 키우기</p>
    </div>
  )
}
