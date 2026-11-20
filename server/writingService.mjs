import { getStory } from './storyService.mjs';

export function evaluateWriting(storyId, episodeId, criteriaMet, hold = false) {
    const story = getStory(storyId);
    const writing = story?.writing.find(w => w.passageId === episodeId);

    if (!writing || !Array.isArray(writing.criteria) || writing.criteria.length !== 3) {
        return null;
    }

    if (!Array.isArray(criteriaMet) || criteriaMet.length !== 3) {
        return null;
    }

    if (!criteriaMet.every(value => typeof value === 'boolean')) {
        return null;
    }

    if (typeof hold !== 'boolean') {
        return null;
    }

    // 충족한 평가 기준 개수 계산
    const metCount = criteriaMet.filter(Boolean).length;

    // 최종 통과 판정
    const passed = !hold && metCount >= 2;

    return {
        passed,
        metCount,
        criteria: writing.criteria,
        sampleAnswer: writing.sampleAnswer
    };
}