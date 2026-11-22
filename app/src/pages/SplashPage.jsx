import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { landingPath } from '../routes/guards'
import logo from '../assets/figma/logo-splash.svg'

const MIN_SPLASH_MS = 1200

/** 앱 첫 화면 (Figma "시작 화면"): 보라 배경 + 로고 → 로그인 상태에 따라 이동 */
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
      <img src={logo} alt="또랑또랑" className="splash-logo" width="200" height="56" />
    </div>
  )
}
