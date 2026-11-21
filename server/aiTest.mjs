import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: '규수라는 단어의 뜻을 한 문장으로 설명해 주세요.'
});

console.log(response.text);