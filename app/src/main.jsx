import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyCachedDisplaySettings } from './hooks/useApplySettings'

// 로그인 확인 전에 지난번 글자 크기·테마를 먼저 적용 (깜빡임 방지)
applyCachedDisplaySettings()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
