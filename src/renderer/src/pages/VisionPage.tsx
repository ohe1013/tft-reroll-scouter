import { useState } from 'react'
declare global {
  interface Window {
    vision: {
      analyze: (params: any) => Promise<{
        ok: boolean
        outputName: string
        outputDims: number[]
        top5: { index: number; prob: number }[] | null
      }>
    }
  }
}
export default function VisionPage(): React.JSX.Element {
  const [modelPath, setModelPath] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const [inputName, setInputName] = useState('input')
  const [shapeC, setC] = useState(3)
  const [shapeH, setH] = useState(224)
  const [shapeW, setW] = useState(224)
  const [normalize, setNormalize] = useState(true)

  async function fileToDataUrl(file: File): Promise<string> {
    return await new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.onerror = rej
      r.readAsDataURL(file)
    })
  }

  const handleRun = async () => {
    if (!modelPath) return alert('모델 경로를 입력하세요 (.onnx)')
    if (!imageFile) return alert('이미지 파일을 선택하세요.')
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const dataUrl = await fileToDataUrl(imageFile)
      const out = await window.vision.analyze({
        imageDataUrl: dataUrl, // 또는 imagePath 사용
        modelPath,
        inputName,
        inputShape: [shapeC, shapeH, shapeW],
        normalize
      })
      setResult(out)
    } catch (e: any) {
      setError(e?.message ?? '분석 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 800 }}>
      <h2>이미지 분석 (sharp + onnxruntime-node)</h2>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
        <label>
          모델 경로(.onnx)
          <input
            value={modelPath}
            onChange={(e) => setModelPath(e.target.value)}
            placeholder="C:\path\model.onnx"
          />
        </label>
        <label>
          입력 텐서명
          <input value={inputName} onChange={(e) => setInputName(e.target.value)} />
        </label>
        <label>
          C
          <input
            type="number"
            value={shapeC}
            onChange={(e) => setC(Number(e.target.value))}
            min={1}
            max={4}
          />
        </label>
        <label>
          H
          <input
            type="number"
            value={shapeH}
            onChange={(e) => setH(Number(e.target.value))}
            min={32}
            max={2048}
          />
        </label>
        <label>
          W
          <input
            type="number"
            value={shapeW}
            onChange={(e) => setW(Number(e.target.value))}
            min={32}
            max={2048}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={normalize}
            onChange={(e) => setNormalize(e.target.checked)}
          />
          Normalize (ImageNet mean/std)
        </label>
      </div>

      <label>
        이미지 파일
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <button onClick={handleRun} disabled={loading} style={{ width: 160, padding: '8px 12px' }}>
        {loading ? '분석 중…' : '분석 실행'}
      </button>

      {error && <div style={{ color: '#dc2626' }}>에러: {error}</div>}

      {result && (
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
          <div>
            Output: <b>{result.outputName}</b> / Dims: {result.outputDims?.join(' x ')}
          </div>
          {result.top5 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 600 }}>Top-5 (index, prob)</div>
              <ul>
                {result.top5.map((x: any) => (
                  <li key={x.index}>
                    #{x.index}: {(x.prob * 100).toFixed(2)}%
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
