import { SKILL_LABELS } from '../../config/gameRules'

const MARKS = ['①', '②', '③', '④']

/**
 * 진단 틀린 문제 다시 보기: 문제 · 내가 고른 답(왜 틀렸는지) · 정답 · 근거 문장 · 해설
 * @param wrong scoreDiagnostic 결과의 wrongAnswers
 */
export default function DiagnosisReview({ wrong }) {
  if (wrong.length === 0) {
    return <p className="review-empty">모두 맞혔어요! 🎉</p>
  }

  return (
    <ol className="review-list">
      {wrong.map((q) => (
        <li key={q.id} className="review-item">
          <p className="review-meta">
            {SKILL_LABELS[q.skill] ?? q.area} · 난이도 {q.difficulty}
          </p>
          <p className="review-question diag-stem">{q.stem}</p>
          <ul className="review-choices">
            {q.options.map((o) => {
              const cls = o.no === q.answer ? 'answer' : o.no === q.selected ? 'chosen' : ''
              return (
                <li key={o.no} className={cls}>
                  <span className="mark">{MARKS[o.no - 1]}</span> {o.text}
                  {o.no === q.answer && <span className="choice-tag">정답</span>}
                  {o.no === q.selected && <span className="choice-tag">내 답</span>}
                </li>
              )
            })}
          </ul>
          {q.unanswered && <p className="review-note">답을 고르지 않았어요.</p>}
          {q.whyWrong && (
            <p className="review-explanation">
              <strong>왜 틀렸을까요?</strong> {q.errorTag && <span className="diag-tag">{q.errorTag}</span>} {q.whyWrong}
            </p>
          )}
          <p className="review-explanation">
            <strong>정답 해설</strong> {q.explanation}
          </p>
          {q.evidence && (
            <p className="review-note">
              근거: <em>{q.evidence}</em>
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}
