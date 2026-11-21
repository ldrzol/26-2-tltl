import { GoogleGenAI } from '@google/genai';
import { getStory, getEpisode } from './storyService.mjs';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

export async function analyzeWritingWithAI(storyId, episodeId, userAnswer) {
    const story = getStory(storyId);
    const episode = getEpisode(storyId, episodeId);
    const writing = story?.writing.find(w => w.passageId === episodeId);

    if (!episode || !writing || typeof userAnswer !== 'string' || !userAnswer.trim()) {
        return null;
    }

    const prompt = `
당신은 문해력 학습자의 글쓰기 답안을 평가하는 교사입니다.

[학습 지문]
${episode.text}

[글쓰기 문제]
${writing.prompt}

[평가 기준]
${writing.criteria.join('\n')}

[사용자 답안]
${userAnswer}

각 평가 기준의 충족 여부를 순서대로 true 또는 false로 판단하세요.
지문과 평가 기준에 근거하여 간단한 피드백을 작성하세요.

다음 JSON 형식으로만 답변하세요.
{
    "criteriaMet": [true, false, true],
    "feedback": "답안에 대한 구체적인 피드백"
}
`;

    let response;

    try {
        response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });
    } catch (error) {
        if (error.status === 503) {
            console.error('Gemini 서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.');
            return null;
        }

        throw error;
    }

    let result;

    try {
        result = JSON.parse(response.text);
    } catch {
        return null;
    }

    if (
        !result ||
        !Array.isArray(result.criteriaMet) ||
        result.criteriaMet.length !== writing.criteria.length ||
        !result.criteriaMet.every(value => typeof value === 'boolean') ||
        typeof result.feedback !== 'string' ||
        !result.feedback.trim()
    ) {
        return null;
    }

    return result;
}