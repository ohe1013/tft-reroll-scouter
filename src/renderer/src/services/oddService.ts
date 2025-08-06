// src/renderer/services/oddsService.ts

import { COPIES_PER_UNIT, LEVEL_TIER_RATES, Level, Tier } from '../config/tft-config'

/**
 * 타깃 유닛 남은 복제 수 = (티어 복제 수) - (타깃이 이미 쓰인 복제 수)
 */
export function getRemainingCopiesOfUnit(tier: Tier, targetContested: number): number {
  const perUnit = COPIES_PER_UNIT[tier] ?? 0
  return Math.max(perUnit - Math.max(0, targetContested), 0)
}

/**
 * 해당 티어 남은 총 복제 수(근사).
 * - unitsInTier: 해당 티어 전체 유닛 종수
 * - totalContestedInTier: (옵션) 티어 전체에서 이미 소모된 복제 수 합 (모르면 0)
 *   👉 MVP에선 보수적으로 '타깃만 소모' 가정도 가능: totalContestedInTier = targetContested
 */
export function getRemainingCopiesInTier(
  tier: Tier,
  unitsInTier: number,
  totalContestedInTier = 0
): number {
  const perUnit = COPIES_PER_UNIT[tier] ?? 0
  const total = perUnit * Math.max(0, unitsInTier)
  return Math.max(total - Math.max(0, totalContestedInTier), 0)
}

/**
 * 한 번 상점(5칸)에서 타깃 유닛을 '적어도 1번' 볼 확률(근사)
 * - 기대 티어 슬롯 수 = 5 * LEVEL_TIER_RATES[level][tier]
 * - 각 티어 슬롯에서 타깃이 나올 확률 = unitRemaining / tierRemaining
 */
export function calcShopHitProb(
  level: Level,
  tier: Tier,
  unitRemaining: number,
  tierRemaining: number
): number {
  if (tierRemaining <= 0 || unitRemaining <= 0) return 0
  const rate = LEVEL_TIER_RATES[level]?.[tier] ?? 0
  if (rate <= 0) return 0

  const pPerSlot = unitRemaining / tierRemaining
  const expectedSlots = 5 * rate

  // 근사: 1 - (1 - p)^k
  return 1 - Math.pow(1 - pPerSlot, expectedSlots)
}

/**
 * 여러 번 롤했을 때(상점 n회) 적어도 1번은 타깃을 볼 확률
 * - 1 - (1 - perShopHit)^rolls
 */
export function calcRollsHitProb(perShopHit: number, rolls: number): number {
  if (perShopHit <= 0 || rolls <= 0) return 0
  return 1 - Math.pow(1 - perShopHit, rolls)
}

/**
 * 편의용: UI 입력값만으로 최종 확률 계산
 * - unitsInTier: 해당 티어의 유닛 종수 (UI에서 입력받음)
 * - targetContested: 타깃 유닛이 이미 쓰인 복제 수
 * - (선택) tierContestedTotal: 티어 전체에서 이미 소모된 복제 수 합
 *    → 모르면 타깃만 반영(= targetContested)으로 호출해도 됨.
 */
export function calcOddsFromInputs(params: {
  level: Level
  tier: Tier
  unitsInTier: number
  rolls: number
  targetContested: number
  tierContestedTotal?: number
}): {
  unitRemaining: number
  tierRemaining: number
  perShopHit: number
  totalHit: number
} {
  const {
    level,
    tier,
    unitsInTier,
    rolls,
    targetContested,
    tierContestedTotal = targetContested // 기본값: 타깃만 소모 가정
  } = params

  const unitRemaining = getRemainingCopiesOfUnit(tier, targetContested)
  const tierRemaining = getRemainingCopiesInTier(tier, unitsInTier, tierContestedTotal)
  const perShopHit = calcShopHitProb(level, tier, unitRemaining, tierRemaining)
  const totalHit = calcRollsHitProb(perShopHit, rolls)

  return { unitRemaining, tierRemaining, perShopHit, totalHit }
}

/** 출력 포맷 유틸 */
export function toPct(x: number, digits = 2): string {
  return `${(x * 100).toFixed(digits)}%`
}
