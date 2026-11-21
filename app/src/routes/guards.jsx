import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/** 로그인 상태·레벨에 따라 가야 할 첫 화면 */
// eslint-disable-next-line react-refresh/only-export-components
export function landingPath(user, profile) {
  if (!user) return '/login'
  if (!profile) return null // 프로필 문서 생성 대기 중
  if (profile.needsNickname) return '/nickname'
  return profile.level >= 1 ? '/home' : '/diagnosis'
}

export function FullScreenLoading() {
  return (
    <div className="auth-page">
      <p className="auth-muted">불러오는 중…</p>
    </div>
  )
}

/** 로그인 안 한 사람만 (로그인·회원가입 화면). 로그인되면 자동 이동 */
export function PublicOnlyRoute() {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullScreenLoading />
  const to = landingPath(user, profile)
  if (user && to) return <Navigate to={to} replace />
  return <Outlet />
}

/** 닉네임을 아직 안 정한 사람만 (구글 첫 가입) */
export function NicknameRoute() {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullScreenLoading />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <FullScreenLoading />
  if (!profile.needsNickname) return <Navigate to={landingPath(user, profile)} replace />
  return <Outlet />
}

/** 로그인 필수. 닉네임 미설정이면 닉네임 화면으로, 레벨 범위 밖이면 맞는 화면으로 */
export function ProtectedRoute({ minLevel = 0, maxLevel = Infinity }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullScreenLoading />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <FullScreenLoading />
  if (profile.needsNickname || profile.level < minLevel || profile.level > maxLevel) {
    return <Navigate to={landingPath(user, profile)} replace />
  }
  return <Outlet />
}
