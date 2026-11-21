import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { SKILLS, SKILL_LABELS } from '../../config/gameRules'
import { accuracy } from '../../logic/result'

function fmt(v) {
  return v === null ? '기록 없음' : `${v}%`
}

function RadarTooltip({ active, payload, compareLabel }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tooltip">
      <strong>{d.label}</strong>
      {compareLabel && (
        <span>
          {compareLabel} {fmt(d.beforeRaw)}
        </span>
      )}
      <span>
        {compareLabel ? '지금 ' : ''}
        {d.hasData ? `${d.value}% (${d.correct}/${d.total})` : '아직 기록이 없어요'}
      </span>
    </div>
  )
}

/**
 * 능력치 사각형 레이더 차트 (어휘·내용 이해·추론·글쓰기, 0~100%)
 * @param skills  지금 능력치
 * @param compare 비교용 { label: '처음 진단', skills } — 있으면 점선으로 겹쳐 그림
 */
export default function SkillRadar({ skills, compare }) {
  const data = SKILLS.map((key) => {
    const s = skills?.[key]
    const a = accuracy(s)
    const b = compare ? accuracy(compare.skills?.[key]) : null
    return {
      key,
      label: SKILL_LABELS[key],
      value: a ?? 0,
      hasData: a !== null,
      correct: s?.correct ?? 0,
      total: s?.total ?? 0,
      before: b ?? 0,
      beforeRaw: b,
    }
  })

  const summary = data
    .map((d) => `${d.label} ${compare ? `${compare.label} ${fmt(d.beforeRaw)}, 지금 ` : ''}${d.hasData ? d.value + '%' : '기록 없음'}`)
    .join(', ')

  return (
    <div className="skill-radar">
      {compare && (
        <div className="chart-legend" aria-hidden="true">
          <span className="legend-item">
            <span className="legend-swatch before" /> {compare.label}
          </span>
          <span className="legend-item">
            <span className="legend-swatch now" /> 지금
          </span>
        </div>
      )}
      <div role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={data} outerRadius="72%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
            <PolarGrid className="radar-grid" />
            <PolarAngleAxis dataKey="label" className="radar-axis" />
            <PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={false} axisLine={false} />
            {compare && (
              <Radar
                dataKey="before"
                className="radar-series-before"
                strokeWidth={2}
                strokeDasharray="5 4"
                fillOpacity={0}
                dot={false}
                isAnimationActive={false}
              />
            )}
            <Radar
              dataKey="value"
              className="radar-series"
              strokeWidth={2}
              fillOpacity={0.2}
              dot={{ r: 4, strokeWidth: 2 }}
              isAnimationActive={false}
            />
            <Tooltip content={<RadarTooltip compareLabel={compare?.label} />} cursor={false} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
