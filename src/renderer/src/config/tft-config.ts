// src/renderer/config/tft-config.ts

export type Tier = 1 | 2 | 3 | 4 | 5
export type Level = 4 | 5 | 6 | 7 | 8 | 9

// 레벨별 상점 슬롯의 티어 분포 (합계 1.0). 세트별 실제 수치로 나중에 교체 가능.
export const LEVEL_TIER_RATES: Record<Level, Record<Tier, number>> = {
  4: { 1: 0.55, 2: 0.3, 3: 0.15, 4: 0.0, 5: 0.0 },
  5: { 1: 0.45, 2: 0.33, 3: 0.2, 4: 0.02, 5: 0.0 },
  6: { 1: 0.3, 2: 0.4, 3: 0.25, 4: 0.05, 5: 0.0 },
  7: { 1: 0.19, 2: 0.35, 3: 0.35, 4: 0.1, 5: 0.01 },
  8: { 1: 0.16, 2: 0.25, 3: 0.4, 4: 0.18, 5: 0.01 },
  9: { 1: 0.09, 2: 0.2, 3: 0.35, 4: 0.3, 5: 0.06 }
}

// 티어별 유닛 1종당 복제 수(풀). 세트별 실제 수치로 교체 가능.
export const COPIES_PER_UNIT: Record<Tier, number> = {
  1: 29,
  2: 22,
  3: 18,
  4: 12,
  5: 10
}

// (옵션) 기본 유닛 종수. UI에서 입력받을 거면 쓰지 않아도 됨.
export const DEFAULT_UNITS_PER_TIER: Partial<Record<Tier, number>> = {
  1: 13,
  2: 13,
  3: 13,
  4: 12,
  5: 10
}
