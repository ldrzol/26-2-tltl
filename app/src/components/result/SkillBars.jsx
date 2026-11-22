import { SKILLS, SKILL_LABELS } from '../../config/gameRules'
import { accuracy, weakestSkill } from '../../logic/result'

/**
 * 능력별 정답률 막대 (차트의 숫자를 그대로 읽을 수 있는 표 역할도 함)
 * @param compare { label, skills } — 있으면 "처음 진단 40% → +27%p" 처럼 변화 표시
 */
export default function SkillBars({ skills, compare }) {
  const weakest = weakestSkill(skills)

  return (
    <ul className="skill-bars">
      {SKILLS.map((key) => {
        const s = skills?.[key]
        const a = accuracy(s)
        const b = compare ? accuracy(compare.skills?.[key]) : null
        const diff = a !== null && b !== null ? a - b : null
        const isWeakest = weakest?.skill === key
        return (
          <li key={key} className="skill-bar" title={a === null ? undefined : `${SKILL_LABELS[key]}: ${s.correct}/${s.total} (${a}%)`}>
            <div className="skill-bar-head">
              <span className="skill-bar-label">
                {SKILL_LABELS[key]}
                {isWeakest && <span className="weak-tag">💡 가장 부족</span>}
              </span>
              <span className="skill-bar-value">{a === null ? '기록 없음' : `${a} %`}</span>
            </div>
            <div
              className="skill-bar-track"
              role="progressbar"
              aria-label={`${SKILL_LABELS[key]} 정답률`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={a ?? 0}
            >
              {a > 0 && <div className="skill-bar-fill" style={{ width: `${Math.max(a, 2)}%` }} />}
            </div>
            {compare && b !== null && (
              <p className="skill-bar-compare">
                {compare.label} {b}%
                {diff !== null && (
                  <span className={diff > 0 ? 'up' : diff < 0 ? 'down' : ''}>
                    {diff > 0 ? ` ▲ ${diff}%p` : diff < 0 ? ` ▼ ${-diff}%p` : ' 그대로'}
                  </span>
                )}
              </p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
