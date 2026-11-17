import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

export const userDoc = (uid) => doc(db, 'users', uid)

/**
 * users/{uid} 문서 기본 구조
 * - 출석·에너지·진행 상태 필드는 이후 작업(진행 저장 데이터 구조 설계)에서 추가
 */
function newProfile({ name, email, provider, needsNickname = false }) {
  return {
    name,
    email,
    provider, // 'password' | 'google'
    needsNickname, // true면 닉네임 설정 화면부터 (구글 첫 가입)
    level: 0, // 진단 테스트 완료 시 1
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

export function createUserProfile(uid, info) {
  return setDoc(userDoc(uid), newProfile(info))
}

/** 문서가 없을 때만 생성 (구글 로그인처럼 가입/로그인이 한 번에 일어나는 경우) */
export async function ensureUserProfile(uid, info) {
  const snap = await getDoc(userDoc(uid))
  if (!snap.exists()) await createUserProfile(uid, info)
}

/** 닉네임 저장 (닉네임 설정 화면, 이후 설정 화면에서도 사용) */
export function updateNickname(uid, name) {
  return updateDoc(userDoc(uid), {
    name,
    needsNickname: false,
    updatedAt: serverTimestamp(),
  })
}
