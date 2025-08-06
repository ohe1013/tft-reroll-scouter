// src/renderer/pages/MainPage.tsx
import { ReactElement, useMemo, useState } from 'react'
import type { Level, Tier } from '../config/tft-config'
import { calcOddsFromInputs, toPct } from '@renderer/services/oddService'

function NumInput(props: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
}): ReactElement {
  const { label, value, min, max, step = 1, onChange } = props
  return (
    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <span style={{ width: 180 }}>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: 120, padding: '6px 8px' }}
      />
    </label>
  )
}

export default function MainPage(): ReactElement {
  // 기본값은 예시
  const [level, setLevel] = useState<Level>(7)
  const [tier, setTier] = useState<Tier>(3)
  const [unitsInTier, setUnitsInTier] = useState<number>(13)
  const [targetContested, setTargetContested] = useState<number>(6)
  const [tierContestedTotal, setTierContestedTotal] = useState<number | ''>('') // 옵션
  const [rolls, setRolls] = useState<number>(10)

  const result = useMemo(() => {
    return calcOddsFromInputs({
      level,
      tier,
      unitsInTier,
      rolls,
      targetContested,
      tierContestedTotal:
        tierContestedTotal === '' ? undefined : Math.max(0, Number(tierContestedTotal))
    })
  }, [level, tier, unitsInTier, rolls, targetContested, tierContestedTotal])

  return (
    <div style={{ padding: 20, display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>TFT Scout — 확률 계산기 (MVP)</h1>

      <div
        style={{
          display: 'grid',
          gap: 12,
          padding: 16,
          border: '1px solid #ddd',
          borderRadius: 8,
          maxWidth: 520
        }}
      >
        <NumInput
          label="내 레벨 (4~9)"
          value={level}
          min={4}
          max={9}
          onChange={(v) => setLevel(v as Level)}
        />
        <NumInput
          label="타깃 유닛 티어 (1~5)"
          value={tier}
          min={1}
          max={5}
          onChange={(v) => setTier(v as Tier)}
        />
        <NumInput
          label="해당 티어 유닛 종수"
          value={unitsInTier}
          min={1}
          onChange={setUnitsInTier}
        />
        <NumInput
          label="타깃 유닛이 이미 쓰인 복제 수"
          value={targetContested}
          min={0}
          onChange={setTargetContested}
        />
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 180 }}>티어 전체 소모 복제 수 (옵션)</span>
          <input
            type="number"
            value={tierContestedTotal}
            min={0}
            onChange={(e) => {
              const v = e.target.value
              setTierContestedTotal(v === '' ? '' : Number(v))
            }}
            placeholder="미입력 시 타깃만 소모 가정"
            style={{ width: 180, padding: '6px 8px' }}
          />
        </label>
        <NumInput label="롤 횟수" value={rolls} min={1} onChange={setRolls} />
      </div>

      <div
        style={{
          display: 'grid',
          gap: 6,
          padding: 16,
          border: '1px solid #ddd',
          borderRadius: 8,
          maxWidth: 520
        }}
      >
        <h3 style={{ margin: '0 0 8px' }}>결과</h3>
        <div>
          타깃 유닛 남은 복제 수: <b>{result.unitRemaining}</b>
        </div>
        <div>
          해당 티어 남은 총 복제 수(근사): <b>{result.tierRemaining}</b>
        </div>
        <div>
          상점 1회(5칸)에서 나올 확률(근사): <b>{toPct(result.perShopHit)}</b>
        </div>
        <div>
          {rolls}번 롤 동안 적어도 1번 볼 확률: <b>{toPct(result.totalHit)}</b>
        </div>
      </div>

      <p style={{ color: '#666', maxWidth: 640 }}>
        * 주의: 현재는 기대 슬롯 기반 근사치이며, 세트별 실제 수치와 경쟁 구도(다른 유닛 소모) 반영
        정도에 따라 변동될 수 있어.
      </p>
    </div>
  )
}

