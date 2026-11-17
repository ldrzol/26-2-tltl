import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LevelBadge from '../../components/LevelBadge'
import EnergyBadge from '../../components/EnergyBadge'

/** 임시 화면 — 메인 홈(박초이 담당 UI)이 들어올 자리 */
export default function HomePlaceholder() {
  const { profile } = useAuth()

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">{profile.name}</h1>
        <EnergyBadge energy={profile.energy} />
        <LevelBadge exp={profile.exp ?? 0} level={profile.level} />
        <p className="auth-muted">(메인 홈 화면이 들어올 자리예요)</p>
        <Link to="/settings" className="auth-link">설정</Link>
        {import.meta.env.DEV && (
          <Link to="/dev/rewards" className="auth-link">[개발용] 보상 테스트</Link>
        )}
      </div>
    </div>
  )
}
