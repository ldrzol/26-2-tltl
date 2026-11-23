import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getEpisode, getStory, listStories } from '../content'
import {
  isEpisodeUnlocked,
  loadStoryProgress,
  retryEpisode,
  startEpisode,
} from '../services/progressService'
import { BottomNav, EnergyStars, LevelChip } from '../components/AppChrome'
import mapPath from '../assets/figma/map-path.svg'
import nodeLock from '../assets/figma/node-lock.svg'
import nodeStar from '../assets/figma/node-star.svg'
import nodeCrown from '../assets/figma/node-crown.svg'
import catNode from '../assets/figma/cat-node.png'

// 화면 전환을 부드럽게 (브라우저 View Transitions, 지원 안 하면 그냥 이동)
const VT = { viewTransition: true }

// Figma "메인 화면 - 스토리 모드"의 동그라미 위치 (402px 화면 기준, 지도 위쪽 230px을 0으로)
// 아래(1화)부터 위(5화)로 올라간다
const MAP_TOP = 230
const NODE_POS = [
  { x: 81, y: 655 },
  { x: 246, y: 559 },
  { x: 93, y: 456 },
  { x: 234, y: 366 },
  { x: 163, y: 238 },
]
const NODE = 75
const BUBBLE_W = 310
const SCREEN_W = 402

/** 지금 볼 이야기: 주소(?story=) → 진행 중 에피소드의 이야기 → 아직 다 안 끝낸 첫 이야기 */
function pickStory(param, profile) {
  if (param && getStory(param)) return getStory(param)
  const current = profile.current && getEpisode(profile.current.episodeId)
  if (current) return getStory(current.storyId)
  const done = new Set(profile.completedEpisodeIds ?? [])
  const stories = listStories()
  return stories.find((s) => s.episodeIds.some((id) => !done.has(id))) ?? stories[0]
}

/**
 * 메인 화면 - 스토리 모드 (Figma)
 * 에너지 별 · 챕터 카드(누르면 장르/이야기 선택) · 에피소드 지도 · 하단 바
 * 동그라미를 누르면 말풍선에서 [시작하기]/[이어하기]/[다시 풀기]
 */
