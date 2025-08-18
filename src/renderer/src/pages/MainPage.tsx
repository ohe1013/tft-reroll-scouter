import { ReactNode, useMemo, useState } from 'react'
import { UNITS, type Level } from '../config/tft-config'
import { calcOddsFromInputs, CountMode, toPct } from '@renderer/services/oddService'
declare global {
  interface Window {
    tft: {
      detect: (imageBuffer: ArrayBuffer) => Promise<Detection[]>
    }
  }
}
type Detection = { x1: number; y1: number; x2: number; y2: number; score: number; cls: number }

// 원본 이미지 크기 얻기
function getImageSizeFromDataUrl(dataUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = rej
    img.src = dataUrl
  })
}

// ROI(영역) 정의: 16:9 기준 예시 (필요시 조정)
// - 값은 정규화 좌표(0~1): [left, top, right, bottom]
const FIELD_ROI: [number, number, number, number] = [0.1, 0.35, 0.9, 0.78] // 보드 영역 대략
const BENCH_ROI: [number, number, number, number] = [0.1, 0.8, 0.9, 0.95] // 벤치(대기열) 영역 대략

function isInROI(cx: number, cy: number, roi: [number, number, number, number]) {
  const [l, t, r, b] = roi
  return cx >= l && cx <= r && cy >= t && cy <= b
}
export default function MainPage(): ReactNode {
  const [level, setLevel] = useState<Level>(7)
  const [unitName, setUnitName] = useState<string>(UNITS[0].name)
  const [usedCount, setUsedCount] = useState<number>(5)
  const [tierUsedTotal, setTierUsedTotal] = useState<number>(0) // ✅ 동티어 전체 소비량(타깃 포함)
  const [excludeTargetFromTierTotal, setExcludeTargetFromTierTotal] = useState<boolean>(false)

  const [rolls, setRolls] = useState<number>(10)
  const [desiredCount, setDesiredCount] = useState<number>(2)
  const [ocrLoading, setOcrLoading] = useState(false)

  const result = useMemo(() => {
    try {
      return calcOddsFromInputs({
        level,
        unitName,
        rolls,
        targetUsed: usedCount,
        tierUsedTotal,
        desiredCount,
        excludeTargetFromTierTotal
      })
    } catch {
      return null
    }
  }, [level, unitName, usedCount, tierUsedTotal, desiredCount, excludeTargetFromTierTotal, rolls])

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
      // 1) 파일 → ArrayBuffer & dataURL
      const arrBuf = await file.arrayBuffer()
      const dataUrl = await fileToDataUrl(file)
      const { w, h } = await getImageSizeFromDataUrl(dataUrl)

      // 2) YOLO 감지
      const dets = await window.tft.detect(arrBuf) // Detection[]

      // 3) 중심점(정규화) 계산
      // - 감지 좌표가 이미 0~1 정규화라면 isNormalized=true로 간주
      // - 아니라면 원본 폭/높이로 나눠 정규화
      const looksNormalized =
        dets.length > 0 &&
        dets.every(
          (d) => d.x1 >= 0 && d.x2 <= 1 && d.y1 >= 0 && d.y2 <= 1 && d.x1 <= d.x2 && d.y1 <= d.y2
        )

      const centers = dets.map((d) => {
        const cx_px = (d.x1 + d.x2) / 2
        const cy_px = (d.y1 + d.y2) / 2
        return looksNormalized ? { cx: cx_px, cy: cy_px } : { cx: cx_px / w, cy: cy_px / h } // 픽셀→정규화
      })

      // 4) 영역별 카운트
      let fieldCount = 0
      let benchCount = 0
      centers.forEach(({ cx, cy }) => {
        if (isInROI(cx, cy, FIELD_ROI)) fieldCount++
        else if (isInROI(cx, cy, BENCH_ROI)) benchCount++
      })

      // 5) 상태 반영: 여기서는 usedCount를 (필드+벤치)로 갱신
      setUsedCount(fieldCount + benchCount)

      // (선택) 보드/벤치 상세를 따로 보여주고 싶으면 state를 더 두 개 만들면 됨:
      // setFieldCount(fieldCount); setBenchCount(benchCount);

      // (선택) 레벨이나 롤 횟수를 이미지에서 읽을 계획이면,
      // - 별도 ROI를 추가하고 숫자 UI만 YOLO(숫자 클래스로 학습) 또는 Tesseract로 병행.

      console.log(
        `[YOLO] field=${fieldCount}, bench=${benchCount}, total=${fieldCount + benchCount}`
      )
    } catch (e) {
      console.error(e)
      alert('감지 중 오류가 발생했습니다.')
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
      <section style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
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

        <label title="내 보드 + 적들의 타깃 유닛 소비량">
          타깃 소비 수:
          <input
            type="number"
            value={usedCount}
            onChange={(e) => setUsedCount(Number(e.target.value))}
            min={0}
            max={30}
            style={{ marginLeft: 8 }}
          />
        </label>

        <label title="같은 티어의 모든 유닛에서 소비된 총합(타깃 포함)">
          동티어 전체 소비 수:
          <input
            type="number"
            value={tierUsedTotal}
            onChange={(e) => setTierUsedTotal(Number(e.target.value))}
            min={0}
            style={{ marginLeft: 8 }}
          />
        </label>

        {/* ✅ 타깃 포함/제외 토글 */}
        <label title="동티어 총 소비 계산에서 타깃 소비량을 제외합니다 (혼동 방지용)">
          <input
            type="checkbox"
            checked={excludeTargetFromTierTotal}
            onChange={(e) => setExcludeTargetFromTierTotal(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          동티어 총 소비에서 타깃 제외
        </label>

        <hr />

        {/* ➕ 새 기능: 몇 장 이상 뽑고 싶은지 */}
        <label title="전체 롤 동안 최소 몇 장을 뽑을지 확률 계산">
          최소 뽑고 싶은 개수:
          <input
            type="number"
            value={desiredCount}
            onChange={(e) => setDesiredCount(Math.max(0, Number(e.target.value)))}
            min={0}
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
            gap: 8,
            maxWidth: 560,
            padding: '12px 16px',
            border: '1px solid #ccc',
            borderRadius: 8
          }}
        >
          <h3 style={{ margin: 0 }}>결과</h3>

          <div>
            남은 기물 수(타깃): <b>{result.unitRemaining}</b>
          </div>
          <div>
            동티어 남은 전체 기물 수: <b>{result.tierRemaining}</b>
          </div>

          <div>
            슬롯 1칸 히트 확률(초기): <b>{toPct(result.pSlotHit)}</b>
          </div>
          <div>
            상점(5칸) 히트 확률(초기): <b>{toPct(result.pShopHit)}</b>
          </div>

          <div>
            한 번 상점에서 최소 1장(초기 근사): <b>{toPct(result.perShopHit)}</b>
          </div>
          <div>
            {rolls}번 롤 동안 최소 1장(근사): <b>{toPct(result.totalHit)}</b>
          </div>

          <hr />

          <div>
            전체 롤 동안 <b>최소 {result.desiredCount}장</b> 뽑을 확률(비복원 DP):{' '}
            <b>{toPct(result.pAtLeastK)}</b>
          </div>
          <div>
            전체 롤 동안 <b>정확히 {result.desiredCount}장</b> 뽑을 확률(비복원 DP):{' '}
            <b>{toPct(result.pExactlyK)}</b>
          </div>
        </section>
      ) : (
        <p style={{ color: 'red' }}>⚠️ 해당 유닛의 티어를 찾을 수 없습니다.</p>
      )}
    </div>
  )
}
