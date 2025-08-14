import React, { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    annot: {
      listImages(dir: string): Promise<string[]>
      loadClasses(path: string): Promise<string[]>
      saveYolo(outPath: string, content: string): Promise<boolean>
      readAsDataUrl: (file: string) => Promise<string[]> // ✅ 추가
    }
    vision: {
      yoloDetect(params: {
        imagePath: string
        modelPath: string
        classNames: string[]
        conf?: number
        iouThr?: number
        maxDet?: number
      }): Promise<{
        width: number
        height: number
        detections: {
          bbox: [number, number, number, number]
          cls: number
          label: string
          score: number
        }[]
      }>
    }
  }
}

type Box = {
  x1: number
  y1: number
  x2: number
  y2: number
  cls: number
  score?: number
  auto?: boolean
}

export default function AnnotatorPage(): React.JSX.Element {
  const [imgDir, setImgDir] = useState('public/images')
  const [classesPath, setClassesPath] = useState('public/models/classes.txt')
  const [classes, setClasses] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [idx, setIdx] = useState(0)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [active, setActive] = useState<number | null>(null)
  const [canvasW, setCanvasW] = useState(960)
  const [canvasH, setCanvasH] = useState(540)
  const imgRef = useRef<HTMLImageElement>(null)
  const cvsRef = useRef<HTMLCanvasElement>(null)
  const [modelPath, setModelPath] = useState('') // 선택: 자동 제안용 ONNX
  const [imgDataUrl, setImgDataUrl] = useState<string | null>(null)
  const [imgBlobUrl, setImgBlobUrl] = useState<string | null>(null)

  // 이미지 목록/클래스 로드
  const handleLoad = async () => {
    if (!imgDir || !classesPath) return alert('이미지 폴더와 classes.txt 경로를 입력하세요.')
    const [lst, cls] = await Promise.all([
      window.annot.listImages(imgDir),
      window.annot.loadClasses(classesPath)
    ])
    setImages(lst)
    setClasses(cls)
    setIdx(0)
    setBoxes([])
  }

  // 이미지 바뀔 때 박스 초기화
  useEffect(() => {
    setBoxes([])
    setActive(null)
  }, [idx])

  // 캔버스 렌더
  useEffect(() => {
    const imgEl = imgRef.current,
      cvs = cvsRef.current
    if (!imgEl || !cvs) return
    const ctx = cvs.getContext('2d')!
    const w = imgEl.naturalWidth,
      h = imgEl.naturalHeight
    const scale = Math.min(canvasW / w, canvasH / h)
    const rw = Math.round(w * scale),
      rh = Math.round(h * scale)
    cvs.width = rw
    cvs.height = rh
    ctx.clearRect(0, 0, rw, rh)
    ctx.drawImage(imgEl, 0, 0, rw, rh)

    // 박스 그리기
    boxes.forEach((b, i) => {
      const x1 = Math.round(b.x1 * scale),
        y1 = Math.round(b.y1 * scale)
      const x2 = Math.round(b.x2 * scale),
        y2 = Math.round(b.y2 * scale)
      ctx.lineWidth = 2
      ctx.strokeStyle = i === active ? '#3b82f6' : b.auto ? '#10b981' : '#ef4444'
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
      const label = `${i}:${classes[b.cls] ?? b.cls}${b.score ? ` ${(b.score * 100).toFixed(0)}%` : ''}`
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(x1, Math.max(0, y1 - 16), ctx.measureText(label).width + 8, 16)
      ctx.fillStyle = '#fff'
      ctx.font = '12px sans-serif'
      ctx.fillText(label, x1 + 4, Math.max(12, y1 - 4))
    })
  }, [boxes, active, idx, canvasW, canvasH])

  // 마우스 드로잉
  const drawing = useRef<{ startX: number; startY: number }>()
  const onMouseDown = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = imgRef.current!.naturalWidth / e.currentTarget.width
    const x = (e.clientX - rect.left) * scale
    const y = (e.clientY - rect.top) * scale
    drawing.current = { startX: x, startY: y }
    setActive(null)
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drawing.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = imgRef.current!.naturalWidth / e.currentTarget.width
    const x = (e.clientX - rect.left) * scale
    const y = (e.clientY - rect.top) * scale
    const { startX, startY } = drawing.current
    const x1 = Math.min(startX, x),
      y1 = Math.min(startY, y)
    const x2 = Math.max(startX, x),
      y2 = Math.max(startY, y)
    // 미리보기: 마지막 임시 박스를 active로 사용
    setActive(-1)
    setBoxes((prev) => {
      const tmp = prev.slice()
      if (tmp.length && tmp[tmp.length - 1].cls === -1) tmp.pop()
      tmp.push({ x1, y1, x2, y2, cls: -1 })
      return tmp
    })
  }
  const onMouseUp = () => {
    if (!drawing.current) return
    const last = boxes[boxes.length - 1]
    drawing.current = undefined
    if (!last || last.cls !== -1) return
    // 확정: 기본 클래스 0으로 생성(바로 드롭다운/단축키로 수정)
    setBoxes((prev) => prev.slice(0, -1).concat([{ ...last, cls: 0 }]))
    setActive(boxes.length - 1)
  }

  // 키보드 단축키: 숫자키로 클래스 변경, Del로 삭제, WASD로 미세 이동
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (active == null || active < 0) return
      const key = e.key.toLowerCase()
      if (/^\d$/.test(key)) {
        const num = Number(key)
        setBoxes((prev) =>
          prev.map((b, i) => (i === active ? { ...b, cls: num < classes.length ? num : b.cls } : b))
        )
      } else if (key === 'delete' || key === 'backspace') {
        setBoxes((prev) => prev.filter((_, i) => i !== active))
        setActive(null)
      } else if (['w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault()
        const delta = (dir: string) => {
          const d = 2 // px
          setBoxes((prev) =>
            prev.map((b, i) => {
              if (i !== active) return b
              if (dir === 'w') return { ...b, y1: b.y1 - d, y2: b.y2 - d }
              if (dir === 's') return { ...b, y1: b.y1 + d, y2: b.y2 + d }
              if (dir === 'a') return { ...b, x1: b.x1 - d, x2: b.x2 - d }
              return { ...b, x1: b.x1 + d, x2: b.x2 + d }
            })
          )
        }
        delta(key)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [active, classes.length])

  const curImg = images[idx]
  useEffect(() => {
    let cancel = false
    ;(async () => {
      if (!curImg) {
        if (imgBlobUrl) URL.revokeObjectURL(imgBlobUrl)
        setImgBlobUrl(null)
        return
      }

      // 🔁 data: URL 대신, IPC에서 Buffer + mime 받기
      const res = await window.annot.readFile(curImg)
      if (cancel) return

      // res.buffer는 ArrayBuffer로 들어옵니다.
      // 타입 선언이 any면 아래처럼 강제 변환:
      const buf = res.buffer as ArrayBuffer
      const mime = res.mime as string

      const blob = new Blob([buf], { type: mime })
      const url = URL.createObjectURL(blob)

      if (imgBlobUrl) URL.revokeObjectURL(imgBlobUrl)
      setImgBlobUrl(url)
    })()

    return () => {
      cancel = true
    }
  }, [curImg])

  // YOLO 저장 (labels/<sameName>.txt)
  const handleSave = async () => {
    if (!curImg) return
    const imgW = imgRef.current!.naturalWidth
    const imgH = imgRef.current!.naturalHeight
    const lines = boxes
      .filter((b) => b.cls >= 0)
      .map((b) => {
        const x1 = Math.max(0, Math.min(imgW, b.x1))
        const y1 = Math.max(0, Math.min(imgH, b.y1))
        const x2 = Math.max(0, Math.min(imgW, b.x2))
        const y2 = Math.max(0, Math.min(imgH, b.y2))
        const cx = (x1 + x2) / 2 / imgW
        const cy = (y1 + y2) / 2 / imgH
        const w = (x2 - x1) / imgW
        const h = (y2 - y1) / imgH
        return `${b.cls} ${cx.toFixed(6)} ${cy.toFixed(6)} ${w.toFixed(6)} ${h.toFixed(6)}`
      })
      .join('\n')
    // 경로 변환: images/train/foo.jpg -> labels/train/foo.txt
    const outPath = curImg
      .replace(/\\images\\/, '\\labels\\')
      .replace(/\/images\//, '/labels/')
      .replace(/\.(png|jpg|jpeg|bmp|webp)$/i, '.txt')
    await window.annot.saveYolo(outPath, lines)
    alert(`Saved: ${outPath}`)
  }

  // 자동 제안(선택)
  const handleAutofill = async () => {
    if (!curImg || !modelPath || classes.length === 0) return alert('modelPath / classes 먼저 설정')
    const res = await window.vision.yoloDetect({
      imagePath: curImg,
      modelPath,
      classNames: classes,
      conf: 0.25,
      iouThr: 0.45,
      maxDet: 100
    })
    const newBoxes: Box[] = res.detections.map((d) => {
      const [x1, y1, x2, y2] = d.bbox
      return { x1, y1, x2, y2, cls: d.cls, score: d.score, auto: true }
    })
    setBoxes(newBoxes)
    setActive(newBoxes.length ? 0 : null)
  }

  return (
    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 320px' }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="images dir (…/images/train)"
            value={imgDir}
            onChange={(e) => setImgDir(e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            placeholder="classes.txt 경로"
            value={classesPath}
            onChange={(e) => setClassesPath(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={handleLoad}>로드</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx <= 0}>
            이전
          </button>
          <div>
            {idx + 1} / {images.length}
          </div>
          <button
            onClick={() => setIdx((i) => Math.min(images.length - 1, i + 1))}
            disabled={idx >= images.length - 1}
          >
            다음
          </button>
          <button onClick={handleSave} disabled={!images.length}>
            YOLO 저장
          </button>
          <input
            placeholder="(선택) best.onnx 경로"
            value={modelPath}
            onChange={(e) => setModelPath(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={handleAutofill} disabled={!modelPath || !images.length}>
            자동 제안
          </button>
        </div>

        {curImg && imgBlobUrl && (
          <>
            <img
              ref={imgRef}
              src={imgBlobUrl}
              alt=""
              style={{ display: 'none' }}
              onLoad={() => setBoxes((b) => b.slice())}
            />
            <canvas
              ref={cvsRef}
              style={{
                border: '1px solid #ddd',
                width: canvasW,
                height: canvasH,
                cursor: 'crosshair'
              }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
            />
          </>
        )}
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <h3>박스 목록</h3>
        <div
          style={{ maxHeight: 480, overflow: 'auto', border: '1px solid #eee', borderRadius: 8 }}
        >
          {boxes.map((b, i) => (
            <div
              key={i}
              onClick={() => setActive(i)}
              style={{
                padding: 6,
                background: active === i ? '#e5f0ff' : '#fff',
                borderBottom: '1px solid #f3f4f6',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <b>#{i}</b>
                <select
                  value={b.cls}
                  onChange={(e) =>
                    setBoxes((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, cls: Number(e.target.value) } : x))
                    )
                  }
                >
                  {classes.map((c, ci) => (
                    <option key={ci} value={ci}>
                      {ci}: {c}
                    </option>
                  ))}
                </select>
                {b.score != null && (
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    {Math.round((b.score || 0) * 100)}%
                  </span>
                )}
                <button onClick={() => setBoxes((prev) => prev.filter((_, j) => j !== i))}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h4>단축키</h4>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#555' }}>
            <li>숫자키: 클래스 바꾸기 (0~9)</li>
            <li>Delete/Backspace: 선택 박스 삭제</li>
            <li>W/A/S/D: 선택 박스 미세 이동</li>
            <li>캔버스 드래그: 새 박스 만들기</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
