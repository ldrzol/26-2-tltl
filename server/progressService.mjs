import { isEpisodeQuizCleared } from './quizService.mjs';
import { evaluateWriting } from './writingService.mjs';

export function isEpisodeCleared (storyId, episodeId, clearedQuestionIds, criteriaMet, hold = false) {
    const quizCleared = isEpisodeQuizCleared(storyId, episodeId, clearedQuestionIds);
    const writingResult = evaluateWriting(storyId, episodeId, criteriaMet, hold);

    // 두 조건 모두 충족해야 에피소드 클리어로 판단
    return quizCleared && writingResult?.passed === true;
}