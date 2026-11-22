/**
 * 진단 결과 추가 정보: 나의 형 · 더 키울 능력 · 추천 시작 단계 · 자주 하는 실수 (Figma 카드 모양)
 * @param result logic/diagnostic.js의 scoreDiagnostic 결과
 */
export default function DiagnosisSummary({ result }) {
  const { type, weakest, startLevel, topTag } = result

  return (
    <ul className="diag-analysis">
      <li className="card diag-type" aria-label="나의 형">
        <p className="card-title">나의 형</p>
        <p className="diag-type-name">{type.name}</p>
        <p className="card-text">{type.desc}</p>
      </li>
      <li className="card">
        <p className="card-title">더 키울 능력</p>
        <p className="card-text">{weakest.message}</p>
        {!weakest.allGood && <p className="diag-reason">{weakest.reason}</p>}
      </li>
      <li className="card">
        <p className="card-title">추천 시작 단계</p>
        <p className="card-text">{startLevel.name}</p>
        <p className="diag-reason">{startLevel.desc}</p>
      </li>
      {topTag && (
        <li className="card">
          <p className="card-title">자주 하는 실수</p>
          <p className="card-text">{topTag.tag}</p>
          <p className="diag-reason">{topTag.message}</p>
        </li>
      )}
    </ul>
  )
}
