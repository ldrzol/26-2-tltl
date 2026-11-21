import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getEpisode } from '../../content'
import LevelBadge from '../../components/LevelBadge'
import EnergyBadge from '../../components/EnergyBadge'

/** 임시 화면 — 메인 홈(박초이 담당 UI)이 들어올 자리 */
export default function HomePlaceholder() {
  const { profile } = useAuth()
  // 이어하기: 진행 중인 에피소드가 있으면 users.current에 들어 있다
  const resume = profile.current ? getEpisode(profile.current.episodeId) : null

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">{profile.name}</h1>
        <EnergyBadge energy={profile.energy} />
        <LevelBadge exp={profile.exp ?? 0} level={profile.level} />

        {resume && (
          <Link to={`/dev/play/${resume.episodeId}`} className="resume-card">
            <span className="setting-desc">이어하기</span>
            <strong>
              {resume.storyTitle} · {resume.title}
            </strong>
            <span className="setting-desc">
              {profile.current.step} / {resume.steps.length}단계 ›
            </span>
          </Link>
        )}

        <p className="auth-muted">(메인 홈 화면이 들어올 자리예요)</p>
        <Link to="/settings" className="auth-link">설정</Link>
        {import.meta.env.DEV && (
          <>
            <Link to="/dev/episodes" className="auth-link">[개발용] 에피소드 (진행 저장 테스트)</Link>
            <Link to="/dev/rewards" className="auth-link">[개발용] 보상 테스트</Link>
            <Link to="/dev/result" className="auth-link">[개발용] 결과 화면 테스트</Link>
          </>
        )}
      </div>
    </div>
  )
}
