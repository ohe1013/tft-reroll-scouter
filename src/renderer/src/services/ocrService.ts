// src/renderer/services/ocrService.ts
import { recognize } from 'tesseract.js'

export async function extractTextLinesFromImage(imagePath: string): Promise<string[]> {
  const { data } = await recognize(imagePath, 'eng', {
    logger: (m) => console.log(m) // 진행률 보기 (선택)
  })

  const lines = data.text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return lines
}
