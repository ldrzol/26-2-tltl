import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../contexts/AuthContext'
import { getEpisode, listStories } from '../../content'
import { startEpisode, retryEpisode } from '../../services/progressService'
import EnergyBadge from '../../components/EnergyBadge'

/**
 * [개발용] 에피소드 목록 (/dev/episodes) — 스토리 모드 화면(박초이)이 나오기 전 진행 저장 테스트용
 * 상태별 버튼:
 *   처음      → [시작]               (에너지 −1)
 *   진행 중   → [이어하기] [처음부터]  (이어하기는 에너지 안 씀, 처음부터는 −1)
 *   완료      → ★ 최고 별점 + [다시 풀기] (에너지 −1, 경험치 절반)
 * 이야기마다 완독 리포트 링크 (다 끝내면 열림)
 */
export default function EpisodeListPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [progress, setProgress] = useState({}) // { [episodeId]: progress 문서 }
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getDocs(collection(db, 'users', user.uid, 'progress')).then((snap) => {
      const map = {}
      snap.forEach((d) => {
        map[d.id] = d.data()
      })
      setProgress(map)
    })
  }, [user.uid])

  async function start(episode) {
    setError('')
    setBusy(episode.episodeId)
    try {
      await startEpisode(user.uid, episode)
      navigate(`/play/${episode.episodeId}`)
    } catch (e) {
      console.error(e)
      setError(e.message)
      setBusy(null)
    }
  }

  async function retry(episode) {
    const confirmed = window.confirm(
      '기존 학습 진행 상황이 초기화됩니다. 에너지 소모 없이 재도전하시겠습니까?'
    )

    if (!confirmed) return

    setError('')
    setBusy(episode.episodeId)

    try {
      await retryEpisode(user.uid, episode)
      navigate(`/play/${episode.episodeId}`)
    } catch (e) {
      console.error(e)
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  const completedSet = new Set(profile.completedEpisodeIds ?? [])

  // 에피소드 모두 완료되었는지 확인
  const episodeOrder = listStories().flatMap(story => story.episodeIds)

  function isUnlocked(episodeId) {
    const index = episodeOrder.indexOf(episodeId)

    if (index === -1) return false

    return episodeOrder
      .slice(0, index)
      .every(id => completedSet.has(id))
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <Link to="/home" className="auth-link">‹ 홈</Link>
        <h1>스토리 모드</h1>
      </header>
      <p className="setting-desc">[개발용] 진행 저장·복원 테스트 — 도중에 탭을 닫았다가 다시 열어보세요.</p>
      <EnergyBadge energy={profile.energy} />

      {error && <p className="auth-error" role="alert">{error}</p>}

      {listStories().map((story) => {
        const doneCount = story.episodeIds.filter((id) => completedSet.has(id)).length
        const total = story.episodeIds.length
        return (
          <section key={story.storyId} className="setting-section">
            <div className="story-head">
              <h2 className="setting-section-title">
                {story.title} · {doneCount}/{total}
              </h2>
              {doneCount === total ? (
                <Link to={`/report/${story.storyId}`} className="auth-link">📜 완독 리포트 보기</Link>
              ) : (
                <span className="setting-desc">🔒 다 끝내면 리포트가 열려요</span>
              )}
            </div>

            <ul className="episode-list">
              {story.episodeIds.map((id) => {
                const ep = getEpisode(id)
                const p = progress[id]
                const inProgress = p?.status === 'in_progress'
                const completed = completedSet.has(id)
                const unlocked = isUnlocked(id)
                return (
                  <li key={id} className="episode-item">
                    <div>
                      <p className="episode-title">{ep.title}</p>
                      <p className="setting-desc">
                        {!unlocked
                          ? '잠김 · 이전 에피소드를 완료해 주세요'
                          : inProgress
                            ? `진행 중 · ${p.step}/${ep.steps.length}단계`
                            : completed
                              ? '완료'
                              : '아직 안 했어요'}
                        {p?.bestStars ? (
                          <span className="stars small" aria-label={`최고 별 ${p.bestStars}개`}>
                            {' '}
                            {[1, 2, 3].map((n) => (
                              <span key={n} className={n <= p.bestStars ? 'star on' : 'star'} aria-hidden="true">
              {n <= p.bestStars ? '★' : '☆'}
            </span>
                            ))}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="episode-actions">
                      {!unlocked ? (
                        <button type="button" className="btn btn-small" disabled>
                          잠김
                        </button>
                      ) : inProgress ? (
                        <>
                          <Link to={`/play/${id}`} className="btn btn-small">이어하기</Link>
                          <button type="button" className="btn btn-small btn-outline" onClick={() => retry(ep)} disabled={busy !== null}>
                            재도전
                          </button>
                        </>
                      ) : (
                        <button type="button" className="btn btn-small" onClick={() => start(ep)} disabled={busy !== null}>
                          {completed ? '다시 풀기' : '시작'} ⚡−1
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
