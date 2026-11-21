import { buildSkillReport } from '../../logic/skillReport'
import SkillRadar from './SkillRadar'
import SkillBars from './SkillBars'
import SkillReportSection from './SkillReportSection'

/**
 * 초기 진단 테스트 결과 화면: 사각형 레이더 + 정답률 막대 + 잘하는/부족한 능력 설명
 * @param skills { vocab: { correct, total }, comprehension, inference, writing }
 * @param name   닉네임
 * @param onStart "학습 시작하기" (레벨 1로 올리고 홈으로)
 */
export default function DiagnosisResult({ skills, name, onStart, starting }) {
  const report = buildSkillReport(skills)

  return (
    <div className="result-page">
      <header className="result-header">
        <p className="result-story">초기 진단 결과</p>
        <h1>{name}님의 문해력</h1>
        <p className="result-summary">{report.summary}</p>
      </header>

      <section className="result-section">
        <SkillRadar skills={skills} />
        <SkillBars skills={skills} />
      </section>

      <SkillReportSection report={report} />

      <button type="button" className="btn btn-primary result-next" onClick={onStart} disabled={starting}>
        {starting ? '준비 중…' : '학습 시작하기'}
      </button>
    </div>
  )
}
