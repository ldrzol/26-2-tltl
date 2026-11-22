/**
 * 이야기별 그림 (Figma) — 이야기 선택 카드의 캐릭터 · 이야기 진행 화면 배경
 * 캐릭터는 한 장짜리 그림(story-sheet.png)에서 잘라 쓴다: crop = 상자 대비 그림 위치·크기(%)
 * 배경이 없으면(bg: null) 연보라 배경으로 보여준다.
 */
import sheet from '../assets/figma/story-sheet.png'
import bgChunhyang from '../assets/figma/bg-chunhyang.png'

export const STORY_SHEET = sheet

export const STORY_ART = {
  chunhyang: {
    box: { width: 103, height: 113 },
    crop: { left: -11.63, top: -25.62, width: 310.4, height: 284.35 },
    bg: bgChunhyang,
  },
  heungbu: {
    box: { width: 105, height: 122 },
    crop: { left: -115.67, top: -25.84, width: 327.42, height: 281.8 },
    bg: null, // TODO: 흥부놀부 배경 이미지 받으면 연결
  },
  simcheong: {
    box: { width: 124, height: 131 },
    crop: { left: -188.94, top: -25.71, width: 288.94, height: 273.2 },
    bg: null, // TODO: 심청전 콘텐츠·배경 이미지 받으면 연결
  },
}

export function storyArt(storyId) {
  return STORY_ART[storyId] ?? { box: null, crop: null, bg: null }
}
