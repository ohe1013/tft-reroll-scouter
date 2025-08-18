import { ipcMain } from 'electron'
import * as fs from 'node:fs/promises'

import * as path from 'node:path'

function toAbs(p: string) {
  return path.isAbsolute(p) ? p : path.resolve(process.cwd(), p)
}

ipcMain.handle('annot:list-images', async (_e, { dir }: { dir: string }) => {
  const absDir = toAbs(dir)
  const entries = await fs.readdir(absDir, { withFileTypes: true })
  const exts = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.webp'])
  return entries
    .filter((d) => d.isFile() && exts.has(path.extname(d.name).toLowerCase()))
    .map((d) => path.join(absDir, d.name))
})

ipcMain.handle('annot:load-classes', async (_e, { path: p }: { path: string }) => {
  const abs = toAbs(p)
  const raw = await fs.readFile(abs, 'utf-8')
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
})

// ✅ 새로 추가: 파일을 Data URL로 반환
ipcMain.handle('annot:read-as-data-url', async (_e, { file }: { file: string }) => {
  const abs = toAbs(file)
  const buf = await fs.readFile(abs)
  const ext = path.extname(abs).toLowerCase()
  const mime =
    ext === '.png'
      ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.bmp'
            ? 'image/bmp'
            : 'application/octet-stream'
  return `data:${mime};base64,${buf.toString('base64')}`
})

ipcMain.handle(
  'annot:save-yolo',
  async (_e, { outPath, content }: { outPath: string; content: string }) => {
    const abs = toAbs(outPath)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, content, 'utf-8')
    return true
  }
)
ipcMain.handle('annot:read-file', async (_e, { file }: { file: string }) => {
  const abs = toAbs(file)
  const buf = await fs.readFile(abs) // Node Buffer
  const ext = path.extname(abs).toLowerCase()
  const mime =
    ext === '.png'
      ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.bmp'
            ? 'image/bmp'
            : 'application/octet-stream'
  // Buffer는 IPC에서 자동으로 ArrayBuffer로 직렬화되어 넘어갑니다.
  return { buffer: buf, mime }
})
