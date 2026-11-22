import { SKILL_LABELS } from '../../config/gameRules'
import { buildSkillReport } from '../../logic/skillReport'
import { TopBar } from '../AppChrome'
import SkillRadar from './SkillRadar'
import SkillBars from './SkillBars'
import SkillReportSection from './SkillReportSection'
import DiagnosisSummary from './DiagnosisSummary'
import DiagnosisReview from './DiagnosisReview'

const GRADE_LEVEL = { 잘해요: 'strong', 보통: 'normal', '연습 필요': 'weak' }

/**
 * 초기 학습 진단 결과 화면 (Figma "초기학습 결과 화면")
 * 레이더 → 분야별 정답률 → 강점/보완할 점 → 분야별 분석 → (나의 형 · 추천 단계 · 틀린 문제) → 학습 시작하기
 * @param skills { vocab: { correct, total }, comprehension, inference, writing }
 * @param name   닉네임
 * @param detail 있으면 영역별 등급 · 형 · 추천 단계 · 틀린 문제 해설도 보여줌 (scoreDiagnostic 결과)
 * @param onStart "학습 시작하기" (레벨 1로 올리고 홈으로)
 */
export default function DiagnosisResult({ skills, name, detail, onStart, starting }) {
  const report = buildSkillReport(skills)
  const areaItems = detail?.areas.map((a) => ({
    key: a.skill ?? a.area,
    label: SKILL_LABELS[a.skill] ?? a.area,
    level: GRADE_LEVEL[a.grade] ?? 'normal',
    text: a.message,
    score: `${a.earned}/${a.max}점`,
  }))

  return (
    <div className="screen result-page">
      <TopBar title="초기 학습 진단" divider />
      <h2 className="diag-result-name">{name} 님의 문해력</h2>

      <SkillRadar skills={skills} />
      <SkillBars skills={skills} />

      <SkillReportSection report={report} items={areaItems} />

      {detail && (
        <>
          <h2 className="section-title">나의 학습 진단</h2>
          <DiagnosisSummary result={detail} />

          <details className="result-fold">
            <summary>
              틀린 문제 다시 보기 <span className="count">{detail.wrongAnswers.length}</span>
            </summary>
            <DiagnosisReview wrong={detail.wrongAnswers} />
          </details>
        </>
      )}

      <button type="button" className="btn btn-primary btn-lg result-next" onClick={onStart} disabled={starting}>
        {starting ? '준비 중…' : '학습 시작하기'}
      </button>
    </div>
  )
}
