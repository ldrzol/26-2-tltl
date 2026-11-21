import { useState } from 'react'
import { SKILL_LABELS } from '../../config/gameRules'
import { episodeAccuracy, starsFor } from '../../logic/result'
import { getStory } from '../../content'
import AttendanceComplete from '../AttendanceComplete'
import LevelBadge from '../LevelBadge'
import { WrongAnswers, WritingReview } from './AnswerReview'

/**
 * 에피소드 완료 화면 — 에피소드 하나를 마칠 때마다 (가볍고 빠르게: 칭찬·보상 중심)
 * 사각형 분석은 이야기를 다 끝냈을 때 "완독 리포트"(StoryReportPage)에서 보여준다.
 *
 * 흐름: 완료 화면 → [다음] → (오늘 첫 완료면) 출석체크 완료! → onDone
 *       이번에 이야기를 다 끝냈으면 [완독 리포트 보기] → onReport
 *
 * @param episode        content/index.js의 getEpisode 결과
 * @param result         logic/result.js의 aggregateEpisode 결과
 * @param reward         { episodeExp, level, attendance } (completeEpisode의 reward)
 * @param writing        { text, feedback } 글쓰기 답안과 AI 피드백
 * @param profile        현재 사용자 (경험치·완료 에피소드·출석)
 * @param storyCompleted 이번 완료로 이야기를 처음 다 끝냈는지
 */
export default function EpisodeResult({
  episode,
  result,
  reward,
  writing,
  profile,
  storyCompleted,
  onDone,
  onReport,
}) {
  const [pending, setPending] = useState(null) // 출석 창을 닫은 뒤 할 일

  const stars = starsFor(result)
  const rate = episodeAccuracy(result)
  const streak = reward?.attendance?.streak ?? profile?.attendance?.streak ?? 0

  const story = getStory(episode.storyId)
  const completed = new Set([...(profile?.completedEpisodeIds ?? []), episode.episodeId])
  const storyDone = story ? story.episodeIds.filter((id) => completed.has(id)).length : 0
  const storyTotal = story?.episodeIds.length ?? 0

  const wrongIds = new Set(result.wrong.map((q) => q.id))
  const questionsInOrder = episode.steps.filter((s) => s.type === 'question').map((s) => s.question)

  // 오늘 첫 완료면 출석 창을 먼저 보여주고, 닫으면 원래 하려던 곳으로
  function go(action) {
    if (reward?.attendance && pending === null) setPending(() => action)
    else action?.()
  }

  return (
    <div className="result-page">
      <header className="result-header">
        <p className="result-big-emoji" aria-hidden="true">🎉</p>
        <h1>에피소드 완료!</h1>
        <p className="result-story">
          {episode.storyTitle} · {episode.title}
        </p>
        <p className="stars" aria-label={`별 3개 중 ${stars}개`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= stars ? 'star on' : 'star'} aria-hidden="true">
              {n <= stars ? '★' : '☆'}
            </span>
          ))}
        </p>
        {reward?.level.levelUp && (
          <p className="result-levelup">
            🎊 레벨 업! Lv.{reward.level.prevLevel} → Lv.{reward.level.level}
          </p>
        )}
      </header>

      <div className="stat-cards">
        <div className="stat-card">
          <strong>+{reward?.episodeExp ?? 0}</strong>
          <span>XP</span>
        </div>
        <div className="stat-card">
          <strong>{rate}%</strong>
          <span>정답률</span>
        </div>
        <div className="stat-card">
          <strong>🔥 {streak}일</strong>
          <span>연속 출석</span>
        </div>
      </div>

      {profile && <LevelBadge exp={profile.exp ?? 0} level={profile.level} />}

      <section className="result-section">
        <h2>문제 한눈에 보기</h2>
        <ul className="recap">
          {questionsInOrder.map((q, i) => {
            const ok = !wrongIds.has(q.id)
            return (
              <li key={q.id} className={ok ? 'ok' : 'no'}>
                <span className="recap-mark" aria-hidden="true">{ok ? '⭕' : '❌'}</span>
                <span>
                  Q{i + 1} {SKILL_LABELS[q.skill] ?? q.skill}
                </span>
                <span className="sr-only">{ok ? '정답' : '오답'}</span>
              </li>
            )
          })}
          {result.writingTotal > 0 && (
            <li className="writing">
              <span className="recap-mark" aria-hidden="true">✍️</span>
              <span>
                글쓰기 {result.writingMet}/{result.writingTotal}
              </span>
            </li>
          )}
        </ul>
      </section>

      {storyTotal > 0 && (
        <section className="result-section">
          <h2>
            {episode.storyTitle} 진행도 <span className="story-progress-count">{storyDone}/{storyTotal}</span>
          </h2>
          <div className="story-progress" aria-hidden="true">
            {Array.from({ length: storyTotal }, (_, i) => (
              <span key={i} className={i < storyDone ? 'seg on' : 'seg'} />
            ))}
          </div>
          {storyDone < storyTotal && (
            <p className="setting-desc">모든 에피소드를 끝내면 능력 분석 리포트가 열려요 📜</p>
          )}
        </section>
      )}

      {result.wrong.length > 0 && (
        <details className="result-fold">
          <summary>
            틀린 문제 다시 보기 <span className="count">{result.wrong.length}</span>
          </summary>
          <WrongAnswers wrong={result.wrong} />
        </details>
      )}

      {episode.writing && (
        <details className="result-fold">
          <summary>글쓰기 피드백</summary>
          <WritingReview writing={episode.writing} text={writing?.text} feedback={writing?.feedback} />
        </details>
      )}

      {storyCompleted ? (
        <div className="result-actions">
          <button type="button" className="btn btn-primary" onClick={() => go(onReport)}>
            📜 {episode.storyTitle} 완독 리포트 보기
          </button>
          <button type="button" className="auth-link" onClick={() => go(onDone)}>
            에피소드 목록으로
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-primary result-next" onClick={() => go(onDone)}>
          다음
        </button>
      )}

      {pending && (
        <div className="reward-overlay">
          <AttendanceComplete
            attendance={reward.attendance}
            onClose={() => {
              const action = pending
              setPending(false) // false = 출석 창 이미 봄
              action?.()
            }}
          />
        </div>
      )}
    </div>
  )
}
