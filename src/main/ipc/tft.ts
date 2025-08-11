import { ipcMain } from 'electron'
import * as keytar from 'keytar'

const SERVICE_NAME = 'tft-scout'
const ACCOUNT_NAME = 'riot-api-key'

// ------------------------------ Simple TTL Cache ------------------------------
class TTLCache<V> {
  private store = new Map<string, { v: V; exp: number }>()
  constructor(private ttlMs: number) {}
  get(k: string): V | undefined {
    const hit = this.store.get(k)
    if (!hit) return
    if (hit.exp < Date.now()) {
      this.store.delete(k)
      return
    }
    return hit.v
  }
  set(k: string, v: V) {
    this.store.set(k, { v, exp: Date.now() + this.ttlMs })
  }
}

// 매치 상세: 10분 캐시, 최근매치ID: 2분 캐시
const matchDetailCache = new TTLCache<any>(10 * 60 * 1000)
const recentIdsCache = new TTLCache<string[]>(2 * 60 * 1000)

// ------------------------------ Fetch helpers --------------------------------
function withToken(headers: HeadersInit, token: string): HeadersInit {
  return { ...headers, 'X-Riot-Token': token }
}

async function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function riotFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number; maxRetry?: number }
) {
  const { timeoutMs = 12000, maxRetry = 1, ...rest } = init ?? {}
  let attempt = 0
  while (true) {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), timeoutMs)
    try {
      const res = await fetch(input, { ...rest, signal: ac.signal })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        const err: any = new Error(`HTTP ${res.status} ${res.statusText} - ${body?.slice(0, 200)}`)
        err.status = res.status
        err.retryAfter = res.headers.get('retry-after')
        throw err
      }
      return res
    } catch (e: any) {
      // 429: Retry-After 준수 + 소량 지터
      if (e?.status === 429 && attempt < maxRetry) {
        attempt++
        const ra = Number.parseInt(e.retryAfter || '1', 10)
        const delay = (isNaN(ra) ? 1 : ra) * 1000 + Math.floor(Math.random() * 250)
        console.warn(`[RiotAPI] 429, wait ${delay}ms then retry (${attempt}/${maxRetry})`)
        await wait(delay)
        continue
      }
      throw e
    } finally {
      clearTimeout(t)
    }
  }
}

// 간단 동시성 제한 (작게 유지: 2)
async function mapLimit<T, R>(arr: T[], limit: number, fn: (x: T, i: number) => Promise<R>) {
  const ret: R[] = new Array(arr.length)
  let i = 0
  const workers = new Array(Math.min(limit, arr.length)).fill(0).map(async () => {
    while (i < arr.length) {
      const cur = i++
      ret[cur] = await fn(arr[cur], cur)
    }
  })
  await Promise.all(workers)
  return ret
}

