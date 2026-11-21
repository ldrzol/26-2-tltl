const LEVEL_TAG = {
  strong: { text: '잘해요', cls: 'strong' },
  normal: { text: '보통', cls: 'normal' },
  weak: { text: '연습 필요', cls: 'weak' },
}

/**
 * 잘하는/부족한 능력 카드 + 능력별 설명 (초기 진단 결과 · 이야기 완독 리포트 공통)
 * @param report logic/skillReport.js의 buildSkillReport 결과
 */
export default function SkillReportSection({ report }) {
  return (
    <>
      {(report.best || report.worst) && (
        <section className="result-highlights">
          {report.best && (
            <div className="highlight-card strong">
              <p className="highlight-label">💪 가장 잘하는 능력</p>
              <p className="highlight-value">
                {report.best.label} <span>{report.best.accuracy}%</span>
              </p>
            </div>
          )}
          {report.worst && (
            <div className="highlight-card weak">
              <p className="highlight-label">💡 더 키울 능력</p>
              <p className="highlight-value">
                {report.worst.label} <span>{report.worst.accuracy}%</span>
              </p>
            </div>
          )}
        </section>
      )}

      <section className="result-section">
        <h2>능력별 분석</h2>
        <ul className="skill-comments">
          {report.items.map((it) => (
            <li key={it.skill}>
              <p className="skill-comment-head">
                <strong>{it.label}</strong>
                <span className={`level-tag ${LEVEL_TAG[it.level].cls}`}>{LEVEL_TAG[it.level].text}</span>
              </p>
              <p className="skill-comment-text">{it.comment}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
