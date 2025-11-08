import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore } from '../../stores/simulationStore'
import { Card } from '../ui/card'
import { ScrollArea } from '../ui/scroll-area'
import { AlertCircle, TrendingUp, Home, Users, Leaf, DollarSign } from 'lucide-react'

const eventIcons = {
  traffic: TrendingUp,
  housing: Home,
  population: Users,
  environmental: Leaf,
  economic: DollarSign,
}

const severityColors = {
  low: 'text-green-400 border-green-400/30 bg-green-400/10',
  medium: 'text-amber-400 border-amber-400/30 bg-amber-400/10',
  high: 'text-red-400 border-red-400/30 bg-red-400/10',
}

export function EventNotificationPanel() {
  const { eventNotifications } = useSimulationStore()

  return (
    <div className="fixed left-4 top-4 bottom-4 w-80 z-10">
      <Card className="h-full bg-slate-900/80 backdrop-blur-md border-slate-800 shadow-2xl flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-cyan-400" />
            Event Notifications
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {eventNotifications.length} events
          </p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            <AnimatePresence mode="popLayout">
              {eventNotifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8 text-slate-500 text-sm"
                >
                  No events yet. Start a simulation to see events.
                </motion.div>
              ) : (
                eventNotifications.map((event, index) => {
                  const Icon = eventIcons[event.type]
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className={`p-3 border ${severityColors[event.severity]} cursor-pointer hover:scale-[1.02] transition-transform`}>
                        <div className="flex items-start gap-3">
                          <Icon className={`w-5 h-5 flex-shrink-0 ${severityColors[event.severity].split(' ')[0]}`} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-100">
                              {event.zoneName}
                            </div>
                            <p className="text-xs text-slate-300 mt-1">
                              {event.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${severityColors[event.severity]}`}>
                                {event.type}
                              </span>
                              <span className="text-xs text-slate-500">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </Card>
    </div>
  )
}

