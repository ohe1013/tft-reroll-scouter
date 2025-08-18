import {
  UNITS,
  COPIES_PER_UNIT,
  LEVEL_TIER_RATES,
  type Level,
  type Tier
} from '../config/tft-config'

export function getTierByUnitName(unitName: string): Tier | null {
  return UNITS.find((u) => u.name === unitName)?.tier ?? null
}

export function getTotalCopiesInTier(tier: Tier): number {
  const perUnit = COPIES_PER_UNIT[tier]
  const unitCount = UNITS.filter((u) => u.tier === tier).length
  return perUnit * unitCount
}

export function getRemainingCopiesOfUnit(tier: Tier, used: number): number {
  const perUnit = COPIES_PER_UNIT[tier]
  return Math.max(0, perUnit - used)
}

// 동티어 전체 남은 장수 = 전체풀 - (해당티어 소비 총합)
export function getRemainingCopiesInTier(tier: Tier, tierUsedTotal: number): number {
  return Math.max(0, getTotalCopiesInTier(tier) - tierUsedTotal)
}

// --- 새 로직: 슬롯 기준, 비복원(구매 시 U/T 감소) 동적 DP ---

// 한 상점(5칸)에서 k장을 뽑을 확률 PMF (슬롯 독립 근사)
//  - 현재 남은 장수 U, 티어 남은 전체 T, 레벨별 티어확률 rate 사용
//  - k는 0..min(5, U) (남은 장수보다 많이 못 뽑음)
function shopHitPMF(U: number, T: number, rate: number): number[] {
  if (U <= 0 || T <= 0 || rate <= 0) return [1] // 무조건 0장
  const pSlot = rate * (U / T)
  const n = 5
  const kmax = Math.min(n, U)
  // 이항분포 PMF
  const pmf: number[] = []
  for (let k = 0; k <= kmax; k++) {
    pmf.push(binomPMF(n, k, pSlot))
  }
  // 잘려나간 꼬리(원래는 k>U도 확률 존재)를 정규화
  const s = pmf.reduce((a, b) => a + b, 0)
  if (s > 0 && s !== 1) {
    for (let i = 0; i < pmf.length; i++) pmf[i] /= s
  }
  return pmf
}

function binomPMF(n: number, k: number, p: number): number {
  if (p <= 0) return k === 0 ? 1 : 0
  if (p >= 1) return k === n ? 1 : 0
  if (k < 0 || k > n) return 0
  // log-조합으로 안정화
  let logC = 0
  for (let i = 1; i <= k; i++) {
    logC += Math.log(n - (k - i)) - Math.log(i)
  }
  return Math.exp(logC + k * Math.log(p) + (n - k) * Math.log(1 - p))
}

export function calcOddsFromInputs(params: {
  level: Level
  unitName: string
  rolls: number
  targetUsed: number // 타깃 소비 수(내+적)
  tierUsedTotal?: number // 동티어 소비 총합(타깃 포함 입력 가정)
  desiredCount?: number // 최소 몇 장 뽑고 싶은지
  excludeTargetFromTierTotal?: boolean // 동티어 총합에서 타깃 제외 여부
}): {
  tier: Tier
  unitRemaining: number // 초기 U
  tierRemaining: number // 초기 T(보정 반영)
  pSlotHit: number // 초기 슬롯 히트확률
  pShopHit: number // 초기 상점 히트확률(≥1장)
  perShopHit: number // same as pShopHit
  totalHit: number // (구식) 최소 1장(참고값)
  desiredCount: number
  pAtLeastK: number // 동적 DP 결과: 전체 롤 동안 ≥K장
  pExactlyK: number // 동적 DP 결과: 전체 롤 동안 =K장
} {
  const {
    level,
    unitName,
    rolls,
    targetUsed,
    tierUsedTotal = 0,
    desiredCount = 1,
    excludeTargetFromTierTotal = false
  } = params

  const tier = getTierByUnitName(unitName)
  if (!tier) throw new Error(`유닛 "${unitName}"의 티어를 찾을 수 없습니다.`)

  const U0 = getRemainingCopiesOfUnit(tier, targetUsed)
  const effectiveTierUsed = Math.max(
    0,
    tierUsedTotal - (excludeTargetFromTierTotal ? targetUsed : 0)
  )
  const T0 = getRemainingCopiesInTier(tier, effectiveTierUsed)
  const rate = LEVEL_TIER_RATES[level]?.[tier] ?? 0

  // 참고용 초기값(첫 상점 기준)
  const pSlot = T0 > 0 ? rate * (U0 / T0) : 0
  const pShop = 1 - Math.pow(1 - pSlot, 5)

  // --- 동적 DP: 매 상점에서 k장을 뽑으면 다음 상점의 U/T가 (U-k)/(T-k)로 감소 ---
  // 상태 = 남은 장수 U; dp[r][u] = r번째 상점(0..rolls) 후, 남은 장수가 u일 확률
  const maxU = U0
  let cur = new Array<number>(maxU + 1).fill(0)
  cur[U0] = 1 // 시작: U0 장 남음, 확률 1

  for (let r = 0; r < rolls; r++) {
    const next = new Array<number>(maxU + 1).fill(0)
    for (let u = 0; u <= maxU; u++) {
      const probState = cur[u]
      if (probState === 0) continue
      const t = Math.max(0, T0 - (U0 - u)) // 지금까지 구매한 수 = U0-u ; T도 그만큼 감소
      if (u === 0 || t === 0 || rate === 0) {
        next[u] += probState // 더는 못 뽑음
        continue
      }
      const pmf = shopHitPMF(u, t, rate) // 이번 상점에서 k장 뽑을 확률
      for (let k = 0; k < pmf.length; k++) {
        const u2 = u - k
        next[u2] += probState * pmf[k]
      }
    }
    cur = next
  }

  // 전체에서 산 개수 분포로 변환
  // bought = U0 - u
  const boughtDist: number[] = new Array(U0 + 1).fill(0)
  for (let u = 0; u <= U0; u++) {
    const bought = U0 - u
    boughtDist[bought] += cur[u]
  }

  // P(=K), P(≥K)
  const K = Math.min(desiredCount, U0)
  const pExactlyK = boughtDist[K] ?? 0
  let pAtLeastK = 0
  for (let b = K; b <= U0; b++) pAtLeastK += boughtDist[b]
  pAtLeastK = Math.min(1, Math.max(0, pAtLeastK))

  // (구식) 최소 1장 근사값(그대로 유지해 표시는 가능)
  const perShopHit = pShop
  const totalHit = 1 - Math.pow(1 - perShopHit, rolls)

  return {
    tier,
    unitRemaining: U0,
    tierRemaining: T0,
    pSlotHit: pSlot,
    pShopHit: pShop,
    perShopHit,
    totalHit,
    desiredCount: desiredCount,
    pAtLeastK,
    pExactlyK
  }
}

export function toPct(x: number, digits = 2): string {
  return `${(x * 100).toFixed(digits)}%`
}
