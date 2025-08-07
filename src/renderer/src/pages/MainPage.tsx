// src/renderer/pages/MainPage.tsx
import { ReactNode, useMemo, useState } from 'react'
import { UNITS, type Level } from '../config/tft-config'
import { calcOddsFromInputs, toPct } from '@renderer/services/oddService'
import { extractTextLinesFromImage } from '@renderer/services/ocrService'

function MainPage(): ReactNode {
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

  async function handleOCRFromFile(file: File): Promise<void> {
    setOcrLoading(true)
    try {
      // 1. 파일 → base64 Data URL 변환
      const reader = new FileReader()
      reader.readAsDataURL(file)

      reader.onload = async () => {
        const dataUrl = reader.result as string
        console.log(dataUrl)
        const lines = await extractTextLinesFromImage(dataUrl)

        const found = UNITS.find((u) => lines.includes(u.name))
        if (found) {
          setUsedCount((prev) => prev + 1)
          setUnitName(found.name)
        } else {
          alert('OCR로 유닛을 찾지 못했습니다.')
          console.log('OCR 결과:', lines)
        }

        setOcrLoading(false)
      }

      reader.onerror = () => {
        alert('이미지 읽기 실패')
        setOcrLoading(false)
      }
    } catch (err) {
      console.error(err)
      alert('OCR 분석 중 오류 발생')
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

export default MainPage
