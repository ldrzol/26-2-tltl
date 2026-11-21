export const NICKNAME_MAX = 12

/** 닉네임 검사: 문제가 있으면 에러 메시지, 없으면 null */
export function validateNickname(name) {
  if (!name) return '닉네임을 입력해주세요.'
  if (name.length > NICKNAME_MAX) return `닉네임은 ${NICKNAME_MAX}자 이하로 입력해주세요.`
  return null
}
