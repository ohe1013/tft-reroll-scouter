import { recognize } from 'tesseract.js'

export async function extractTextLinesFromImage(imageDataUrl: string): Promise<string[]> {
  const { data } = await recognize(imageDataUrl, 'eng', {
    logger: (m) => console.log(m)
  })

  return data.text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}
