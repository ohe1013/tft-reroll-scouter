import { useState } from 'react'

declare global {
  interface Window {
    tft: {
      getLobbyRecent(params: { gameName: string; tagLine: string; count?: number }): Promise<{
        lobby: { name?: string; puuid: string; recentIds: string[] }[]
        totalPlayers: number
        note?: string
      }>
      getMatchDetail(matchId: string): Promise<any>
      getUserRecentComps(params: { puuid: string; count?: number }): Promise<{
        puuid: string
        count: number
        matches: {
          matchId: string
          datetime: number | null
          queue: number | null
          version: string | null
          placement: number | null
          level: number | null
          units: {
            unitId: string | null
            star: number | null
            items: number[]
            rarity: number | null
          }[]
          traits: { name: string | null; tier: number }[]
          found: boolean
        }[]
      }>
    }
  }
}
const prettyUnit = (unitId?: string) => {
  if (!unitId) return '-'
  // 예: 'TFT9_Ahri' → 'Ahri'
  const m = unitId.match(/TFT\\d+_(.+)/)
  return m ? m[1] : unitId
}

const starMark = (n?: number) => (n ? '★'.repeat(Math.max(1, Math.min(3, n))) : '')
export default function ScoutPage(): React.JSX.Element {
  const [gameName, setGameName] = useState('')
  const [tagLine, setTagLine] = useState('')
  const [count, setCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lobby, setLobby] = useState<{ name?: string; puuid: string; recentIds: string[] }[]>([])
  const [note, setNote] = useState<string | undefined>(undefined)
  const [details, setDetails] = useState<Record<string, any>>({}) // matchId -> summary

  const handleFetch = async () => {
    if (!gameName || !tagLine) return alert('게임네임과 태그라인을 입력하세요.')
    setLoading(true)
    setError(null)
    setLobby([])
    setDetails({})
    try {
      const res = await window.tft.getLobbyRecent({ gameName, tagLine, count })
      setLobby(res.lobby ?? [])
      setNote(res.note)
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const [userComps, setUserComps] = useState<Record<string, any>>({}) // puuid -> result

  const handleLoadUserComps = async (puuid: string) => {
    try {
      const res = await window.tft.getUserRecentComps({ puuid, count })
      console.log(res)
      setUserComps((prev) => ({ ...prev, [puuid]: res }))
    } catch (e: any) {
      alert(e?.message ?? '최근 컴프 조회 실패')
    }
  }
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 900 }}>
      <p>
        로비 참가자들의 최근 매치 <b>ID</b>만 먼저 불러오고, 상세는 필요할 때 개별 조회합니다.
      </p>

      <div
        style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 700 }}
      >
        <label>
          게임네임: <input value={gameName} onChange={(e) => setGameName(e.target.value)} />
        </label>
        <label>
          태그라인: <input value={tagLine} onChange={(e) => setTagLine(e.target.value)} />
        </label>
        <label>
          최근 경기 수:
          <input
            type="number"
            value={count}
            min={1}
            max={20}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>
      </div>

      <button onClick={handleFetch} disabled={loading} style={{ width: 160, padding: '8px 12px' }}>
        {loading ? '조회 중...' : '로비 조회'}
      </button>

      {error && <div style={{ color: '#dc2626' }}>에러: {error}</div>}
      {note && <div style={{ color: '#6b7280' }}>{note}</div>}

      {lobby.length > 0 && (
        <div style={{ marginTop: 12, display: 'grid', gap: 16 }}>
          {lobby.map((p, idx) => (
            <div
              key={p.puuid}
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                {idx + 1}. {p.name ?? '(이름 미확인)'} — {p.puuid.slice(0, 12)}…
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {p.recentIds.length === 0 && (
                  <span style={{ color: '#6b7280' }}>최근 경기 없음</span>
                )}
                <button
                  onClick={() => handleLoadUserComps(p.puuid)}
                  style={{ marginTop: 6, width: '100%' }}
                >
                  상세 불러오기
                </button>
                {p.recentIds.map((id) => {
                  return (
                    <div
                      key={id}
                      style={{ border: '1px solid #ddd', borderRadius: 6, padding: '6px 8px' }}
                    >
                      <div style={{ fontFamily: 'monospace' }}>{id}</div>

                      {userComps[p.puuid] && (
                        <div style={{ marginTop: 10, borderTop: '1px solid #eee', paddingTop: 8 }}>
                          {(userComps[p.puuid].matches || [])
                            .filter((match) => match.matchId === id)
                            .map((m: any) => (
                              <div key={m.matchId} style={{ marginBottom: 8 }}>
                                <div
                                  style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 6,
                                    marginTop: 4
                                  }}
                                >
                                  {m.units?.map((u: any, i: number) => (
                                    <div
                                      key={`${m.matchId}-${i}`}
                                      style={{
                                        border: '1px solid #ddd',
                                        borderRadius: 6,
                                        padding: '2px 6px',
                                        fontSize: 12
                                      }}
                                    >
                                      {u.unitId?.replace(/^TFT\\d+_/, '')}{' '}
                                      {u.star ? '★'.repeat(Math.max(1, Math.min(3, u.star))) : ''}
                                      {u.items?.length ? ` (${u.items.join(',')})` : ''}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
