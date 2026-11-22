/**
 * 콘텐츠 읽기 — 앱의 다른 코드는 콘텐츠 JSON을 직접 읽지 않고 반드시 여기를 거친다.
 * 팀의 진짜 콘텐츠 JSON이 오면 import와 normalize 함수만 고치면 된다.
 */
import raw from './sourceAdapter.mjs'

// 콘텐츠의 문제 유형 이름 → 저장·집계용 키 (config/gameRules.js의 SKILLS)
const TYPE_TO_SKILL = {
  어휘: 'vocab',
  '내용 이해': 'comprehension',
  추론: 'inference',
  글쓰기: 'writing',
}

function normalizeEpisode(story, ep) {
  const questions = ep.questions.map((q) => ({
    id: q.questionId,
    skill: TYPE_TO_SKILL[q.type] ?? q.type,
    question: q.question,
    choices: q.choices,
    answer: q.answer, // 1~4
    explanation: q.explanation,
    difficulty: q.difficulty,
  }))
  const writing = ep.writing
    ? {
        id: ep.writing.questionId,
        prompt: ep.writing.prompt,
        criteria: ep.writing.criteria,
        example: ep.writing.example,
      }
    : null

  const byId = new Map(questions.map((q) => [q.id, q]))

  // 진행 순서: 이야기 · 문제 · 글쓰기가 섞인 배열. 진행 저장의 step = 이 배열의 위치
  // (steps가 없는 콘텐츠면 문제 → 글쓰기 순서로 만든다)
  const rawSteps =
    ep.steps ??
    [
      ...questions.map((q) => ({ type: 'question', questionId: q.id })),
      ...(writing ? [{ type: 'writing', questionId: writing.id }] : []),
    ]
  const steps = rawSteps.map((s) => {
    if (s.type === 'story') return { type: 'story', text: s.text }
    if (s.type === 'question') {
      const question = byId.get(s.questionId)
      if (!question) throw new Error(`[content] ${ep.episodeId}: 없는 문제 ${s.questionId}`)
      return { type: 'question', question }
    }
    if (s.type === 'writing') return { type: 'writing', writing }
    throw new Error(`[content] ${ep.episodeId}: 알 수 없는 단계 ${s.type}`)
  })

  return {
    episodeId: ep.episodeId,
    storyId: story.storyId,
    storyTitle: story.title,
    title: ep.title,
    steps,
    questions,
    writing,
  }
}

const episodes = new Map()
const stories = []
for (const story of raw.stories) {
  for (const ep of story.episodes) {
    episodes.set(ep.episodeId, normalizeEpisode(story, ep))
  }
  stories.push({
    storyId: story.storyId,
    title: story.title,
    episodeIds: story.episodes.map((ep) => ep.episodeId),
  })
}

/** 이야기 목록 (순서 = 콘텐츠 순서) */
export function listStories() {
  return stories
}

/** 이야기 하나 { storyId, title, episodeIds } (없으면 null) */
export function getStory(storyId) {
  return stories.find((s) => s.storyId === storyId) ?? null
}

/** 다음 이야기 (마지막이면 null) */
export function nextStory(storyId) {
  const i = stories.findIndex((s) => s.storyId === storyId)
  return i >= 0 ? (stories[i + 1] ?? null) : null
}

/** 에피소드 하나 (없으면 null) */
export function getEpisode(episodeId) {
  return episodes.get(episodeId) ?? null
}

/** 전체 에피소드 목록 */
export function listEpisodes() {
  return [...episodes.values()]
}
