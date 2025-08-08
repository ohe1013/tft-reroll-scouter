import { useState } from 'react'

export default function ScoutPage(): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any | null>(null)

  const handleFetch = async () => {
    setLoading(true)
    setError(null)
    try {
      // TODO: 구현 예정 - IPC 채널 예시 (main에서 Riot API 호출)
      // const res = await window.tft.getLobbyRecent({ gameName, tagLine, count: 5 });
      // setData(res);
      await new Promise((r) => setTimeout(r, 400))
      setData({ placeholder: true })
    } catch (e: any) {
      setError(e?.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <p>현재 게임(로비) 참가자들의 최근 전적을 가져옵니다. (Riot API 연동 IPC는 main에서 처리)</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleFetch} disabled={loading} style={{ padding: '8px 12px' }}>
          {loading ? '조회 중...' : '로비 최근전적 조회'}
        </button>
      </div>

      {error && <div style={{ color: '#dc2626' }}>에러: {error}</div>}
      {data && (
        <pre style={{ background: '#f9fafb', padding: 12, borderRadius: 8, overflow: 'auto' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  )
}
