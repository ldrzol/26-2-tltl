import { Link } from 'react-router-dom'
import logo from '../assets/figma/logo-landing.svg'
import cat from '../assets/figma/cat-landing.png'

/** 가입 화면: 로고 + 연보라 판 위 캐릭터 + 한 줄 소개 + [로그인] [회원가입] */
export default function WelcomePage() {
  return (
    <div className="auth-page welcome">
      <img src={logo} alt="또랑또랑" className="welcome-logo" width="262" height="74" />
      <div className="welcome-hero">
        <img src={cat} alt="" className="welcome-art" />
      </div>
      <p className="welcome-title">
        고전 이야기로
        <br />
        매일 한 걸음, 문해력 키우기
      </p>
      <div className="welcome-actions">
        <Link viewTransition to="/login" className="btn btn-primary btn-lg btn-pill">로그인</Link>
        <Link viewTransition to="/signup" className="btn btn-outline btn-lg btn-pill">회원가입</Link>
      </div>
    </div>
  )
}
