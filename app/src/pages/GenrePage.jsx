import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listStories } from '../content'
import { ProgressBar, TopBar } from '../components/AppChrome'

// 콘텐츠가 있는 장르만 열린다 (이솝우화 · 서양 고전문학은 콘텐츠가 생기면 stories를 채우면 됨)
const GENRES = [
  { id: 'korean', title: '한국 고전문학', stories: () => listStories() },
  { id: 'aesop', title: '이솝우화', stories: () => [] },
  { id: 'western', title: '서양 고전문학', stories: () => [] },
]

/** 챕터 리스트 화면 (Figma "장르") */
export default function GenrePage() {
  const { profile } = useAuth()
  const done = new Set(profile.completedEpisodeIds ?? [])

  return (
    <div className="screen genre-page">
      <TopBar title="장르" close to="/home" divider />
      <ul className="genre-list">
        {GENRES.map((g) => {
          const ids = g.stories().flatMap((s) => s.episodeIds)
          const ratio = ids.length ? ids.filter((id) => done.has(id)).length / ids.length : 0
          const open = ids.length > 0
          const body = (
            <>
              <span className="genre-title">{g.title}</span>
              {!open && <span className="genre-soon">준비 중</span>}
              <span className="genre-progress">
                <span className="genre-progress-label">진행률</span>
                <ProgressBar ratio={ratio} label={`${g.title} 진행률`} />
              </span>
            </>
          )
          return (
            <li key={g.id}>
              {open ? (
                <Link viewTransition to="/stories" className="genre-card">
                  {body}
                </Link>
              ) : (
                <div className="genre-card disabled" aria-disabled="true">
                  {body}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
