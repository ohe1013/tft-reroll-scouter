import { useEffect, useState } from 'react'

declare global {
  interface Window {
    riotKey: {
      set(key: string): Promise<boolean>
      get(): Promise<string | null>
      delete(): Promise<boolean>
    }
  }
}

export default function SettingsPage(): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const saved = await window.riotKey.get()
      setLoadedKey(saved)
    })()
  }, [])

  const handleSave = async () => {
    await window.riotKey.set(apiKey)
    setLoadedKey(apiKey)
    setApiKey('')
  }

  const handleDelete = async () => {
    await window.riotKey.delete()
    setLoadedKey(null)
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>설정</h1>
      <label>
        Riot API Key:
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ marginLeft: 8 }}
        />
      </label>
      <button onClick={handleSave} style={{ marginLeft: 8 }}>
        저장
      </button>
      {loadedKey && (
        <div style={{ marginTop: 20 }}>
          <p>저장된 키 있음 (마스킹 처리)</p>
          <button onClick={handleDelete}>삭제</button>
        </div>
      )}
    </div>
  )
}
