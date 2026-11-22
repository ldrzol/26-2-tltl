const LEVEL_TAG = {
  strong: { text: '잘해요', cls: 'strong' },
  normal: { text: '보통', cls: 'normal' },
  weak: { text: '연습 필요', cls: 'weak' },
}

/**
 * 강점 / 보완할 점 카드 + 분야별 분석 (초기 진단 결과 · 이야기 완독 리포트 공통) — Figma "초기학습 결과 화면"
 * @param report logic/skillReport.js의 buildSkillReport 결과
 * @param items  분야별 분석을 직접 넘길 때 [{ key, label, level: 'strong'|'normal'|'weak', text, score }]
 *               (없으면 report.items 사용)
 */
export default function SkillReportSection({ report, items }) {
  const rows =
    items ??
    report.items.map((it) => ({ key: it.skill, label: it.label, level: it.level, text: it.comment }))

  return (
    <>
      {(report.best || report.worst) && (
        <section className="diag-highlights">
          <div className="card">
            <p className="card-title">강점</p>
            <p className="highlight-value">
              {report.best ? `${report.best.label} ${report.best.accuracy} %` : '-'}
            </p>
          </div>
          <div className="card">
            <p className="card-title">보완할 점</p>
            <p className="highlight-value">
              {report.worst ? `${report.worst.label} ${report.worst.accuracy} %` : '-'}
            </p>
          </div>
        </section>
      )}

      <h2 className="section-title analysis-title">분야별 분석</h2>
      <ul className="diag-analysis">
        {rows.map((it) => (
          <li key={it.key} className="card">
            <p className="card-head">
              <span className="card-title">{it.label}</span>
              <span className={`tag ${LEVEL_TAG[it.level].cls}`}>{LEVEL_TAG[it.level].text}</span>
              {it.score && <span className="score">{it.score}</span>}
            </p>
            <p className="card-text">{it.text}</p>
          </li>
        ))}
      </ul>
    </>
  )
}
