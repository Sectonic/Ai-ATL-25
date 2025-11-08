import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore } from '../../stores/simulationStore'
import { ScrollArea } from '../ui/scroll-area'
import { TrendingUp, Home, Users, Leaf, DollarSign } from 'lucide-react'

const eventIcons = {
  traffic: TrendingUp,
  housing: Home,
  population: Users,
  environmental: Leaf,
  economic: DollarSign,
}

const severityDotColors = {
  low: 'bg-green-400',
  medium: 'bg-amber-400',
  high: 'bg-red-400',
}

function PulsatingDot({ severity }: { severity: 'low' | 'medium' | 'high' }) {
  const colorClass = severityDotColors[severity]
  
  return (
    <div className="relative flex items-center justify-center w-3 h-3 shrink-0">
      <div className={`absolute inset-0 ${colorClass} rounded-full animate-ping opacity-75`} />
      <div className={`relative ${colorClass} rounded-full w-3 h-3`} />
    </div>
  )
}

export function EventNotificationPanel() {
  const { eventNotifications } = useSimulationStore()

  if (eventNotifications.length === 0) {
    return null
  }

  return (
    <>
      <style>{`
        .event-notification-panel [data-slot="scroll-area-viewport"] {
          overflow: visible !important;
        }
      `}</style>
      <div className="event-notification-panel fixed left-3 top-3 w-1/4 z-10 pointer-events-none overflow-visible">
        <div className="h-full overflow-visible">
          <ScrollArea className="h-full">
            <div className="space-y-2 pr-4">
            <AnimatePresence mode="popLayout">
              {eventNotifications.map((event, index) => {
                const Icon = eventIcons[event.type]
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                    className="pointer-events-auto"
                  >
                    <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg cursor-pointer hover:scale-[1.02] transition-transform">
                      <div className="flex items-start justify-between mb-2">
                        <Icon className="w-4 h-4 shrink-0 text-white/90" />
                        <PulsatingDot severity={event.severity} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-white leading-tight">
                          {event.zoneName}
                        </div>
                        <p className="text-xs text-white/80 mt-1 leading-tight">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
                            {event.type}
                          </span>
                          <span className="text-xs text-white/60">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  )
}

