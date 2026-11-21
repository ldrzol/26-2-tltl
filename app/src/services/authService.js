import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth'
import { auth } from '../firebase'
import { createUserProfile, ensureUserProfile } from './userService'

/** 이메일 회원가입: Auth 계정 생성 → Firestore users/{uid} 문서 생성 (level 0) */
export async function signUpWithEmail({ email, password, name }) {
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  await createUserProfile(user.uid, { name, email, provider: 'password' })
  return user
}

export async function signInWithEmail({ email, password }) {
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  // 가입 중 프로필 저장이 실패했던 계정 복구용
  await ensureUserProfile(user.uid, {
    name: user.displayName || email.split('@')[0],
    email,
    provider: 'password',
  })
  return user
}

/** 구글 로그인: 처음 로그인한 사용자면 users 문서를 만들고 닉네임 설정 화면으로 보낸다 */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const { user } = await signInWithPopup(auth, provider)
  await ensureUserProfile(user.uid, {
    name: user.displayName || '학습자',
    email: user.email,
    provider: 'google',
    needsNickname: true,
  })
  return user
}

export function resetPassword(email) {
  return sendPasswordResetEmail(auth, email)
}

export function logout() {
  return signOut(auth)
}
