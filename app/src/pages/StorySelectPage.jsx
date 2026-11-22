import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listStories } from '../content'
import { STORY_SHEET, storyArt } from '../content/storyArt'
import { TopBar } from '../components/AppChrome'
import dotOn from '../assets/figma/dot-on.svg'
import dotOff from '../assets/figma/dot-off.svg'

/** 이야기 선택 화면 (Figma): 캐릭터 카드 + 에피소드 완료 점 5개 → 누르면 그 이야기의 지도 */
export default function StorySelectPage() {
  const { profile } = useAuth()
  const done = new Set(profile.completedEpisodeIds ?? [])

  return (
    <div className="screen story-select-page">
      <TopBar title="이야기 선택" close to="/home" divider />
      <ul className="story-grid">
        {listStories().map((s) => {
          const art = storyArt(s.storyId)
          return (
            <li key={s.storyId}>
              <Link viewTransition to={`/home?story=${s.storyId}`} className="story-card">
                <span className="story-card-title">{s.title}</span>
                <span className="story-card-art" style={art.box ?? undefined}>
                  {art.crop && (
                    <img
                      src={STORY_SHEET}
                      alt=""
                      style={{
                        left: `${art.crop.left}%`,
                        top: `${art.crop.top}%`,
                        width: `${art.crop.width}%`,
                        height: `${art.crop.height}%`,
                      }}
                    />
                  )}
                </span>
                <span className="story-card-dots" aria-label={`${s.episodeIds.filter((id) => done.has(id)).length}/${s.episodeIds.length}화 완료`}>
                  {s.episodeIds.map((id) => (
                    <img key={id} src={done.has(id) ? dotOn : dotOff} alt="" width="20" height="20" />
                  ))}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
