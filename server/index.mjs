import express from 'express';
import { getStory, getEpisode } from './storyService.mjs';
import { getQuiz } from './quizService.mjs';
import { gradeWritingAnswer } from './writingService.mjs';

const app = express();
const PORT = 3000;

app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// 스토리 조회 API
app.get('/api/stories/:storyId', (req, res) => {
    const storyId = req.params.storyId;
    const story = getStory(storyId);

    if (!story) {
        return res.status(404).json({
            error: '스토리를 찾을 수 없습니다.'
        });
    }

    res.json({
        id: storyId,
        title: story.title,
        episodes: story.passages.map(ep => ({
            id: ep.id,
            title: ep.title,
            order: ep.order
        }))
    });
});

// 에피소드 조회 API
app.get('/api/stories/:storyId/episodes/:episodeId', (req, res) => {
    const { storyId, episodeId } = req.params;
    
    // 백엔드 함수를 API와 연결
    const episode = getEpisode(storyId, originalEpisodeId);

    if (!episode) {
        return res.status(404).json({
            error: '에피소드를 찾을 수 없습니다.'
        });
    }

    res.json({
        id: episode.id,
        title: episode.title,
        text: episode.text,
        order: episode.order
    });
});

app.get('/api/stories/:storyId/episodes/:episodeId/questions', (req, res) => {
    const { storyId, episodeId } = req.params;

    const episode = getEpisode(storyId, episodeId);

    if (!episode) {
        return res.status(404).json({
            error: '에피소드를 찾을 수 없습니다.'
        });
    }

    const story = getStory(storyId);

    const questions = story.questions
        .filter(q => q.passageId === episodeId) // 해당 에피소드에 속한 질문만 필터링
        
        // 프론트엔드에 필요한 정보만 전달
        .map(q => ({
            id: q.id,
            type: q.type,
            question: q.question,
            options: q.options,
            difficulty: q.difficulty
        }));

    res.json(questions);
});

// 퀴즈 정답 판정 API
app.post('/api/quiz/grade', (req, res) => {
    const { storyId, questionId, selectedAnswer } = req.body ?? {};

    if (typeof storyId !== 'string' || typeof questionId !== 'string') {
        return res.status(400).json({
            error: '스토리 ID와 문제 ID가 필요합니다.'
        });
    }

    if (!Number.isInteger(selectedAnswer) || selectedAnswer < 1 || selectedAnswer > 4) {
        return res.status(400).json({
            error: '정답은 1~4 사이의 숫자로 제출해야 합니다.'
        });
    }

    const result = getQuiz(storyId, questionId, selectedAnswer);

    if (!result) {
        return res.status(404).json({
            error: '문제를 찾을 수 없습니다.'
        });
    }

    res.json(result);
});

// 글쓰기 문제 조희 API
app.get('/api/stories/:storyId/episodes/:episodeId/writing', (req, res) => {
    const { storyId, episodeId } = req.params;

    const story = getStory(storyId);
    const episode = getEpisode(storyId, episodeId);

    if (!story || !episode) {
        return res.status(404).json({
            error: '에피소드를 찾을 수 없습니다.'
        });
    }

    const writing = story.writing.find(w => w.passageId === episodeId);

    if (!writing) {
        return res.status(404).json({
            error: '글쓰기 문제를 찾을 수 없습니다.'
        });
    }

    res.json({
        passageId: writing.passageId,
        level: writing.level,
        prompt: writing.prompt,
        criteria: writing.criteria
    });
});

// 글쓰기 답안 평가 API
app.post('/api/writing/grade', async (req, res) => {
    const { storyId, episodeId, userAnswer } = req.body ?? {};

    // 입력값 확인
    if (
        typeof storyId !== 'string' ||
        typeof episodeId !== 'string' ||
        typeof userAnswer !== 'string' ||
        !userAnswer.trim()
    ) {
        return res.status(400).json({
            error: '스토리 ID, 에피소드 ID, 글쓰기 답안이 필요합니다.'
        });
    }

    // 프론트엔드의 에피소드 ID를 원본 JSON ID로 변환
    const originalEpisodeId = episodeId.startsWith(`${storyId}-`)
        ? episodeId.slice(storyId.length + 1)
        : episodeId;

    // 해당 글쓰기 문제가 존재하는지 확인
    const story = getStory(storyId);
    const episode = getEpisode(storyId, originalEpisodeId);
    const writing = story?.writing.find(w => w.passageId === originalEpisodeId);

    if (!episode || !writing) {
        return res.status(404).json({
            error: '글쓰기 문제를 찾을 수 없습니다.'
        });
    }

    try {
        const result = await gradeWritingAnswer(storyId, originalEpisodeId, userAnswer);

        if (!result) {
            return res.status(503).json({
                error: 'AI 평가 결과를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.'
            });
        }

        return res.json(result);
    } catch (error) {
        console.error('글쓰기 평가 오류:', error.status ?? error.message);

        return res.status(503).json({
            error: '글쓰기 평가 서비스를 일시적으로 사용할 수 없습니다.'
        });
    }
});

app.listen(PORT, () => {
    console.log(`API 서버 실행: http://localhost:${PORT}`);
});