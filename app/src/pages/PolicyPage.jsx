import { useNavigate } from 'react-router-dom'

/**
 * 개인정보 처리방침 · 이용약관 (초안 — 팀 검토 필요)
 * TODO: [문의 이메일], AI 서비스 이름이 정해지면 채우기
 */

const PRIVACY = {
  title: '개인정보 처리방침',
  updated: '2026-11-16 (초안)',
  sections: [
    {
      h: '1. 수집하는 정보',
      items: [
        '회원가입: 이메일, 닉네임 (Google 로그인 시 Google 계정의 이메일과 이름)',
        '학습 기록: 퀴즈 답, 글쓰기 답안과 피드백, 점수, 경험치, 레벨, 출석 기록',
        '앱 설정: 글자 크기, 테마, 알림 설정',
        '알림을 켠 경우: 알림을 보내기 위한 기기 식별 값(푸시 토큰)',
      ],
    },
    {
      h: '2. 이용 목적',
      items: [
        '로그인과 계정 관리',
        '학습 진행 저장, 학습 결과와 부족한 능력 분석',
        '출석 체크, 보상, 레벨 관리',
        '사용자가 허용한 경우 학습 알림 발송',
      ],
    },
    {
      h: '3. AI 피드백을 위한 정보 전달',
      items: [
        '글쓰기 피드백을 위해 사용자가 쓴 답안과 해당 문제·지문이 외부 AI 서비스로 전송됩니다.',
        '이메일, 닉네임 등 사용자를 알아볼 수 있는 정보는 함께 보내지 않습니다.',
        '글쓰기 답안에 개인정보(실명, 연락처 등)를 적지 않도록 주의해주세요.',
      ],
    },
    {
      h: '4. 보관과 삭제',
      items: [
        '정보는 Google Firebase에 저장됩니다.',
        '설정 > 학습 기록 초기화로 학습 기록을 직접 삭제할 수 있습니다.',
        '계정 삭제를 원하면 [문의 이메일]로 요청해주세요.',
      ],
    },
    {
      h: '5. 문의',
      items: ['Team MZ · [문의 이메일]'],
    },
  ],
}

const TERMS = {
  title: '이용약관',
  updated: '2026-11-16 (초안)',
  sections: [
    {
      h: '1. 서비스 소개',
      items: [
        '또랑또랑은 고전문학 이야기와 퀴즈로 문해력을 기르는 학습 서비스입니다.',
        '창의적공학설계입문 수업의 팀 프로젝트(Team MZ)로 만들어졌습니다.',
      ],
    },
    {
      h: '2. 이용 조건',
      items: [
        '만 14세 이상 누구나 이용할 수 있습니다.',
        '다른 사람의 계정을 사용하거나 서비스를 방해하는 행위는 금지됩니다.',
      ],
    },
    {
      h: '3. AI 피드백 안내',
      items: [
        '글쓰기 피드백은 AI가 팀이 정한 평가 기준에 따라 만든 것으로, 틀리거나 부족할 수 있습니다.',
        '판단이 어려운 경우 ‘판단 보류’로 표시됩니다.',
      ],
    },
    {
      h: '4. 서비스 변경',
      items: ['학습 콘텐츠, 보상 규칙 등은 더 나은 서비스를 위해 바뀔 수 있습니다.'],
    },
  ],
}

export default function PolicyPage({ type }) {
  const navigate = useNavigate()
  const doc = type === 'terms' ? TERMS : PRIVACY

  return (
    <div className="settings-page policy-page">
      <header className="settings-header">
        <button type="button" className="auth-link" onClick={() => navigate(-1)}>‹ 뒤로</button>
        <h1>{doc.title}</h1>
      </header>
      <p className="setting-desc">최종 수정: {doc.updated}</p>
      {doc.sections.map((s) => (
        <section key={s.h} className="policy-section">
          <h2>{s.h}</h2>
          <ul>
            {s.items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
