import { getStory } from './storyService.mjs'

export function getQuiz(storyId, questionId, selectedAnswer) {
    const story = getStory(storyId);

    // 프론트엔드 문제 ID를 원본 JSON의 문제 ID로 변환
    const originalQuestionId = questionId.startsWith(`${storyId}-`)
        ? questionId.slice(storyId.length + 1).replace(/-q(\d+)$/, '-$1')
        : questionId;

    const question = story?.questions.find(q => q.id === originalQuestionId);
    if (!question) return null;

    // 사용자 선택 답과 JSON에 저장된 정답 비교
    return {
        correct: selectedAnswer === question.answer,
        explanation: question.explanation
    };
}

// 해당 에피소드 모든 객관식 문제를 맞췄는지 확인하는 함수
export function isEpisodeQuizCleared(storyId, episodeId, clearedQuestionIds) {
    const story = getStory(storyId);

    if (!story || !Array.isArray(clearedQuestionIds)) { return false; }
    const questions = story.questions.filter(q => q.passageId === episodeId);

    // 프론트엔드의 문제 ID를 원본 ID로 변환
    const normalizedIds = clearedQuestionIds.map(id =>
        typeof id === 'string' && id.startsWith(`${storyId}-`)
            ? id.slice(storyId.length + 1).replace(/-q(\d+)$/, '-$1')
            : id
    );

    return questions.length === 3 &&
        questions.every(q => normalizedIds.includes(q.id));
}