// Set 15 (K.O. Coliseum) TFT configuration

export type Tier = 1 | 2 | 3 | 4 | 5
export type Level = 4 | 5 | 6 | 7 | 8 | 9 | 10

export interface UnitInfo {
  name: string
  tier: Tier
}

export const UNITS: UnitInfo[] = [
  { name: 'Aatrox', tier: 1 },
  { name: 'Ezreal', tier: 1 },
  { name: 'Garen', tier: 1 },
  { name: 'Gnar', tier: 1 },
  { name: 'Kalista', tier: 1 },
  { name: 'Kayle', tier: 1 },
  { name: 'Kennen', tier: 1 },
  { name: 'Lucian', tier: 1 },
  { name: 'Malphite', tier: 1 },
  { name: 'Naafiri', tier: 1 },
  { name: 'Rell', tier: 1 },
  { name: 'Sivir', tier: 1 },
  { name: 'Syndra', tier: 1 },
  { name: 'Zac', tier: 1 },

  { name: 'Dr. Mundo', tier: 2 },
  { name: 'Gangplank', tier: 2 },
  { name: 'Janna', tier: 2 },
  { name: 'Jhin', tier: 2 },
  { name: "Kai'Sa", tier: 2 },
  { name: 'Katarina', tier: 2 },
  { name: 'Kobuko', tier: 2 },
  { name: 'Lux', tier: 2 },
  { name: 'Rakan', tier: 2 },
  { name: 'Shen', tier: 2 },
  { name: 'Vi', tier: 2 },
  { name: 'Xayah', tier: 2 },
  { name: 'Xin Zhao', tier: 2 },

  { name: 'Ahri', tier: 3 },
  { name: 'Caitlyn', tier: 3 },
  { name: 'Darius', tier: 3 },
  { name: 'Jayce', tier: 3 },
  { name: "Kog'Maw", tier: 3 },
  { name: 'Malzahar', tier: 3 },
  { name: 'Neeko', tier: 3 },
  { name: 'Senna', tier: 3 },
  { name: 'Swain', tier: 3 },
  { name: 'Udyr', tier: 3 },
  { name: 'Viego', tier: 3 },
  { name: 'Yasuo', tier: 3 },
  { name: 'Ziggs', tier: 3 },

  { name: 'Akali', tier: 4 },
  { name: 'Ashe', tier: 4 },
  { name: 'Jarvan IV', tier: 4 },
  { name: 'Jinx', tier: 4 },
  { name: "K'Sante", tier: 4 },
  { name: 'Karma', tier: 4 },
  { name: 'Leona', tier: 4 },
  { name: 'Poppy', tier: 4 },
  { name: 'Ryze', tier: 4 },
  { name: 'Samira', tier: 4 },
  { name: 'Sett', tier: 4 },
  { name: 'Volibear', tier: 4 },
  { name: 'Yuumi', tier: 4 },

  { name: 'Braum', tier: 5 },
  { name: 'Ekko', tier: 5 },
  { name: 'Gwen', tier: 5 },
  { name: 'Lee Sin', tier: 5 },
  { name: 'Seraphine', tier: 5 },
  { name: 'Twisted Fate', tier: 5 },
  { name: 'Varus', tier: 5 },
  { name: 'Yone', tier: 5 },
  { name: 'Zyra', tier: 5 }
]

// 세트별 평균 수치 — 필요 시 나중에 조정 가능
export const COPIES_PER_UNIT: Record<Tier, number> = {
  1: 29,
  2: 22,
  3: 18,
  4: 12,
  5: 10
}

export const LEVEL_TIER_RATES: Record<Level, Record<Tier, number>> = {
  4: { 1: 0.55, 2: 0.3, 3: 0.15, 4: 0, 5: 0 },
  5: { 1: 0.45, 2: 0.33, 3: 0.2, 4: 0.02, 5: 0 },
  6: { 1: 0.3, 2: 0.4, 3: 0.25, 4: 0.05, 5: 0 },
  7: { 1: 0.19, 2: 0.3, 3: 0.4, 4: 0.1, 5: 0.01 },
  8: { 1: 0.17, 2: 0.24, 3: 0.32, 4: 0.24, 5: 0.03 },
  9: { 1: 0.15, 2: 0.18, 3: 0.25, 4: 0.3, 5: 0.12 },
  10: { 1: 0.05, 2: 0.1, 3: 0.2, 4: 0.4, 5: 0.25 }
}
