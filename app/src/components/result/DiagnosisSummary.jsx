import { SKILL_LABELS } from '../../config/gameRules'

const GRADE_CLASS = { 잘해요: 'strong', 보통: 'normal', '연습 필요': 'weak' }

/**
 * 진단 결과 요약: 나의 형 · 영역별 등급 · 더 키울 능력 · 시작 레벨 · 자주 하는 실수
 * @param result logic/diagnostic.js의 scoreDiagnostic 결과
 */
export default function DiagnosisSummary({ result }) {
  const { type, areas, weakest, startLevel, topTag } = result

  return (
    <>
      <section className="diag-type" aria-label="나의 형">
        <p className="diag-type-label">당신은</p>
        <h2 className="diag-type-name">{type.name} 입니다</h2>
        <p className="diag-type-desc">{type.desc}</p>
      </section>

      <section className="result-section">
        <h2>영역별 결과</h2>
        <ul className="diag-grades">
          {areas.map((a) => (
            <li key={a.area} className="diag-grade">
              <div className="diag-grade-head">
                <span className="diag-grade-area">{SKILL_LABELS[a.skill] ?? a.area}</span>
                <span className={`level-tag ${GRADE_CLASS[a.grade]}`}>{a.grade}</span>
                <span className="diag-grade-score">
                  {a.earned}/{a.max}점 · {a.percent}%
                </span>
              </div>
              <p className="diag-grade-msg">{a.message}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="result-section">
        <h2>더 키울 능력</h2>
        <p className="diag-weakest">{weakest.message}</p>
        {!weakest.allGood && <p className="diag-reason">{weakest.reason}</p>}
      </section>

      <section className="result-section">
        <h2>추천 시작 단계</h2>
        <p className="diag-weakest">{startLevel.name}</p>
        <p className="diag-reason">{startLevel.desc}</p>
      </section>

      {topTag && (
        <section className="result-section">
          <h2>자주 하는 실수</h2>
          <p className="diag-weakest">{topTag.tag}</p>
          <p className="diag-reason">{topTag.message}</p>
        </section>
      )}
    </>
  )
}
