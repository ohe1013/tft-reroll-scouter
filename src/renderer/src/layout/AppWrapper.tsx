import { ReactNode } from 'react'
import { RouteKey } from '../router/hashRouter'

interface Props {
  route: RouteKey
  onNavigate: (r: RouteKey) => void
  children: ReactNode
}

export default function AppWrapper({ route, onNavigate, children }: Props): React.JSX.Element {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', height: '100vh' }}>
      <aside style={{ borderRight: '1px solid #e5e7eb', padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>TFT Scout</div>
        <nav style={{ display: 'grid', gap: 8 }}>
          <NavItem
            label="확률 계산기"
            active={route === 'main'}
            onClick={() => onNavigate('main')}
          />
          <NavItem
            label="로비 스카우트"
            active={route === 'scout'}
            onClick={() => onNavigate('scout')}
          />
          <NavItem
            label="설정"
            active={route === 'settings'}
            onClick={() => onNavigate('settings')}
          />
          <NavItem label="분석" active={route === 'vision'} onClick={() => onNavigate('vision')} />
        </nav>
      </aside>
      <main style={{ display: 'grid', gridTemplateRows: '56px 1fr' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            borderBottom: '1px solid #e5e7eb'
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>{titleOf(route)}</h2>
        </header>
        <section style={{ padding: 16, overflow: 'auto' }}>{children}</section>
      </main>
    </div>
  )
}

function titleOf(route: RouteKey): string {
  switch (route) {
    case 'main':
      return '확률 계산기'
    case 'scout':
      return '로비 스카우트'
    case 'settings':
      return '설정'
    case 'vision':
      return '분석'
    default:
      return 'TFT Scout'
  }
}

function NavItem({
  label,
  active,
  onClick
}: {
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid #e5e7eb',
        background: active ? '#f3f4f6' : '#fff',
        cursor: 'pointer'
      }}
    >
      {label}
    </button>
  )
}
