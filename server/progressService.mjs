import { isEpisodeQuizCleared } from './quizService.mjs';
import { evaluateWriting } from './writingService.mjs';
import { getStory } from './storyService.mjs';

export function isEpisodeCleared (storyId, episodeId, clearedQuestionIds, criteriaMet, hold = false) {
    const quizCleared = isEpisodeQuizCleared(storyId, episodeId, clearedQuestionIds);
    const writingResult = evaluateWriting(storyId, episodeId, criteriaMet, hold);

    // 두 조건 모두 충족해야 에피소드 클리어로 판단
    return quizCleared && writingResult?.passed === true;
}

export function isEpisodeUnlocked(storyId, episodeId, completedEpisodeKeys = []) {
    const story = getStory(storyId);

    if (!story || !Array.isArray(completedEpisodeKeys)) {
        return false;
    }
    if (!isChapterUnlocked(storyId, completedEpisodeKeys)) return false;

    const episodes = [...story.passages].sort((a, b) => a.order - b.order);
    const index = episodes.findIndex(ep => ep.id === episodeId);

    if (index < 0) return false;
    if (index === 0) return true; // 첫 번째 에피소드는 항상 잠금 해제됨

    const previousKey = `${storyId}:${episodes[index - 1].id}`;

    return completedEpisodeKeys.includes(previousKey);
}

// 에피소드 완료 처리 함수
export function completeEpisode(
    storyId,
    episodeId,
    clearedQuestionIds,
    criteriaMet,
    completedEpisodeKeys,
    hold = false
) {
    // 진행 목록이 올바른지 확인
    if (!Array.isArray(completedEpisodeKeys)) return [];

    // 잠긴 에피소드라면 클리어할 수 없음
    if (!isEpisodeUnlocked(storyId, episodeId, completedEpisodeKeys)) {
        return completedEpisodeKeys;
    }

    // 퀴즈와 글쓰기 평가를 모두 통과했는지 확인
    const cleared = isEpisodeCleared(
        storyId,
        episodeId,
        clearedQuestionIds,
        criteriaMet,
        hold
    );

    if (!cleared) return completedEpisodeKeys;

    // 이미 클리어한 에피소드라면 중복 추가하지 않음
    const key = `${storyId}:${episodeId}`;

    if (completedEpisodeKeys.includes(key)) {
        return completedEpisodeKeys;
    }

    return [...completedEpisodeKeys, key];
}

// 작품 완료 판정 함수
export function isStoryCleared(storyId, completedEpisodeKeys) {
    const story = getStory(storyId);

    if (!story) return false;
    if (!Array.isArray(completedEpisodeKeys)) return false;
    if (story.passages.length === 0) return false;

    return story.passages.every(ep =>
        completedEpisodeKeys.includes(`${storyId}:${ep.id}`)
    );
}

const chapterOrder = ['chunhyang', 'heungbu'];

// 챕터 잠금 해제 여부 확인 함수
export function isChapterUnlocked(storyId, completedEpisodeKeys) {
    if (!Array.isArray(completedEpisodeKeys)) return false;

    const index = chapterOrder.indexOf(storyId);

    if (index === -1) return false;
    if (index === 0) return true;

    const previousStoryId = chapterOrder[index - 1];

    return isStoryCleared(previousStoryId, completedEpisodeKeys);
}