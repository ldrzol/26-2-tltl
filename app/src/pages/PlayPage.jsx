import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getEpisode, getStory, nextStory } from '../content'
import { storyArt } from '../content/storyArt'
import { SKILL_LABELS } from '../config/gameRules'
import {
  completeEpisode,
  loadProgress,
  retryEpisode,
  saveAnswer,
  saveStep,
  saveWriting,
} from '../services/progressService'
import EpisodeResult from '../components/result/EpisodeResult'
import { ProgressBar, TopBar } from '../components/AppChrome'
import caretLeft from '../assets/figma/caret-left-28.svg'
import caretPurple from '../assets/figma/caret-left-purple.svg'

// 화면 전환을 부드럽게 (브라우저 View Transitions, 지원 안 하면 그냥 이동)
const VT = { viewTransition: true }

const MARKS = ['①', '②', '③', '④', '⑤']

/**
 * 에피소드 플레이 (/play/:episodeId) — Figma "이야기 진행 화면" · "퀴즈 화면" · "결과 화면"
 * 단계를 넘길 때마다 저장 → 탭을 닫았다 열어도 그 단계부터 이어진다.
 * [이전 문제]는 이미 저장한 단계를 다시 보기만 한다 (답은 바꿀 수 없음).
 */
export default function PlayPage() {
  const { episodeId } = useParams()
  const episode = getEpisode(episodeId)
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const homePath = `/home?story=${episode?.storyId ?? ''}`

  const [progress, setProgress] = useState(null) // 불러온 진행 상태
  const [view, setView] = useState(null) // 다시 보는 단계 (null = 지금 단계)
  const [done, setDone] = useState(null) // completeEpisode 결과 { result, reward, stars, storyCompleted }
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // 복원: 저장된 단계·답 불러오기
  useEffect(() => {
    if (!episode) return
    loadProgress(user.uid, episodeId).then((p) => {
      if (!p || p.status !== 'in_progress') navigate(`/home?story=${episode.storyId}`, { replace: true })
      else setProgress(p)
    })
  }, [user.uid, episodeId, episode, navigate])

  if (!episode) return <p className="auth-error">없는 에피소드예요: {episodeId}</p>

  if (done) {
    const story = getStory(episode.storyId)
    const nextId = story.episodeIds[story.episodeIds.indexOf(episodeId) + 1]
    const nextTarget = nextId
      ? `/home?story=${episode.storyId}&ep=${nextId}`
      : nextStory(episode.storyId)
        ? `/home?story=${nextStory(episode.storyId).storyId}&ep=${nextStory(episode.storyId).episodeIds[0]}`
        : null
    return (
      <EpisodeResult
        episode={episode}
        result={done.result}
        reward={done.reward}
        writing={progress.writing}
        profile={profile}
        storyCompleted={done.storyCompleted}
        onNext={nextTarget ? () => navigate(nextTarget, VT) : null}
        onDone={() => navigate(homePath, VT)}
        onReport={() => navigate(`/report/${episode.storyId}`, VT)}
      />
    )
  }

  // 불러오는 동안 글자를 띄우면 화면이 깜빡여서 빈 배경만 보여준다
  if (!progress) return <div className="screen" aria-busy="true"><span className="sr-only">불러오는 중…</span></div>

  const total = episode.steps.length
  const stepIndex = progress.step
  const viewIndex = view ?? stepIndex
  const isPast = viewIndex < stepIndex

  async function run(save, patch) {
    setBusy(true)
    setError('')
    try {
      await save()
      const next = { ...progress, ...patch }
      setProgress(next)
      setView(null)
      if (next.step >= total) {
        const completion = await completeEpisode(user.uid, episode)
        setDone(completion)
      }
    } catch (e) {
      console.error(e)
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function retry() {
    const confirmed = window.confirm(
      '에너지 소모 없이 에피소드를 처음부터 재도전하시겠습니까? 기존 답안은 초기화됩니다.',
    )
    if (!confirmed) return
    setBusy(true)
    setError('')
    try {
      await retryEpisode(user.uid, episode)
      setProgress((prev) => ({ ...prev, step: 0, answers: {}, writing: null }))
      setView(null)
    } catch (e) {
      console.error(e)
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  // 다시 보기 중 앞으로 / 지금 단계에서 뒤로
  const goForward = () => setView(viewIndex + 1 >= stepIndex ? null : viewIndex + 1)
  const goBack = viewIndex > 0 ? () => setView(viewIndex - 1) : null
  const exit = () => navigate(homePath, VT)

  // 모든 단계를 마쳤는데 완료 처리 전에 꺼졌던 경우
  if (viewIndex >= total) {
    return (
      <div className="screen diag-intro">
        <TopBar title={episode.storyTitle} onBack={exit} />
        <p className="diag-intro-text" style={{ marginTop: 80 }}>
          학습 결과를 확인하거나 무료로 재도전할 수 있어요.
        </p>
        {error && <p className="auth-error">{error}</p>}
        <button type="button" className="btn btn-primary btn-lg" disabled={busy} onClick={() => run(async () => {}, {})}>
          결과 보기
        </button>
        <button type="button" className="btn btn-light btn-lg" disabled={busy} onClick={retry}>
          재도전
        </button>
        {goBack && (
          <button type="button" className="auth-link" onClick={goBack}>
            이전 문제 다시 보기
          </button>
        )}
      </div>
    )
  }

  const step = episode.steps[viewIndex]
  const questionSteps = episode.steps.filter((s) => s.type === 'question')
  const storyText = episode.steps.find((s) => s.type === 'story')?.text

  if (step.type === 'story') {
    return (
      <StoryStep
        key={viewIndex}
        title={episode.storyTitle}
        bg={storyArt(episode.storyId).bg}
        text={step.text}
        busy={busy}
        error={error}
        onExit={exit}
        onNext={
          isPast ? goForward : () => run(() => saveStep(user.uid, episodeId, stepIndex + 1), { step: stepIndex + 1 })
        }
      />
    )
  }

  if (step.type === 'question') {
    const qNo = questionSteps.indexOf(step) + 1
    return (
      <QuestionStep
        key={viewIndex}
        no={qNo}
        count={questionSteps.length}
        question={step.question}
        storyText={storyText}
        saved={progress.answers?.[step.question.id]?.choice}
        busy={busy}
        error={error}
        onExit={exit}
        onBack={goBack}
        // [확인]: 답을 저장·확정 → 화면은 그대로 두고 정답·해설을 보여준다
        onCheck={(choice) =>
          run(() => saveAnswer(user.uid, episodeId, step.question, choice, stepIndex + 1), {
            answers: {
              ...progress.answers,
              [step.question.id]: { choice, correct: choice === step.question.answer },
            },
          })
        }
        // [다음 문제]: 화면만 다음 단계로 (저장은 [확인] 때 이미 함)
        onNext={isPast ? goForward : () => run(async () => {}, { step: stepIndex + 1 })}
      />
    )
  }

  return (
    <WritingStep
      key={viewIndex}
      storyId={episode.storyId}
      episodeId={episodeId}
      writing={step.writing}
      saved={progress.writing?.text}
      readOnly={isPast}
      busy={busy}
      saveError={error}
      onExit={exit}
      onBack={goBack}
      onForward={goForward}
      onSubmit={(value) =>
        run(() => saveWriting(user.uid, episodeId, value, stepIndex + 1), {
          step: stepIndex + 1,
          writing: value,
        })
      }
    />
  )
}

/** 긴 지문을 대화 상자 한 장 분량(문단 · 약 90자)으로 나눈다 */
function toPages(text) {
  const pages = []
  for (const para of text.split('\n').map((p) => p.trim()).filter(Boolean)) {
    const sentences = para.match(/[^.!?。”"]+[.!?。]*["”]?\s*/g) ?? [para]
    let cur = ''
    for (const s of sentences) {
      if (cur && (cur + s).length > 90) {
        pages.push(cur.trim())
        cur = ''
      }
      cur += s
    }
    if (cur.trim()) pages.push(cur.trim())
  }
  return pages.length ? pages : ['']
}

/** 이야기 진행 화면: 배경 + 아래 대화 상자 "이야기" · 터치하여 계속 */
function StoryStep({ title, bg, text, busy, error, onExit, onNext }) {
  const pages = toPages(text)
  const [page, setPage] = useState(0)
  const last = page === pages.length - 1

  function next() {
    if (busy) return
    if (last) onNext()
    else setPage(page + 1)
  }

  return (
    <div className={`story-play${bg ? '' : ' no-bg'}`} style={bg ? { backgroundImage: `url(${bg})` } : undefined}>
      <header className="story-play-bar">
        <button type="button" className="top-bar-btn" onClick={onExit} aria-label="나가기">
          <img src={caretLeft} alt="" width="28" height="28" />
        </button>
        <h1 className="top-bar-title">{title}</h1>
      </header>

      <button type="button" className="story-dialog" onClick={next} disabled={busy}>
        <span className="story-dialog-tag">이야기</span>
        <span key={page} className="story-dialog-text" aria-live="polite">
          {pages[page]}
        </span>
        {error && <span className="auth-error">{error}</span>}
        <span className="story-dialog-next">
          {busy ? '저장 중…' : last ? '문제 풀러 가기' : '터치하여 계속'}
          <img src={caretPurple} alt="" className="flip" width="21" height="21" />
        </span>
        <span className="story-dialog-count">
          {page + 1}/{pages.length}
        </span>
      </button>
    </div>
  )
}

/** 퀴즈 화면: 문제 → [확인] → 정답·해설(상자 안) → [다음 문제] */
function QuestionStep({ no, count, question, storyText, saved, busy, error, onExit, onBack, onCheck, onNext }) {
  const [choice, setChoice] = useState(saved ?? null)
  const [showStory, setShowStory] = useState(false)
  const revealed = saved != null // 답이 저장(확정)됐으면 정답 공개
  const isCorrect = revealed && saved === question.answer

  function choiceClass(n) {
    if (!revealed) return choice === n ? ' selected' : ''
    if (n === question.answer) return ' answer'
    if (n === saved) return ' chosen'
    return ''
  }

  return (
    <div className="quiz-page">
      <TopBar title={`${SKILL_LABELS[question.skill] ?? question.skill} 문제`} onBack={onExit} />
      <span className="quiz-count">
        {no}/{count}
      </span>
      <ProgressBar ratio={no / count} label="문제 진행도" />

      <p className="quiz-stem" id="quiz-stem">
        {no}번 문제.{'\n'}
        {question.question}
      </p>

      <section
        className={`quiz-box${revealed && !showStory ? (isCorrect ? ' is-correct' : ' is-wrong') : ''}`}
        aria-live="polite"
      >
        {revealed && !showStory ? (
          <div className={`answer-feedback ${isCorrect ? 'correct' : 'wrong'}`} role="status">
            <p className="answer-feedback-title">{isCorrect ? '정답이에요!' : '아쉬워요'}</p>
            {!isCorrect && (
              <p className="answer-feedback-text">
                정답은{' '}
                <strong>
                  {MARKS[question.answer - 1]} {question.choices[question.answer - 1]}
                </strong>
              </p>
            )}
            <p className="answer-feedback-text">
              <strong>해설</strong> {question.explanation}
            </p>
          </div>
        ) : (
          <>
            <p className="quiz-box-title">이야기 다시 보기</p>
            <p className="quiz-box-text">{storyText}</p>
          </>
        )}
        {revealed && (
          <button type="button" className="text-link quiz-box-toggle" onClick={() => setShowStory(!showStory)}>
            {showStory ? '해설 보기' : '이야기 다시 보기'}
          </button>
        )}
      </section>

      <div className="quiz-options" role="radiogroup" aria-labelledby="quiz-stem">
        {question.choices.map((c, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={(revealed ? saved : choice) === i + 1}
            className={`quiz-option${choiceClass(i + 1)}`}
            onClick={() => setChoice(i + 1)}
            disabled={revealed}
          >
            <span className="mark">{MARKS[i]}</span>
            <span>{c}</span>
            {revealed && i + 1 === question.answer && <span className="choice-tag">정답</span>}
            {revealed && i + 1 === saved && !isCorrect && <span className="choice-tag">내 답</span>}
          </button>
        ))}
      </div>

      {error && <p className="auth-error" role="alert">{error}</p>}

      <nav className="quiz-nav">
        <button type="button" className="btn btn-gray" onClick={onBack} disabled={!onBack || busy}>
          이전 문제
        </button>
        {revealed ? (
          <button type="button" className="btn btn-primary" onClick={onNext} disabled={busy}>
            다음 문제
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => onCheck(choice)} disabled={busy || !choice}>
            확인
          </button>
        )}
      </nav>
    </div>
  )
}

/** 글쓰기: 퀴즈 화면과 같은 틀 · 상자 안에 답 쓰기 → AI 평가 → 저장하고 다음 */
function WritingStep({ writing, saved, readOnly, busy, saveError, storyId, episodeId, onExit, onBack, onForward, onSubmit }) {
  const [text, setText] = useState(saved ?? '')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const response = await fetch('/api/writing/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, episodeId, userAnswer: text }),
      })
      if (!response.ok) throw new Error('AI 평가 요청에 실패했습니다.')
      const data = await response.json()
      if (!data || !Array.isArray(data.criteriaMet)) throw new Error('AI 평가 결과가 올바르지 않습니다.')
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="quiz-page">
      <TopBar title="글쓰기" onBack={onExit} />
      <p className="quiz-stem" id="writing-prompt">
        {writing.prompt}
      </p>

      <textarea
        className="field writing-input"
        rows={8}
        value={text}
        aria-labelledby="writing-prompt"
        readOnly={readOnly}
        onChange={(e) => {
          setText(e.target.value)
          setResult(null)
        }}
        placeholder="여기에 써보세요"
      />

      {result && (
        <section className="card writing-result" aria-live="polite">
          <p className="card-head">
            <span className="card-title">AI 평가</span>
            <span className={`tag ${result.passed ? 'strong' : 'weak'}`}>{result.passed ? '통과' : '다시 써봐요'}</span>
            <span className="score">
              {result.metCount} / {writing.criteria.length}
            </span>
          </p>
          <ul className="criteria-list">
            {writing.criteria.map((criterion, index) => (
              <li key={index} className={result.criteriaMet[index] ? 'met' : 'unmet'}>
                {criterion}
              </li>
            ))}
          </ul>
          <p className="card-text">{result.feedback}</p>
        </section>
      )}

      {(error || saveError) && (
        <p className="auth-error" role="alert">
          {error || saveError}
        </p>
      )}

      <nav className="quiz-nav">
        <button type="button" className="btn btn-gray" onClick={onBack} disabled={!onBack || busy || loading}>
          이전 문제
        </button>
        {readOnly ? (
          <button type="button" className="btn btn-primary" onClick={onForward}>
            다음
          </button>
        ) : result?.passed ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || loading}
            onClick={() =>
              onSubmit({
                text,
                feedback: { criteria: result.criteriaMet, good: result.feedback, improve: '', pending: false },
              })
            }
          >
            {busy ? '저장 중…' : '저장하고 완료'}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={submit} disabled={busy || loading || !text.trim()}>
            {loading ? 'AI 평가 중…' : 'AI 평가받기'}
          </button>
        )}
      </nav>
    </div>
  )
}
