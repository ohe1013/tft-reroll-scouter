// scripts/gen-classes.cjs
/* eslint-disable */
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true }).catch(() => {})
}

// 아주 간단한 슬러그(라벨 도구/YOLO에서 안전하게 쓰려고)
function slugify(s) {
  return s
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '') // 영문/숫자/밑줄 외 제거 (', . 등)
    .trim()
    .replace(/\s+/g, '_') // 공백 -> _
}

// UNITS 배열 텍스트만 정확히 잘라내기 (대괄호 깊이로 매칭)
function extractUnitsArrayText(src) {
  const anchor = src.indexOf('export const UNITS')
  if (anchor === -1) return null
  const startBracket = src.indexOf('[', anchor)
  if (startBracket === -1) return null
  console.log(startBracket)

  let i = startBracket
  let depth = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === '[') depth++
    else if (ch === ']') {
      depth--
      if (depth === 0) {
        // i가 닫는 대괄호 위치
        return src.slice(startBracket, i + 1)
      }
    }
    i++
  }
  return null
}

// UNITS 배열 블록에서 name 값만 정규식으로 추출
function extractNames(unitsArrayText) {
  // name: '...'(작은/큰따옴표/백틱 모두 허용), 줄바꿈/스페이스 허용, trailing comma 허용
  const re = /name\s*:\s*(['"`])([\s\S]*?)\1/g
  const out = []
  let m
  while ((m = re.exec(unitsArrayText)) !== null) {
    const raw = m[2].trim()
    if (raw) out.push(raw)
  }
  return out
}

async function main() {
  const srcPath = path.resolve(process.cwd(), 'src', 'renderer', 'src', 'config', 'tft-config.ts')
  if (!fs.existsSync(srcPath)) {
    console.error('❌ src/renderer/config/tft-config.ts 파일을 찾을 수 없습니다.')
    process.exit(1)
  }

  const txt = await fsp.readFile(srcPath, 'utf-8')
  const unitsArrayText = extractUnitsArrayText(txt)
  if (!unitsArrayText) {
    console.error(
      '❌ UNITS 배열 블록을 찾지 못했습니다. "export const UNITS = [ ... ]" 형식을 확인하세요.'
    )
    process.exit(1)
  }
  console.log(unitsArrayText)
  const names = extractNames(unitsArrayText)
  if (!names.length) {
    console.error('❌ UNITS에서 name 필드를 하나도 찾지 못했습니다. 예: { name: "Ahri", tier: 3 }')
    process.exit(1)
  }

  const outDir = path.resolve(process.cwd(), 'public', 'models')
  await ensureDir(outDir)

  // 1) 사람이 보기에 좋은 원본 이름
  await fsp.writeFile(path.join(outDir, 'classes.txt'), names.join('\n'), 'utf-8')

  // 2) 라벨러/YOLO에서 안전하게 쓰기 좋은 슬러그 (공백/특수문자 제거)
  const slugs = names.map(slugify)
  await fsp.writeFile(path.join(outDir, 'classes_yolo.txt'), slugs.join('\n'), 'utf-8')

  // 3) JSON 매핑 (index ↔ name ↔ slug)
  const mapping = names.map((name, i) => ({ id: i, name, slug: slugs[i] }))
  await fsp.writeFile(path.join(outDir, 'classes.json'), JSON.stringify(mapping, null, 2), 'utf-8')

  console.log(`✅ 생성 완료: (${names.length}개)
 - public/models/classes.txt
 - public/models/classes_yolo.txt
 - public/models/classes.json`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
