import chunhyang from '../data/chunhyang.json' with {type:'json'}
import heungbu from '../data/heungbu.json' with {type:'json'}

const stories = { chunhyang, heungbu };

// 스토리 조회 기능
export function getEpisode(storyID, episodeId) {
  const story = stories[storyID];
  if (!story) return null;
  return story.passages.find(ep => ep.id === episodeId) ?? null;
}

// 객관식 정답 판정 구현
export function getStory(storyId) {
    return stories[storyId] ?? null;
}