import { buildSkillReport } from '../../logic/skillReport'
import SkillRadar from './SkillRadar'
import SkillBars from './SkillBars'
import SkillReportSection from './SkillReportSection'
import DiagnosisSummary from './DiagnosisSummary'
import DiagnosisReview from './DiagnosisReview'

/**
 * 초기 진단 테스트 결과 화면: 사각형 레이더 + 정답률 막대 + 잘하는/부족한 능력 설명
 * @param skills { vocab: { correct, total }, comprehension, inference, writing }
 * @param name   닉네임
 * @param detail 있으면 형 · 등급 · 더 키울 능력 · 시작 단계 · 틀린 문제 해설도 보여줌 (logic/diagnostic.js의 scoreDiagnostic 결과)
 * @param onStart "학습 시작하기" (레벨 1로 올리고 홈으로)
 */
export default function DiagnosisResult({ skills, name, detail, onStart, starting }) {
  const report = buildSkillReport(skills)

  return (
    <div className="result-page">
      <header className="result-header">
        <p className="result-story">초기 진단 결과</p>
        <h1>{name}님의 문해력</h1>
        <p className="result-summary">{report.summary}</p>
      </header>

      {detail && <DiagnosisSummary result={detail} />}

      <section className="result-section">
        <SkillRadar skills={skills} />
        <SkillBars skills={skills} />
      </section>

      <SkillReportSection report={report} />

      {detail && (
        <section className="result-section">
          <h2>
            틀린 문제 <span className="count">{detail.wrongAnswers.length}</span>
          </h2>
          <DiagnosisReview wrong={detail.wrongAnswers} />
        </section>
      )}

      <button type="button" className="btn btn-primary result-next" onClick={onStart} disabled={starting}>
        {starting ? '준비 중…' : '학습 시작하기'}
      </button>
    </div>
  )
}
