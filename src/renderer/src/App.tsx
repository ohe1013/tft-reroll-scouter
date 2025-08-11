import { Suspense } from 'react'
import { useHashRoute } from '@renderer/router/hashRouter'
import { MainPage, ScoutPage, SettingsPage } from '@renderer/pages'
import AppWrapper from '@renderer/layout/AppWrapper'

export default function App(): React.JSX.Element {
  const { route, navigate } = useHashRoute('main')
  return (
    <AppWrapper route={route} onNavigate={navigate}>
      <Suspense fallback={<div>Loading...</div>}>
        {route === 'main' && <MainPage />}
        {route === 'scout' && <ScoutPage />}
        {route === 'settings' && <SettingsPage />}
      </Suspense>
    </AppWrapper>
  )
}
