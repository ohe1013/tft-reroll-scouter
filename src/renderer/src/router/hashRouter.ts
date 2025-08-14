import { useEffect, useState } from 'react'

export type RouteKey = 'main' | 'scout' | 'settings' | 'vision' | 'annotator'

function parseHash(raw: string): RouteKey | null {
  const clean = raw.replace(/^#\/?/, '').trim()
  if (clean === '') return null
  const seg = clean.split('/')[0] as RouteKey
  if (
    seg === 'main' ||
    seg === 'scout' ||
    seg === 'settings' ||
    seg === 'vision' ||
    seg === 'annotator'
  )
    return seg
  return null
}

export function toHash(route: RouteKey): string {
  return `#/${route}`
}

export function useHashRoute(defaultRoute: RouteKey = 'main') {
  const [route, setRoute] = useState<RouteKey>(
    () => parseHash(window.location.hash) ?? defaultRoute
  )

  // 1) 초기 해시 정규화: 빈 해시면 #/main 으로 한 번만 설정
  useEffect(() => {
    if (!window.location.hash) {
      window.location.replace(toHash(defaultRoute))
    } else {
      const next = parseHash(window.location.hash) ?? defaultRoute
      setRoute((prev) => (prev === next ? prev : next))
    }
    // mount 시 1회만 동작
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2) 해시 변화에만 반응하고, 값이 같으면 업데이트 스킵
  useEffect(() => {
    const onHash = () => {
      const next = parseHash(window.location.hash) ?? defaultRoute
      setRoute((prev) => (prev === next ? prev : next))
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [defaultRoute])

  const navigate = (next: RouteKey) => {
    const target = toHash(next)
    if (window.location.hash !== target) window.location.hash = target
  }

  return { route, navigate } as const
}