// ------------------------------ Core logic -----------------------------------
// 1) 로비(참가자) + 각 참가자 최근 매치 "ID만" 반환: 가벼운 1단계
ipcMain.handle('tft:get-lobby-recent', async (_e, { gameName, tagLine, count = 5 }) => {
  const token = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME)
  if (!token) throw new Error('Riot API Key not found. 설정에서 키를 저장하세요.')

  // Riot ID → PUUID (리전: ASIA)
  const accUrl = `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
    gameName
  )}/${encodeURIComponent(tagLine)}`
  const acc = (await (
    await riotFetch(accUrl, { headers: withToken({}, token), maxRetry: 2 })
  ).json()) as {
    puuid: string
    gameName: string
    tagLine: string
  }

  // 현재 게임 조회 (플랫폼: KR, spectator-tft-v5)
  const spectUrl = `https://kr.api.riotgames.com/lol/spectator/tft/v5/active-games/by-puuid/${encodeURIComponent(
    acc.puuid
  )}`

  let spect: any
  try {
    spect = await (await riotFetch(spectUrl, { headers: withToken({}, token), maxRetry: 2 })).json()
  } catch (e: any) {
    if (e?.status === 404 || e?.status === 204) {
      return { lobby: [], totalPlayers: 0, note: '현재 진행 중인 게임이 없습니다.' }
    }
    throw e
  }

  const participants: any[] = Array.isArray(spect?.participants) ? spect.participants : []
  if (participants.length === 0) return { lobby: [], totalPlayers: 0 }

  // 참가자별 puuid 확보
  async function ensurePuuid(p: any): Promise<{ name?: string; puuid: string }> {
    if (p?.puuid) return { name: p?.riotId || p?.summonerName, puuid: p.puuid }
    if (!p?.summonerId) throw new Error('spectator 응답에 puuid/summonerId 없음')
    const sumUrl = `https://kr.api.riotgames.com/tft/summoner/v1/summoners/${encodeURIComponent(p.summonerId)}`
    const sum = (await (
      await riotFetch(sumUrl, { headers: withToken({}, token), maxRetry: 2 })
    ).json()) as {
      puuid: string
      name?: string
    }
    return { name: sum?.name ?? p?.summonerName, puuid: sum.puuid }
  }

  const players = await mapLimit(participants, 2, ensurePuuid)

  // 참가자별 최근 매치 ID (캐시 사용)
  async function getRecentIds(puuid: string): Promise<string[]> {
    const key = `ids:${puuid}:${count}`
    const cached = recentIdsCache.get(key)
    if (cached) return cached
    const url = `https://asia.api.riotgames.com/tft/match/v1/matches/by-puuid/${encodeURIComponent(
      puuid
    )}/ids?count=${count}`
    const ids = (await (
      await riotFetch(url, { headers: withToken({}, token), maxRetry: 2 })
    ).json()) as string[]
    recentIdsCache.set(key, ids)
    return ids
  }

  const lobby = await mapLimit(players, 2, async ({ name, puuid }) => {
    const recentIds = await getRecentIds(puuid)
    return { name, puuid, recentIds }
  })

  return { lobby, totalPlayers: lobby.length }
})
ipcMain.handle('tft:get-match-detail', async (_e, { matchId, puuId }) => {
  const token = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME)
  if (!token) throw new Error('Riot API Key not found.')

  const cached = matchDetailCache.get(matchId)
  if (cached) return cached

  const url = `https://asia.api.riotgames.com/tft/match/v1/matches/${encodeURIComponent(matchId)}`
  const res = await riotFetch(url, {
    headers: withToken({}, token),
    maxRetry: 2,
    timeoutMs: 10_000
  })
  const m = await res.json()
  console.log(m)
  // 참가자별 요약 + 유닛(챔피언) 컴포지션
  const participants = Array.isArray(m?.info?.participants) ? m.info.participants : []

  const players = participants
    .filter((pp) => pp.puuid === puuId)
    .map((pp: any) => {
      // pp.units 예시: [{ character_id: 'TFT9_Ahri', tier: 2, items: [11, 39, 99], rarity: 3 }, ...]
      const units = Array.isArray(pp?.units)
        ? pp.units.map((u: any) => ({
            unitId: u?.character_id ?? null, // ex) 'TFT9_Ahri'
            star: u?.tier ?? null, // 1~3성
            items: Array.isArray(u?.items) ? u.items : [], // 숫자 ID (아이템 이름 매핑은 렌더러에서)
            rarity: u?.rarity ?? null
          }))
        : []

      return {
        puuid: pp?.puuid,
        placement: pp?.placement,
        level: pp?.level,
        time_eliminated: pp?.time_eliminated,
        traits: Array.isArray(pp?.traits)
          ? pp.traits
              .filter((t: any) => (t?.tier_current ?? 0) > 0)
              .map((t: any) => ({
                name: t?.name ?? null, // ex) 'Set9_Sorcerer'
                tier: t?.tier_current ?? 0 // 현재 발동 티어
              }))
          : [],
        units
      }
    })

  const summary = {
    id: matchId,
    datetime: m?.info?.game_datetime ?? m?.info?.game_datetime_utc ?? null,
    queue: m?.info?.queue_id ?? null,
    version: m?.info?.game_version ?? null,
    players // ← 여기서 각 참가자의 comp(유닛/특성) 포함
  }

  matchDetailCache.set(matchId, summary)
  return summary
})

