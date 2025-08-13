import { ipcMain } from 'electron'
import * as fs from 'node:fs/promises'
import sharp from 'sharp'
import ort from 'onnxruntime-node'

// 간단 큐로 동시성 1 유지 (메인 블로킹 방지용)
let queue = Promise.resolve()

type AnalyzeReq = {
  imagePath?: string // 파일 경로 (권장)
  imageDataUrl?: string // DataURL도 허용
  modelPath: string // onnx 모델 경로
  inputName?: string // 기본 'input'로 가정
  inputShape?: [number, number, number] // [C,H,W], 기본 [3,224,224]
  normalize?: boolean // [0,1] 정규화
  mean?: [number, number, number] // RGB 평균
  std?: [number, number, number] // RGB 표준편차
}

ipcMain.handle('vision:analyze', async (_e, req: AnalyzeReq) => {
  queue = queue.then(() => run(req))
  return queue.catch((e) => {
    throw e
  })
})

async function run(req: AnalyzeReq) {
  const {
    imagePath,
    imageDataUrl,
    modelPath,
    inputName = 'input',
    inputShape = [3, 224, 224],
    normalize = true,
    mean = [0.485, 0.456, 0.406],
    std = [0.229, 0.224, 0.225]
  } = req

  if (!modelPath) throw new Error('modelPath가 필요합니다.')

  // 1) 이미지 로드
  let inputBuffer: Buffer
  if (imagePath) {
    inputBuffer = await fs.readFile(imagePath)
  } else if (imageDataUrl?.startsWith('data:')) {
    const base64 = imageDataUrl.split(',')[1]
    inputBuffer = Buffer.from(base64, 'base64')
  } else {
    throw new Error('이미지 입력이 없습니다.')
  }

  const [C, H, W] = inputShape

  // 2) sharp 전처리: resize → RGB → raw
  const raw = await sharp(inputBuffer)
    .resize(W, H, { fit: 'cover' })
    .removeAlpha()
    .toColourspace('rgb')
    .raw()
    .toBuffer()

  // raw는 [R,G,B, R,G,B, ...] (H*W 픽셀 * 3채널)
  // ORT는 일반적으로 NCHW(float32) 입력 사용 → 변환
  const float = new Float32Array(C * H * W)
  // CHW로 재배열
  const npix = H * W
  for (let i = 0; i < npix; i++) {
    const r = raw[i * 3 + 0] / 255
    const g = raw[i * 3 + 1] / 255
    const b = raw[i * 3 + 2] / 255
    let rr = r,
      gg = g,
      bb = b
    if (normalize) {
      rr = (r - mean[0]) / std[0]
      gg = (g - mean[1]) / std[1]
      bb = (b - mean[2]) / std[2]
    }
    float[0 * npix + i] = rr
    float[1 * npix + i] = gg
    float[2 * npix + i] = bb
  }

  // 3) onnxruntime 세션 로드 & 추론
  //   - 모델은 사용자가 Settings에서 고른 파일 경로를 그대로 사용하거나,
  //     app.getPath('userData')에 복사해 둘 수도 있음.
  const session = await ort.InferenceSession.create(modelPath, {
    executionProviders: ['cuda', 'dml', 'coreml', 'cpu'].filter((p) =>
      (ort as any).getAvailableExecutionProviders?.()?.includes?.(p)
    ) as any
  }).catch(async () => {
    // EP 선택 실패 시 CPU로 폴백
    return await ort.InferenceSession.create(modelPath, { executionProviders: ['cpu'] as any })
  })

  const tensor = new ort.Tensor('float32', float, [1, C, H, W])
  const result = await session.run({ [inputName]: tensor })
  // 보통 첫 출력만 사용
  const firstKey = Object.keys(result)[0]
  const out = result[firstKey]

  // 4) softmax (선택)
  let probs: number[] | null = null
  if (out.type === 'float32' && out.dims.length >= 2) {
    const logits = out.data as Float32Array
    probs = softmax([...logits])
  }

  return {
    ok: true,
    outputName: firstKey,
    outputDims: out.dims,
    top5: probs ? topK(probs, 5) : null
  }
}

function softmax(arr: number[]) {
  const m = Math.max(...arr)
  const exps = arr.map((v) => Math.exp(v - m))
  const s = exps.reduce((a, b) => a + b, 0)
  return exps.map((v) => v / s)
}
function topK(probs: number[], k: number) {
  const idx = probs
    .map((p, i) => [p, i] as const)
    .sort((a, b) => b[0] - a[0])
    .slice(0, k)
  return idx.map(([p, i]) => ({ index: i, prob: p }))
}
