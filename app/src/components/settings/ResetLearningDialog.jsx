import { useState } from 'react'

const CONFIRM_WORD = '초기화'

/**
 * 학습 기록 초기화 확인 — 두 번 확인
 * 1단계: 무엇이 지워지는지 안내 → 2단계: "초기화" 직접 입력해야 실행
 */
export default function ResetLearningDialog({ onConfirm, onCancel }) {
  const [step, setStep] = useState(1)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
    } catch (e) {
      console.error('[reset] 초기화 실패', e)
      setError('초기화하지 못했어요. 잠시 후 다시 시도해주세요.')
      setBusy(false)
    }
  }

  return (
    <div className="reward-overlay">
      <div className="reward-card" role="alertdialog" aria-labelledby="reset-title">
        <h2 id="reset-title" className="reward-title">학습 기록 초기화</h2>

        {step === 1 ? (
          <>
            <div className="reset-list">
              <p><strong>삭제돼요</strong></p>
              <ul>
                <li>모든 에피소드 진행·결과</li>
                <li>경험치, 레벨 (레벨 0으로)</li>
                <li>능력치 기록</li>
              </ul>
              <p><strong>남아요</strong></p>
              <ul>
                <li>계정, 닉네임, 설정</li>
                <li>출석 기록</li>
              </ul>
              <p className="auth-muted">초기화 후에는 초기 진단 테스트부터 다시 시작해요.</p>
            </div>
            <button type="button" className="btn btn-danger" onClick={() => setStep(2)}>
              계속하기
            </button>
          </>
        ) : (
          <>
            <p className="auth-muted">
              되돌릴 수 없어요. 정말 초기화하려면 아래에 <strong>{CONFIRM_WORD}</strong>를 입력하세요.
            </p>
            <input
              className="text-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={CONFIRM_WORD}
              aria-label={`${CONFIRM_WORD} 입력`}
              autoFocus
            />
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button
              type="button"
              className="btn btn-danger"
              onClick={run}
              disabled={typed.trim() !== CONFIRM_WORD || busy}
            >
              {busy ? '초기화 중…' : '초기화하기'}
            </button>
          </>
        )}

        <button type="button" className="auth-link" onClick={onCancel} disabled={busy}>
          취소
        </button>
      </div>
    </div>
  )
}
