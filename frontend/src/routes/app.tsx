import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { AtlantaMap } from '../components/map/AtlantaMap'
import { EventNotificationPanel } from '../components/panels/EventNotificationPanel'
import { CommandPanel } from '../components/panels/CommandPanel'
import { DataPanel } from '../components/panels/DataPanel'
import { AppHeader } from '../components/layout/AppHeader'

export const Route = createFileRoute('/app')({
  component: App,
})

function App() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="h-screen w-screen overflow-hidden bg-slate-950 relative"
    >
      <AtlantaMap />
      <AppHeader />
      <EventNotificationPanel />
      <CommandPanel />
      <DataPanel />
    </motion.div>
  )
}

