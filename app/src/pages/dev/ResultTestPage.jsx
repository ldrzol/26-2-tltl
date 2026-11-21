import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getEpisode, listEpisodes } from '../../content'
import { aggregateEpisode } from '../../logic/result'
import { episodeExp } from '../../config/gameRules'
import { finishEpisode } from '../../services/resultService'
import EpisodeResult from '../../components/result/EpisodeResult'

/**
 * [개발용] 학습 결과 화면 테스트 (/dev/result, 개발 서버에서만)
 * 퀴즈 화면(박초이)·AI 피드백(조성은)이 나오기 전까지, 답과 피드백을 직접 골라서 결과 화면을 띄운다.
 */
export default function ResultTestPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const episodes = listEpisodes()

  const [episodeId, setEpisodeId] = useState(episodes[0].episodeId)
  const episode = getEpisode(episodeId)
  const [answers, setAnswers] = useState({})
  const [text, setText] = useState('')
  const [criteria, setCriteria] = useState([true, true, false])
  const [done, setDone] = useState(null) // { result, reward, writing }
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function pickEpisode(id) {
    setEpisodeId(id)
    setAnswers({})
    setText('')
  }

  async function finish() {
    setError('')
    setBusy(true)
    try {
      // 임시 AI 피드백 (실제로는 AI가 만든다)
      const feedback = {
        criteria,
        good: '지문의 내용을 바탕으로 장면을 잘 표현했어요.',
        improve: criteria.every(Boolean) ? '' : '빠진 평가 기준을 확인하고 한 번 더 다듬어 봐요.',
        pending: false,
      }
      const result = aggregateEpisode(episode, answers, feedback)
      const isReplay = (profile.completedEpisodeIds ?? []).includes(episodeId)
      const exp = episodeExp({
        correctCount: result.correctCount,
        writingMetCount: result.writingMet,
        isReplay,
      })
      const reward = await finishEpisode(user.uid, {
        episodeId,
        skills: result.skills,
        episodeExp: exp,
      })
      setDone({
        result,
        reward,
        writing: { text, feedback },
      })
    } catch (e) {
      console.error(e)
      setError(e.code === 'permission-denied' ? '권한 오류: Firestore 규칙을 다시 게시했나요?' : e.message)
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <EpisodeResult
        episode={episode}
        result={done.result}
        reward={done.reward}
        writing={done.writing}
        profile={profile}
        onDone={() => navigate('/home')}
      />
    )
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <Link to="/home" className="auth-link">‹ 홈</Link>
        <h1>결과 화면 테스트</h1>
      </header>
      <p className="setting-desc">[개발용] 답을 고르고 완료하면 학습 결과 화면이 나와요. (에너지는 쓰지 않아요)</p>

      <div className="setting-card">
        <label className="setting-row">
          <span className="setting-label">에피소드</span>
          <select className="text-input" value={episodeId} onChange={(e) => pickEpisode(e.target.value)}>
            {episodes.map((ep) => (
              <option key={ep.episodeId} value={ep.episodeId}>
                {ep.storyTitle} · {ep.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {episode.questions.map((q, qi) => (
        <fieldset key={q.id} className="setting-card quiz-card">
          <legend className="setting-desc">
            Q{qi + 1} · {q.question}
          </legend>
          {q.choices.map((c, i) => (
            <label key={i} className="setting-row quiz-choice">
              <input
                type="radio"
                name={q.id}
                checked={answers[q.id]?.choice === i + 1}
                onChange={() => setAnswers((a) => ({ ...a, [q.id]: { choice: i + 1 } }))}
              />
              <span>
                {c} {i + 1 === q.answer && <em className="setting-desc">(정답)</em>}
              </span>
            </label>
          ))}
        </fieldset>
      ))}

      {episode.writing && (
        <div className="setting-card quiz-card">
          <p className="setting-desc" style={{ padding: '12px 14px 0', margin: 0 }}>
            글쓰기 · {episode.writing.prompt}
          </p>
          <div className="setting-row">
            <textarea
              className="text-input"
              rows={3}
              style={{ width: '100%' }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="답안을 써보세요"
            />
          </div>
          <p className="setting-desc" style={{ padding: '0 14px', margin: 0 }}>[임시 AI 피드백] 충족한 기준</p>
          {episode.writing.criteria.map((c, i) => (
            <label key={c} className="setting-row quiz-choice">
              <input
                type="checkbox"
                checked={criteria[i]}
                onChange={(e) => setCriteria((arr) => arr.map((v, j) => (j === i ? e.target.checked : v)))}
              />
              <span>{c}</span>
            </label>
          ))}
        </div>
      )}

      {error && <p className="auth-error" role="alert">{error}</p>}

      <button type="button" className="btn btn-primary" onClick={finish} disabled={busy}>
        {busy ? '저장 중…' : '에피소드 완료 → 결과 보기'}
      </button>
    </div>
  )
}