ipcMain.handle('tft:get-user-recent-comps', async (_e, { puuid, count = 5 }) => {
  const token = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME)
  if (!token) throw new Error('Riot API Key not found.')

  // 1) 최근 매치 ID 목록 (캐시 사용)
  const idsKey = `ids:${puuid}:${count}`
  let ids = recentIdsCache.get(idsKey)
  if (!ids) {
    const url = `https://asia.api.riotgames.com/tft/match/v1/matches/by-puuid/${encodeURIComponent(
      puuid
    )}/ids?count=${count}`
    ids = (await (
      await riotFetch(url, { headers: withToken({}, token), maxRetry: 2 })
    ).json()) as string[]
    recentIdsCache.set(idsKey, ids)
  }

  // 2) 각 매치 상세(캐시) → 해당 puuid 참가자만 추출
  async function getMatchSummaryForUser(matchId: string) {
    const cached = matchDetailCache.get(matchId)
    let m: any
    if (cached) {
      // 캐시에 전체 요약 저장해둔 경우가 있으면 그대로 활용
      m = cached.__raw ?? cached
    } else {
      const url = `https://asia.api.riotgames.com/tft/match/v1/matches/${encodeURIComponent(matchId)}`
      const res = await riotFetch(url, {
        headers: withToken({}, token),
        maxRetry: 2,
        timeoutMs: 10_000
      })
      m = await res.json()
      // 원본(raw)까지 보관해두면 나중에 다른 목적에도 재사용 가능
      matchDetailCache.set(matchId, { __raw: m })
    }

    const parts = Array.isArray(m?.info?.participants) ? m.info.participants : []
    const me = parts.find((pp: any) => pp?.puuid === puuid)
    if (!me) {
      return {
        matchId,
        datetime: m?.info?.game_datetime ?? m?.info?.game_datetime_utc ?? null,
        queue: m?.info?.queue_id ?? null,
        version: m?.info?.game_version ?? null,
        found: false
      }
    }

    const units = Array.isArray(me?.units)
      ? me.units.map((u: any) => ({
          unitId: u?.character_id ?? null, // ex) 'TFT9_Ahri'
          star: u?.tier ?? null,
          items: Array.isArray(u?.items) ? u.items : [],
          rarity: u?.rarity ?? null
        }))
      : []

    const traits = Array.isArray(me?.traits)
      ? me.traits
          .filter((t: any) => (t?.tier_current ?? 0) > 0)
          .map((t: any) => ({
            name: t?.name ?? null, // ex) 'Set9_Sorcerer'
            tier: t?.tier_current ?? 0
          }))
      : []

    return {
      matchId,
      datetime: m?.info?.game_datetime ?? m?.info?.game_datetime_utc ?? null,
      queue: m?.info?.queue_id ?? null,
      version: m?.info?.game_version ?? null,
      placement: me?.placement ?? null,
      level: me?.level ?? null,
      units,
      traits,
      found: true
    }
  }

  // 동시성 낮게(2) + 429 재시도 riotFetch 내부 처리
  const summaries = await mapLimit(ids, 2, getMatchSummaryForUser)

  // 시간순 정렬(오래된→최신) 또는 최신→오래된 선택 가능. 여기서는 최신이 뒤.
  summaries.sort((a: any, b: any) => (a.datetime ?? 0) - (b.datetime ?? 0))

  return { puuid, count: ids.length, matches: summaries }
})
