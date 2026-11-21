import chunhyang from '../../../data/chunhyang.json' with { type: 'json' }
import heungbu from '../../../data/heungbu.json' with { type: 'json' }

function convertStory(storyId, source, title = source.title) {
  return {
    storyId,
    title,

    episodes: [...source.passages]
      .sort((a, b) => a.order - b.order)
      .map(passage => {
        const episodeId = `${storyId}-${passage.id}`

        const questions = source.questions
          .filter(q => q.passageId === passage.id)
          .map(q => ({
            questionId: `${episodeId}-q${q.id.split('-').at(-1)}`,
            type: q.type,
            question: q.question,
            choices: q.options,
            answer: q.answer,
            explanation: q.explanation,
            difficulty: q.difficulty,
          }))

        const sourceWriting = source.writing.find(
          w => w.passageId === passage.id
        )

        if (questions.length !== 3 || !sourceWriting) {
          throw new Error(`${episodeId}: 문제 데이터가 부족합니다.`)
        }

        const writing = {
          questionId: `${episodeId}-w1`,
          prompt: sourceWriting.prompt,
          criteria: sourceWriting.criteria,
          example: sourceWriting.sampleAnswer,
        }

        const steps = [
          { type: 'story', text: passage.text },
          ...questions.map(q => ({
            type: 'question',
            questionId: q.questionId,
          })),
          { type: 'writing', questionId: writing.questionId },
        ]

        return {
          episodeId,
          title: passage.title,
          questions,
          writing,
          steps,
        }
      }),
  }
}

const raw = {
  stories: [
    convertStory('chunhyang', chunhyang),
    convertStory('heungbu', heungbu, '흥부놀부'),
  ],
}

export default raw