export default function HomePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const story = pickStory(params.get('story'), profile)
  const storyIndex = listStories().findIndex((s) => s.storyId === story.storyId)

  const [progress, setProgress] = useState({})
  const [selected, setSelected] = useState(() => params.get('ep'))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStoryProgress(user.uid, story.storyId).then(setProgress)
  }, [user.uid, story.storyId])

  const completed = new Set(profile.completedEpisodeIds ?? [])
  const allDone = story.episodeIds.every((id) => completed.has(id))
  const episodes = story.episodeIds.slice(0, NODE_POS.length).map((id, i) => {
    const unlocked = isEpisodeUnlocked(id, profile.completedEpisodeIds ?? [])
    return {
      id,
      i,
      ep: getEpisode(id),
      unlocked,
      done: completed.has(id),
      inProgress: progress[id]?.status === 'in_progress',
    }
  })
  // 캐릭터는 지금 할 차례인 동그라미 위에 (다 끝냈으면 마지막)
  const nextIndex = episodes.findIndex((e) => e.unlocked && !e.done)
  // 고양이: 지금 할 차례인 에피소드 위 → 다 끝냈으면 마지막 위 → 아직 열린 게 없으면(이전 이야기 진행 중) 숨김
  const catAt = nextIndex !== -1 ? nextIndex : allDone ? episodes.length - 1 : -1

  async function act(e, action) {
    setBusy(true)
    setError('')
    try {
      await action(user.uid, e.ep)
      navigate(`/play/${e.id}`, VT)
    } catch (err) {
      console.error(err)
      setError(err.message)
      setBusy(false)
    }
  }

  function select(id) {
    setError('')
    setSelected((cur) => (cur === id ? null : id))
  }

  const sel = episodes.find((e) => e.id === selected)

  return (
    <div className="screen has-nav home-page">
      <div className="home-top">
        <LevelChip name={profile.name} exp={profile.exp ?? 0} level={profile.level} />
        <EnergyStars energy={profile.energy} />
      </div>

      <Link viewTransition to="/genres" className="chapter-card">
        <span className="chapter-genre">고전문학</span>
        <span className="chapter-title">
          Chapter {storyIndex + 1}. {story.title}
        </span>
      </Link>

      <div className="story-map" onClick={(ev) => ev.target === ev.currentTarget && setSelected(null)}>
        <img src={mapPath} alt="" className="map-path" width="165" height="431" />

        {episodes.map((e) => {
          const pos = NODE_POS[e.i]
          const last = e.i === episodes.length - 1
          const icon = !e.unlocked ? nodeLock : last ? nodeCrown : nodeStar
          return (
            <button
              key={e.id}
              type="button"
              className={`map-node${e.unlocked ? '' : ' locked'}${e.i === nextIndex ? ' current' : ''}${selected === e.id ? ' on' : ''}`}
              style={{ left: pos.x, top: pos.y - MAP_TOP }}
              onClick={() => select(e.id)}
              aria-label={`${e.i + 1}화 ${e.ep.title}${e.done ? ' (완료)' : e.unlocked ? '' : ' (잠김)'}`}
              aria-expanded={selected === e.id}
            >
              <span className="map-node-bg" aria-hidden="true" />
              <img src={icon} alt="" className="map-node-icon" />
            </button>
          )
        })}

        {catAt !== -1 && (
          <img
            src={catNode}
            alt=""
            className="map-cat"
            style={{ left: NODE_POS[catAt].x - 12, top: NODE_POS[catAt].y - MAP_TOP - 60 }}
          />
        )}

        {sel && (
          <EpisodeBubble
            e={sel}
            pos={NODE_POS[sel.i]}
            busy={busy}
            error={error}
            allDone={allDone}
            storyId={story.storyId}
            onStart={() => act(sel, startEpisode)}
            onResume={() => navigate(`/play/${sel.id}`, VT)}
            onRetry={() => act(sel, retryEpisode)}
          />
        )}
      </div>

      <BottomNav />
    </div>
  )
}

/** 동그라미 위 말풍선 (Figma: 보라 #C289FF 310×106 + 꼬리) */
function EpisodeBubble({ e, pos, busy, error, allDone, storyId, onStart, onResume, onRetry }) {
  const centerX = pos.x + NODE / 2
  const left = Math.min(Math.max(centerX - 71.5, 16), SCREEN_W - 16 - BUBBLE_W)
  const bottom = pos.y - MAP_TOP - 20 // 꼬리 끝이 동그라미 20px 위

  return (
    <div className="map-bubble" style={{ left, top: bottom }} role="dialog" aria-label={`${e.i + 1}화 ${e.ep.title}`}>
      <div className="map-bubble-body">
        <p className="map-bubble-title">
          {e.i + 1}화 · {e.ep.title}
        </p>
        {!e.unlocked ? (
          <p className="map-bubble-note">이전 에피소드를 먼저 완료해 주세요</p>
        ) : e.inProgress ? (
          <>
            <button type="button" className="map-bubble-btn" onClick={onResume} disabled={busy}>
              이어하기
            </button>
            <button type="button" className="map-bubble-link" onClick={onRetry} disabled={busy}>
              처음부터 다시 (에너지 소모 없음)
            </button>
          </>
        ) : (
          <>
            <button type="button" className="map-bubble-btn" onClick={onStart} disabled={busy}>
              {busy ? '준비 중…' : e.done ? '다시 풀기' : '시작하기'}
            </button>
            <p className="map-bubble-note">에너지 1개를 사용해요</p>
          </>
        )}
        {allDone && e.i === NODE_POS.length - 1 && (
          <Link viewTransition to={`/report/${storyId}`} className="map-bubble-link">
            완독 리포트 보기
          </Link>
        )}
        {error && (
          <p className="map-bubble-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <span className="map-bubble-tail" style={{ left: centerX - left - 15 }} aria-hidden="true" />
    </div>
  )
}
