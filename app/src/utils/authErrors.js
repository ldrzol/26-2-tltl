const MESSAGES = {
  'auth/invalid-email': '이메일 형식이 올바르지 않아요.',
  'auth/missing-email': '이메일을 입력해주세요.',
  'auth/missing-password': '비밀번호를 입력해주세요.',
  'auth/email-already-in-use': '이미 가입된 이메일이에요.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 해요.',
  'auth/invalid-credential': '이메일 또는 비밀번호가 맞지 않아요.',
  'auth/wrong-password': '이메일 또는 비밀번호가 맞지 않아요.',
  'auth/user-not-found': '이메일 또는 비밀번호가 맞지 않아요.',
  'auth/user-disabled': '사용이 정지된 계정이에요.',
  'auth/too-many-requests': '시도가 너무 많아요. 잠시 후 다시 시도해주세요.',
  'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
  'auth/popup-blocked': '팝업이 차단됐어요. 브라우저에서 팝업을 허용해주세요.',
  'auth/operation-not-allowed': '이 로그인 방식이 아직 활성화되지 않았어요.',
}

const SILENT = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])

/** Firebase 에러 → 사용자에게 보여줄 한국어 메시지 (무시해도 되는 에러면 null) */
export function authErrorMessage(error) {
  const code = error?.code
  if (SILENT.has(code)) return null
  return MESSAGES[code] ?? '문제가 발생했어요. 잠시 후 다시 시도해주세요.'
}
