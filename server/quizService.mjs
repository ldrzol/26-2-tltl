import { getStory } from './storyService.mjs'

export function getQuiz(storyId, questionId, selectedAnswer) {
    const story = getStory(storyId);
    const question = story?.questions.find(q => q.id === questionId);
    
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

    return questions.length === 3 && questions.every(q => clearedQuestionIds.includes(q.id));
}