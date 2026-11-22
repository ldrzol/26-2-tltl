import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NicknameRoute, ProtectedRoute, PublicOnlyRoute } from './routes/guards'
import { useApplySettings } from './hooks/useApplySettings'
import { listenForegroundMessages } from './services/notificationService'
import SplashPage from './pages/SplashPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import NicknamePage from './pages/NicknamePage'
import SettingsPage from './pages/SettingsPage'
import PolicyPage from './pages/PolicyPage'
import StoryReportPage from './pages/StoryReportPage'
import DiagnosisPage from './pages/DiagnosisPage'
import WelcomePage from './pages/WelcomePage'
import HomePage from './pages/HomePage'
import AttendancePage from './pages/AttendancePage'
import GenrePage from './pages/GenrePage'
import StorySelectPage from './pages/StorySelectPage'
import PlayPage from './pages/PlayPage'
import RewardTestPage from './pages/dev/RewardTestPage'
import ResultTestPage from './pages/dev/ResultTestPage'
import EpisodeListPage from './pages/dev/EpisodeListPage'
import './styles/app.css'
import './styles/auth.css'
import './styles/reward.css'
import './styles/settings.css'
import './styles/result.css'
import './styles/diagnosis.css'
import './styles/story.css'

/** 화면에 안 보이는 앱 전역 동작: 화면 설정 적용, 앱 사용 중 알림 표시 */
function AppEffects() {
  const { profile } = useAuth()
  useApplySettings(profile)

  const notificationsOn = Boolean(profile?.settings?.notifications?.enabled)
  useEffect(() => {
    if (!notificationsOn) return
    let unsubscribe = () => {}
    listenForegroundMessages().then((fn) => {
      unsubscribe = fn
    })
    return () => unsubscribe()
  }, [notificationsOn])

  return null
}

/**
 * 화면 흐름
 * /            로고(스플래시) → 로그인 상태에 따라 이동
 * /welcome     가입 화면: [로그인] [회원가입] (로그인 안 한 사람만)
 * /login       로그인          (로그인 안 한 사람만)
 * /signup      회원가입        (로그인 안 한 사람만)
 * /nickname    닉네임 설정      (구글 첫 가입만)
 * /diagnosis   초기 진단 테스트 (레벨 0만)
 * /home        메인 - 스토리 모드 지도 (레벨 1 이상, ?story=이야기ID&ep=에피소드ID)
 * /attendance  출석체크         (레벨 1 이상)
 * /genres      장르 → /stories 이야기 선택 (레벨 1 이상)
 * /play/:episodeId  이야기 진행 · 퀴즈 · 글쓰기 · 학습 완료 (레벨 1 이상)
 * /settings    설정            (레벨 1 이상)
 * /report/:storyId  이야기 완독 리포트 (레벨 1 이상)
 * /privacy, /terms  개인정보 처리방침·이용약관 (누구나)
 */
function App() {
  return (
    <AuthProvider>
      <AppEffects />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SplashPage />} />
          <Route path="/privacy" element={<PolicyPage type="privacy" />} />
          <Route path="/terms" element={<PolicyPage type="terms" />} />

          <Route element={<PublicOnlyRoute />}>
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
          </Route>

          <Route element={<NicknameRoute />}>
            <Route path="/nickname" element={<NicknamePage />} />
          </Route>

          <Route element={<ProtectedRoute maxLevel={0} />}>
            <Route path="/diagnosis" element={<DiagnosisPage />} />
          </Route>

          <Route element={<ProtectedRoute minLevel={1} />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/genres" element={<GenrePage />} />
            <Route path="/stories" element={<StorySelectPage />} />
            <Route path="/play/:episodeId" element={<PlayPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/report/:storyId" element={<StoryReportPage />} />
            {/* 개발 서버(npm run dev)에서만 열리는 테스트 화면 */}
            {import.meta.env.DEV && <Route path="/dev/rewards" element={<RewardTestPage />} />}
            {import.meta.env.DEV && <Route path="/dev/result" element={<ResultTestPage />} />}
            {import.meta.env.DEV && <Route path="/dev/episodes" element={<EpisodeListPage />} />}
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
