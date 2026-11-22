import {
  collection,
  doc,
  FieldPath,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase'
import { userDoc } from './userService'
import { applySpendEnergy } from './energyService'
import { applyEpisodeRewards } from './rewardService'
import { applyEpisodeResult } from './resultService'
import { aggregateEpisode, starsFor } from '../logic/result'
import { getStory, listStories } from '../content'
import { episodeExp } from '../config/gameRules'
import { todayKey } from '../utils/date'

/**
 * 학습 진행 저장·복원 (docs/data-structure.md 4절, 7절)
 *
 * users/{uid}/progress/{episodeId}
 *   { storyId, status: 'in_progress'|'completed', step, answers, writing, result, expGained, attempts, ... }
 * users/{uid}.current = { episodeId, step } | null   ← 홈의 "이어하기"
 *
 * 화면에서 부르는 순서:
 *   startEpisode (새로/처음부터, 에너지 −1)  또는  loadProgress (이어하기)
 *   → saveStep / saveAnswer / saveWriting (단계마다)
 *   → completeEpisode (마지막, 결과·출석·경험치 한 번에)
 */

export const progressDoc = (uid, episodeId) => doc(db, 'users', uid, 'progress', episodeId)

export function isEpisodeUnlocked(episodeId, completedEpisodeIds = []) {
  const episodeOrder = listStories().flatMap(story => story.episodeIds)
  const index = episodeOrder.indexOf(episodeId)

  if (index === -1 || !Array.isArray(completedEpisodeIds)) {
    return false
  }

  const completedSet = new Set(completedEpisodeIds)

  return episodeOrder
    .slice(0, index)
    .every(id => completedSet.has(id))
}

/** 에피소드 시작 (새로 시작 · 처음부터 · 다시 풀기): 에너지 1개 사용, 진행 초기화 */
export function startEpisode(uid, episode, today = todayKey()) {
  return runTransaction(db, async (tx) => {
    // transaction은 읽기를 모두 끝낸 뒤 쓰기
    const userSnap = await tx.get(userDoc(uid))
    const progSnap = await tx.get(progressDoc(uid, episode.episodeId))
    if (!userSnap.exists()) throw new Error('사용자 문서가 없습니다.')

    // Firebase에 저장된 완료 에피소드 목록 확인
    const completedEpisodeIds = userSnap.data().completedEpisodeIds ?? []

    // 이전 에피소드를 완료하지 않았다면 시작 차단
    if (!isEpisodeUnlocked(episode.episodeId, completedEpisodeIds)) {
      throw new Error('이전 에피소드를 먼저 완료해야 합니다.')
    }

    const remaining = applySpendEnergy(tx, uid, userSnap.data(), today)
    const prev = progSnap.data() ?? {}

    tx.set(progressDoc(uid, episode.episodeId), {
      storyId: episode.storyId,
      status: 'in_progress',
      step: 0,
      answers: {},
      writing: null,
      // 지난 완료 결과·별점은 남겨 둔다 (다시 풀다 그만둬도 완독 리포트가 비지 않도록)
      result: prev.result ?? null,
      lastAnswers: prev.lastAnswers ?? null,
      stars: prev.stars ?? null,
      bestStars: prev.bestStars ?? null,
      expGained: prev.expGained ?? null,
      attempts: (prev.attempts ?? 0) + 1,
      startedAt: serverTimestamp(),
      completedAt: null,
      updatedAt: serverTimestamp(),
    })
    tx.update(userDoc(uid), { current: { episodeId: episode.episodeId, step: 0 } })

    return { energyLeft: remaining }
  })
}

// 에피소드 무료 재도전
export function retryEpisode(uid, episode) {
  return runTransaction(db, async (tx) => {
    const userRef = userDoc(uid)
    const episodeRef = progressDoc(uid, episode.episodeId)

    const userSnap = await tx.get(userRef)
    const progressSnap = await tx.get(episodeRef)

    if (!userSnap.exists() || !progressSnap.exists()) {
      throw new Error('재도전할 학습 기록이 없습니다.')
    }

    // 잠긴 에피소드는 재도전 불가
    const completedIds = userSnap.data().completedEpisodeIds ?? []

    if (!isEpisodeUnlocked(episode.episodeId, completedIds)) {
      throw new Error('잠긴 에피소드는 재도전할 수 없습니다.')
    }

    // 진행 중인 에피소드만 재도전 가능
    if (progressSnap.data().status !== 'in_progress') {
      throw new Error('진행 중인 에피소드만 재도전할 수 있습니다.')
    }

    // 진행 상태 초기화
    tx.update(episodeRef, {
      step: 0,
      answers: {},
      writing: null,
      attempts: (progressSnap.data().attempts ?? 0) + 1,
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // 이어하기 위치도 첫 단계로 변경
    tx.update(userRef, {
      current: {
        episodeId: episode.episodeId,
        step: 0,
      },
    })
  })
}

// 저장된 진행 불러오기 (이어하기)
export async function loadProgress(uid, episodeId) {
  const userSnap = await getDoc(userDoc(uid))

  if (!userSnap.exists()) return null

  // Firebase에 저장된 완료 에피소드 확인
  const completedEpisodeIds = userSnap.data().completedEpisodeIds ?? []

  // 잠긴 에피소드라면 진행 기록을 불러오지 않음
  if (!isEpisodeUnlocked(episodeId, completedEpisodeIds)) {
    return null
  }

  const snap = await getDoc(progressDoc(uid, episodeId))

  return snap.exists() ? snap.data() : null
}

/** progress와 users.current를 함께 갱신 (한 번에 저장되도록 batch) */
function commitStep(uid, episodeId, step, extra = []) {
  const batch = writeBatch(db)
  batch.update(progressDoc(uid, episodeId), 'step', step, 'updatedAt', serverTimestamp(), ...extra)
  batch.update(userDoc(uid), { current: { episodeId, step } })
  return batch.commit()
}

/** 이야기 넘길 때: 다음 단계 위치만 저장 */
export function saveStep(uid, episodeId, nextStep) {
  return commitStep(uid, episodeId, nextStep)
}

/** 객관식 답 제출: 고른 답 + 다음 단계 위치 */
export function saveAnswer(uid, episodeId, question, choice, nextStep) {
  // questionId에 '-'가 있어서 점(.) 문자열 대신 FieldPath로 지정
  return commitStep(uid, episodeId, nextStep, [
    new FieldPath('answers', question.id),
    { choice, correct: choice === question.answer },
  ])
}

/** 글쓰기 제출: 답안 + AI 피드백 (다시 열어도 AI를 또 부르지 않도록 저장) */
export function saveWriting(uid, episodeId, { text, feedback }, nextStep) {
  return commitStep(uid, episodeId, nextStep, [
    'writing',
    { text, feedback, submittedAt: serverTimestamp() },
  ])
}

/**
 * 에피소드 완료: 결과 집계 + 능력치 누적 + 출석·경험치·레벨 + 이어하기 정리 — 전부 한 번에
 * @returns { result, reward }  → 학습 결과 화면(EpisodeResult)에 그대로 넘긴다
 */
export function completeEpisode(uid, episode, today = todayKey()) {
  return runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userDoc(uid))
    const progSnap = await tx.get(progressDoc(uid, episode.episodeId))
    if (!userSnap.exists() || !progSnap.exists()) throw new Error('진행 기록이 없습니다.')
    const user = userSnap.data()
    const progress = progSnap.data()
    if (progress.status === 'completed') throw new Error('이미 완료한 에피소드예요.')
    if (!isEpisodeUnlocked(episode.episodeId, user.completedEpisodeIds ?? [])) {
      throw new Error('잠긴 에피소드는 완료할 수 없습니다.')
    }
    const result = aggregateEpisode(episode, progress.answers, progress.writing?.feedback)

    // 객관식 3문제를 모두 맞혔는지 확인
    const quizPassed =
      result.questionCount === 3 &&
      result.correctCount === 3

    // 글쓰기 평가 기준 3개 중 2개 이상 충족했는지 확인
    const writingPassed =
      result.writingTotal === 3 &&
      result.writingMet >= 2 &&
      progress.writing?.feedback?.pending !== true

    // 에피소드의 마지막 단계까지 진행했는지 확인
    const finishedSteps = progress.step >= episode.steps.length

    // 하나라도 충족하지 못했다면 완료 처리 중단
    if (!quizPassed || !writingPassed || !finishedSteps) {
      throw new Error(
        '학습을 통과하지 못했습니다. 에피소드 목록에서 무료로 재도전할 수 있습니다.'
      )
    }

  const isReplay = (user.completedEpisodeIds ?? []).includes(episode.episodeId)
    const exp = episodeExp({
      correctCount: result.correctCount,
      writingMetCount: result.writingMet,
      isReplay,
    })

    const reward = applyEpisodeRewards(tx, uid, user, {
      episodeId: episode.episodeId,
      episodeExp: exp,
      today,
    })
    applyEpisodeResult(tx, uid, { episodeId: episode.episodeId, skills: result.skills })

    const stars = starsFor(result)
    tx.update(progressDoc(uid, episode.episodeId), {
      status: 'completed',
      step: episode.steps.length,
      result: result.skills,
      lastAnswers: progress.answers, // 완독 리포트의 "틀린 문제 모아보기"용
      stars,
      bestStars: Math.max(stars, progress.bestStars ?? 0),
      expGained: exp,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    // 이어하기 정리 (다른 에피소드를 하고 있었다면 그대로 둠)
    if (user.current?.episodeId === episode.episodeId) {
      tx.update(userDoc(uid), { current: null })
    }

    // 이번 완료로 이야기를 처음 다 끝냈는지 → 결과 화면에서 "완독 리포트" 버튼
    const story = getStory(episode.storyId)
    const before = new Set(user.completedEpisodeIds ?? [])
    const after = new Set([...before, episode.episodeId])
    const storyCompleted =
      Boolean(story) &&
      story.episodeIds.every((id) => after.has(id)) &&
      !story.episodeIds.every((id) => before.has(id))

    return { result, reward, stars, storyCompleted }
  })
}

/** 이야기 하나의 진행 기록 전부 (완독 리포트용) → { [episodeId]: progress } */
export async function loadStoryProgress(uid, storyId) {
  const snap = await getDocs(
    query(collection(db, 'users', uid, 'progress'), where('storyId', '==', storyId)),
  )
  const map = {}
  snap.forEach((d) => {
    map[d.id] = d.data()
  })
  return map
}
