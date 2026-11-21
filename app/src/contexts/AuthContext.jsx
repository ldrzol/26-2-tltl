import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { onSnapshot } from 'firebase/firestore'
import { auth } from '../firebase'
import { userDoc } from '../services/userService'

const AuthContext = createContext(null)

/**
 * 앱 전체에서 로그인 상태를 공유
 * - user: Firebase Auth 사용자 (없으면 null)
 * - profile: Firestore users/{uid} 문서 (실시간 반영, 아직 없으면 null)
 * - loading: 첫 로그인 상태 확인 중
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubProfile = () => {}

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubProfile()
      setUser(firebaseUser)
      setProfile(null)

      if (!firebaseUser) {
        setLoading(false)
        return
      }

      unsubProfile = onSnapshot(
        userDoc(firebaseUser.uid),
        (snap) => {
          setProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null)
          setLoading(false)
        },
        (error) => {
          console.error('[auth] 프로필을 불러오지 못했습니다.', error)
          setLoading(false)
        },
      )
    })

    return () => {
      unsubProfile()
      unsubAuth()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서 사용해야 합니다.')
  return ctx
}
