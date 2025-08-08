import { useState } from 'react'

export default function SettingsPage(): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')

  const save = async () => {
    // TODO: IPC로 안전 저장 (keytar/OS keychain or env). 여기선 UI만 준비.
    // await window.settings.saveRiotKey(apiKey)
    console.log('Save (stub)', apiKey)
  }

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
      <label style={{ display: 'grid', gap: 6 }}>
        <span>Riot API Key</span>
        <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="RGAPI-..." />
      </label>
      <button onClick={save} style={{ width: 120, padding: '8px 12px' }}>
        저장
      </button>
      <p style={{ color: '#6b7280' }}>
        키는 메인 프로세스에서만 사용하고, 렌더러에는 노출하지 않도록 설계합니다.
      </p>
    </div>
  )
}
