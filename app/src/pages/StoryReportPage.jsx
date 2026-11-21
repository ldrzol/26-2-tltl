import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getEpisode, getStory, nextStory } from '../content'
import { loadStoryProgress } from '../services/progressService'
import { sumSkills } from '../logic/result'
import { buildSkillReport } from '../logic/skillReport'
import SkillRadar from '../components/result/SkillRadar'
import SkillBars from '../components/result/SkillBars'
import SkillReportSection from '../components/result/SkillReportSection'
import { WrongAnswers } from '../components/result/AnswerReview'

// 스토리 모드 목록 화면(박초이)이 나오기 전까지는 개발용 목록으로
const LIST_PATH = import.meta.env.DEV ? '/dev/episodes' : '/home'

/**
 * 이야기 완독 리포트 (/report/:storyId) — 이야기의 모든 에피소드를 끝냈을 때
 * 에피소드별 최근 결과(progress.result)를 모아 사각형 분석 + 처음 진단과 비교
 * 에피소드 목록에서 언제든 다시 볼 수 있다.
 */
export default function StoryReportPage() {
  const { storyId } = useParams()
  const story = getStory(storyId)
  const { user, profile } = useAuth()
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    if (story) loadStoryProgress(user.uid, storyId).then(setProgress)
  }, [user.uid, storyId, story])

  if (!story) return <p className="auth-error">없는 이야기예요: {storyId}</p>
  if (!progress) return <p className="auth-muted" style={{ padding: 24 }}>불러오는 중…</p>

  const episodes = story.episodeIds.map((id) => ({ ep: getEpisode(id), p: progress[id] }))
  const finished = episodes.filter(({ p }) => p?.result)
  const allDone = finished.length === episodes.length

  const skills = sumSkills(finished.map(({ p }) => p.result))
  const report = buildSkillReport(skills)
  const compare = profile.diagnosis?.skills
    ? { label: '처음 진단', skills: profile.diagnosis.skills }
    : undefined

  const starsGot = episodes.reduce((n, { p }) => n + (p?.bestStars ?? 0), 0)

  // 틀린 문제 모아보기: 각 에피소드의 마지막 완료 답 기준
  const wrong = finished.flatMap(({ ep, p }) =>
    ep.questions
      .filter((q) => p.lastAnswers?.[q.id]?.correct !== true)
      .map((q) => ({ ...q, chosen: p.lastAnswers?.[q.id]?.choice ?? null })),
  )

  const next = nextStory(storyId)

  return (
    <div className="result-page">
      <header className="result-header">
        <p className="result-big-emoji" aria-hidden="true">📜</p>
        <h1>{allDone ? `${story.title} 완독!` : `${story.title} 리포트`}</h1>
        {!allDone && (
          <p className="setting-desc">
            {finished.length}/{episodes.length} 에피소드까지의 결과예요. 다 끝내면 완성돼요.
          </p>
        )}
        <p className="result-summary">{report.summary}</p>
      </header>

      <section className="result-section">
        <h2>능력 분석</h2>
        <SkillRadar skills={skills} compare={compare} />
        <SkillBars skills={skills} compare={compare} />
      </section>

      <SkillReportSection report={report} />

      <section className="result-section">
        <h2>
          에피소드 <span className="story-progress-count">★ {starsGot}/{episodes.length * 3}</span>
        </h2>
        <ul className="episode-summary">
          {episodes.map(({ ep, p }, i) => (
            <li key={ep.episodeId}>
              <span>
                ep{i + 1} · {ep.title}
              </span>
              <span className="stars small" aria-label={p?.bestStars ? `별 ${p.bestStars}개` : '아직 안 함'}>
                {p?.bestStars
                  ? [1, 2, 3].map((n) => (
                      <span key={n} className={n <= p.bestStars ? 'star on' : 'star'} aria-hidden="true">
              {n <= p.bestStars ? '★' : '☆'}
            </span>
                    ))
                  : '—'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {wrong.length > 0 && (
        <details className="result-fold">
          <summary>
            틀린 문제 모아보기 <span className="count">{wrong.length}</span>
          </summary>
          <WrongAnswers wrong={wrong} />
        </details>
      )}

      <div className="result-actions">
        {allDone && next ? (
          <Link to={LIST_PATH} className="btn btn-primary">
            다음 이야기: {next.title} ▶
          </Link>
        ) : null}
        <Link to={LIST_PATH} className={allDone && next ? 'auth-link' : 'btn btn-primary'}>
          에피소드 목록으로
        </Link>
      </div>
    </div>
  )
}
