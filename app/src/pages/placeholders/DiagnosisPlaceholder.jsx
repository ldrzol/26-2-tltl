import { updateDoc, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '../../contexts/AuthContext'
import { userDoc } from '../../services/userService'
import { logout } from '../../services/authService'

/**
 * 임시 화면 — 초기 진단 테스트(전예랑 담당)가 들어올 자리
 * 로그인 → level 0 → 이 화면 → level 1 → 홈 흐름을 테스트하기 위한 버튼만 있음
 */
export default function DiagnosisPlaceholder() {
  const { user, profile } = useAuth()

  function finishDiagnosis() {
    return updateDoc(userDoc(user.uid), { level: 1, updatedAt: serverTimestamp() })
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">초기 진단 테스트</h1>
        <p className="auth-muted">
          {profile.name}님, 현재 레벨 {profile.level}
          <br />
          (진단 테스트 화면이 들어올 자리예요)
        </p>
        <button type="button" className="btn btn-primary" onClick={finishDiagnosis}>
          [임시] 진단 완료 → 레벨 1
        </button>
        <button type="button" className="auth-link" onClick={logout}>
          로그아웃
        </button>
      </div>
    </div>
  )
}
