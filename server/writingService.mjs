import { getStory } from './storyService.mjs';
import { analyzeWritingWithAI } from './aiService.mjs';

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

// 글쓰기 답안 채점 및 피드백 생성 함수
// 설계원칙 : Gemini 평가 기준 충족 여부 판단하고 최종 합격 여부는 
export async function gradeWritingAnswer(storyId, episodeId, userAnswer) {
    const aiResult = await analyzeWritingWithAI(storyId, episodeId, userAnswer);

    if (!aiResult) {
        return null;
    }

    const gradeResult = evaluateWriting(
        storyId,
        episodeId,
        aiResult.criteriaMet
    );

    if (!gradeResult) {
        return null;
    }

    return {
        ...gradeResult,
        criteriaMet: aiResult.criteriaMet,
        feedback: aiResult.feedback
    };
}