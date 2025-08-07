// src/renderer/services/oddsService.ts
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

export function getRemainingCopiesOfUnit(tier: Tier, used: number): number {
  const perUnit = COPIES_PER_UNIT[tier]
  return Math.max(0, perUnit - used)
}

export function getRemainingCopiesInTier(tier: Tier): number {
  const perUnit = COPIES_PER_UNIT[tier]
  const unitCount = UNITS.filter((u) => u.tier === tier).length
  return perUnit * unitCount
}

export function calcShopHitProb(
  level: Level,
  tier: Tier,
  unitRemaining: number,
  tierRemaining: number
): number {
  const rate = LEVEL_TIER_RATES[level]?.[tier] ?? 0
  if (rate <= 0 || tierRemaining <= 0 || unitRemaining <= 0) return 0

  const pPerSlot = unitRemaining / tierRemaining
  const expectedSlots = 5 * rate

  return 1 - Math.pow(1 - pPerSlot, expectedSlots)
}

export function calcRollsHitProb(perShopHit: number, rolls: number): number {
  if (perShopHit <= 0 || rolls <= 0) return 0
  return 1 - Math.pow(1 - perShopHit, rolls)
}

export function calcOddsFromInputs(params: {
  level: Level
  unitName: string
  rolls: number
  targetUsed: number
}): {
  tier: Tier
  unitRemaining: number
  tierRemaining: number
  perShopHit: number
  totalHit: number
} {
  const { level, unitName, rolls, targetUsed } = params
  const tier = getTierByUnitName(unitName)
  if (!tier) throw new Error(`유닛 "${unitName}"의 티어를 찾을 수 없습니다.`)

  const unitRemaining = getRemainingCopiesOfUnit(tier, targetUsed)
  const tierRemaining = getRemainingCopiesInTier(tier)

  const perShopHit = calcShopHitProb(level, tier, unitRemaining, tierRemaining)
  const totalHit = calcRollsHitProb(perShopHit, rolls)

  return {
    tier,
    unitRemaining,
    tierRemaining,
    perShopHit,
    totalHit
  }
}

export function toPct(x: number, digits = 2): string {
  return `${(x * 100).toFixed(digits)}%`
}
