import { SKILL_LABELS } from '../../config/gameRules'

const MARKS = ['①', '②', '③', '④']

/** 틀린 객관식 다시 보기: 문제 · 내가 고른 답 · 정답 · 해설 */
export function WrongAnswers({ wrong }) {
  if (wrong.length === 0) {
    return <p className="review-empty">객관식을 모두 맞혔어요! 🎉</p>
  }

  return (
    <ol className="review-list">
      {wrong.map((q) => (
        <li key={q.id} className="review-item">
          <p className="review-meta">{SKILL_LABELS[q.skill] ?? q.skill}</p>
          <p className="review-question">{q.question}</p>
          <ul className="review-choices">
            {q.choices.map((c, i) => {
              const n = i + 1
              const cls = n === q.answer ? 'answer' : n === q.chosen ? 'chosen' : ''
              return (
                <li key={n} className={cls}>
                  <span className="mark">{MARKS[i]}</span> {c}
                  {n === q.answer && <span className="choice-tag">정답</span>}
                  {n === q.chosen && <span className="choice-tag">내 답</span>}
                </li>
              )
            })}
          </ul>
          {q.chosen === null && <p className="review-note">답을 고르지 않았어요.</p>}
          <p className="review-explanation">
            <strong>해설</strong> {q.explanation}
          </p>
        </li>
      ))}
    </ol>
  )
}

/** 글쓰기 다시 보기: 내 답안 · 평가 기준 충족 여부 · AI 피드백 · 예시 답안 */
export function WritingReview({ writing, text, feedback }) {
  if (!writing) return null
  return (
    <div className="review-item">
      <p className="review-meta">글쓰기</p>
      <p className="review-question">{writing.prompt}</p>

      <p className="review-label">내 답안</p>
      <p className="review-box">{text || '(작성하지 않았어요)'}</p>

      <p className="review-label">평가 기준</p>
      <ul className="criteria-list">
        {writing.criteria.map((c, i) => {
          const v = feedback?.criteria?.[i]
          return (
            <li key={c} className={v === true ? 'met' : 'unmet'}>
              <span aria-hidden="true">{v === true ? '✅' : v === null ? '❔' : '⬜'}</span>
              {c}
              <span className="sr-only">{v === true ? ' (충족)' : ' (미충족)'}</span>
            </li>
          )
        })}
      </ul>

      {feedback && (
        <>
          {feedback.pending && <p className="review-note">일부 기준은 AI가 판단을 보류했어요.</p>}
          {feedback.good && (
            <p className="review-explanation">
              <strong>잘한 점</strong> {feedback.good}
            </p>
          )}
          {feedback.improve && (
            <p className="review-explanation">
              <strong>보완할 점</strong> {feedback.improve}
            </p>
          )}
        </>
      )}

      <p className="review-label">예시 답안</p>
      <p className="review-box example">{writing.example}</p>
    </div>
  )
}
