import { createFileRoute } from '@tanstack/react-router'
import { AtlantaMap } from '../components/map/AtlantaMap'
import { EventNotificationPanel } from '../components/panels/EventNotificationPanel'
import { CommandPanel } from '../components/panels/CommandPanel'
import { DataPanel } from '../components/panels/DataPanel'
import { AppHeader } from '../components/layout/AppHeader'
import { useZoneDataInitializer } from '../hooks/useZoneDataInitializer'

export const Route = createFileRoute('/app')({
  component: App,
})

function App() {
  useZoneDataInitializer()

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 relative">
      <AtlantaMap />
      <AppHeader />
      <EventNotificationPanel />
      <CommandPanel />
      <DataPanel />
    </div>
  )
}

