import { ReactNode, useMemo, useState } from 'react'
import { UNITS, type Level } from '../config/tft-config'
import { calcOddsFromInputs, toPct } from '@renderer/services/oddService'

export default function MainPage(): ReactNode {
  const [level, setLevel] = useState<Level>(7)
  const [unitName, setUnitName] = useState<string>(UNITS[0].name)
  const [usedCount, setUsedCount] = useState<number>(5)
  const [rolls, setRolls] = useState<number>(10)
  const [ocrLoading, setOcrLoading] = useState(false)

  const result = useMemo(() => {
    try {
      return calcOddsFromInputs({ level, unitName, rolls, targetUsed: usedCount })
    } catch {
      return null
    }
  }, [level, unitName, usedCount, rolls])
  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.onerror = rej
      r.readAsDataURL(file)
    })
  }
  async function handleOCRFromFile(file: File): Promise<void> {
    setOcrLoading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      const text = await window.ocr.recognizeDataUrl(dataUrl) // ✅ IPC 호출
      const lines = text
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)

      const found = UNITS.find(
        (u) => lines.some((line) => line.includes(u.name)) // 부분일치로 유연하게
      )
      if (found) {
        setUnitName(found.name)
        setUsedCount((prev) => prev + 1) // 예시 로직
      } else {
        alert('OCR로 기물을 찾지 못했습니다.')
        console.log('OCR 라인:', lines)
      }
    } catch (e) {
      console.error(e)
      alert('OCR 실패')
    } finally {
      setOcrLoading(false)
    }
  }

  return (
    <div style={{ padding: 20, display: 'grid', gap: 20 }}>
      <h1>TFT Scout - 확률 계산기</h1>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            handleOCRFromFile(file)
          }
        }}
        style={{ marginBottom: '10px' }}
      />
      <section style={{ display: 'grid', gap: 12, maxWidth: 500 }}>
        <label>
          내 레벨:
          <input
            type="number"
            value={level}
            onChange={(e) => setLevel(Number(e.target.value) as Level)}
            min={4}
            max={9}
            style={{ marginLeft: 8 }}
          />
        </label>

        <label>
          타깃 기물:
          <select
            value={unitName}
            onChange={(e) => setUnitName(e.target.value)}
            style={{ marginLeft: 8, padding: '4px 8px' }}
          >
            {UNITS.map((unit) => (
              <option key={unit.name} value={unit.name}>
                {unit.name} (티어 {unit.tier})
              </option>
            ))}
          </select>
        </label>

        <label>
          사용 중인 기물 수 (내 보드 + 적들):
          <input
            type="number"
            value={usedCount}
            onChange={(e) => setUsedCount(Number(e.target.value))}
            min={0}
            max={30}
            style={{ marginLeft: 8 }}
          />
        </label>

        <label>
          롤 횟수:
          <input
            type="number"
            value={rolls}
            onChange={(e) => setRolls(Number(e.target.value))}
            min={1}
            max={50}
            style={{ marginLeft: 8 }}
          />
        </label>
      </section>

      {result ? (
        <section
          style={{
            display: 'grid',
            gap: 6,
            maxWidth: 500,
            padding: '12px 16px',
            border: '1px solid #ccc',
            borderRadius: 8
          }}
        >
          <h3 style={{ margin: 0 }}>결과</h3>
          <div>
            남은 기물 수: <b>{result.unitRemaining}</b>
          </div>
          <div>
            해당 티어 남은 전체 기물 수: <b>{result.tierRemaining}</b>
          </div>
          <div>
            한 번 상점(5칸)에서 나올 확률: <b>{toPct(result.perShopHit)}</b>
          </div>
          <div>
            {rolls}번 롤 동안 적어도 1번 나올 확률: <b>{toPct(result.totalHit)}</b>
          </div>
        </section>
      ) : (
        <p style={{ color: 'red' }}>⚠️ 해당 유닛의 티어를 찾을 수 없습니다.</p>
      )}
    </div>
  )
}
