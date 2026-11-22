import { useState } from 'react'
import { SKILL_LABELS } from '../../config/gameRules'
import { episodeAccuracy, starsFor } from '../../logic/result'
import { getStory } from '../../content'
import AttendanceComplete from '../AttendanceComplete'
import LevelBadge from '../LevelBadge'
import { EnergyStars, TopBar } from '../AppChrome'
import { WrongAnswers, WritingReview } from './AnswerReview'
import catSheet from '../../assets/figma/cat-sheet.png'

/**
 * 학습 완료 화면 (Figma "결과 화면") — 에피소드 하나를 마칠 때마다
 * 캐릭터 · 학습 완료! · 경험치/에너지 카드 · [다음 에피소드] [작품 목록으로]
 * 별점 · 문제 한눈에 보기 · 틀린 문제 · 글쓰기 피드백은 아래에 접어서 보여준다.
 * 오늘 첫 완료면 버튼을 누를 때 출석체크 완료 창을 먼저 보여준다.
 *
 * @param episode        content/index.js의 getEpisode 결과
 * @param result         logic/result.js의 aggregateEpisode 결과
 * @param reward         { episodeExp, level, attendance } (completeEpisode의 reward)
 * @param writing        { text, feedback } 글쓰기 답안과 AI 피드백
 * @param profile        현재 사용자 (경험치·에너지·완료 에피소드)
 * @param storyCompleted 이번 완료로 이야기를 처음 다 끝냈는지 → [완독 리포트 보기]
 * @param onNext         다음 에피소드 (없으면 버튼 숨김)
 * @param onDone         작품 목록으로
 * @param onReport       완독 리포트
 */
export default function EpisodeResult({
  episode,
  result,
  reward,
  writing,
  profile,
  storyCompleted,
  onNext,
  onDone,
  onReport,
}) {
  const [pending, setPending] = useState(null) // 출석 창을 닫은 뒤 할 일

  const stars = starsFor(result)
  const rate = episodeAccuracy(result)
  const story = getStory(episode.storyId)
  const epNo = story ? story.episodeIds.indexOf(episode.episodeId) + 1 : null

  const wrongIds = new Set(result.wrong.map((q) => q.id))
  const questionsInOrder = episode.steps.filter((s) => s.type === 'question').map((s) => s.question)

  // 오늘 첫 완료면 출석 창을 먼저 보여주고, 닫으면 원래 하려던 곳으로
  function go(action) {
    if (reward?.attendance && pending === null) setPending(() => action)
    else action?.()
  }

  const primary = storyCompleted
    ? { label: '완독 리포트 보기', action: onReport }
    : onNext
      ? { label: '다음 에피소드', action: onNext }
      : null

  return (
    <div className="screen done-page">
      <TopBar title="" close onBack={() => go(onDone)} />

      <div className="done-art" aria-hidden="true">
        <img src={catSheet} alt="" />
      </div>

      <h1 className="done-title">학습 완료!</h1>
      <p className="stars done-stars" aria-label={`별 3개 중 ${stars}개`}>
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= stars ? 'star on' : 'star'} aria-hidden="true">
            ★
          </span>
        ))}
      </p>
      {reward?.level.levelUp && (
        <p className="done-levelup">
          레벨 업! Lv.{reward.level.prevLevel} → Lv.{reward.level.level}
        </p>
      )}

      <p className="done-pill">
        {episode.storyTitle} {epNo}화
        <br />
        {episode.title} 완료!
      </p>

      <div className="done-cards">
        <div className="done-card">
          <span className="done-card-title">경험치</span>
          <span className="done-card-value">+{reward?.episodeExp ?? 0} XP</span>
        </div>
        <div className="done-card">
          <span className="done-card-title">에너지</span>
          <EnergyStars energy={profile?.energy} />
        </div>
      </div>

      <div className="done-extra">
        {profile && <LevelBadge exp={profile.exp ?? 0} level={profile.level} />}

        <details className="result-fold">
          <summary>
            문제 한눈에 보기 <span className="count">정답률 {rate}%</span>
          </summary>
          <ul className="recap">
            {questionsInOrder.map((q, i) => {
              const ok = !wrongIds.has(q.id)
              return (
                <li key={q.id} className={ok ? 'ok' : 'no'}>
                  {ok ? '○' : '×'} Q{i + 1} {SKILL_LABELS[q.skill] ?? q.skill}
                  <span className="sr-only">{ok ? '정답' : '오답'}</span>
                </li>
              )
            })}
            {result.writingTotal > 0 && (
              <li className="writing">
                글쓰기 {result.writingMet}/{result.writingTotal}
              </li>
            )}
          </ul>
        </details>

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
      </div>

      <div className="done-actions">
        {primary && (
          <button type="button" className="btn btn-primary" onClick={() => go(primary.action)}>
            {primary.label}
          </button>
        )}
        <button type="button" className="btn btn-light" onClick={() => go(onDone)}>
          작품 목록으로
        </button>
      </div>

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
