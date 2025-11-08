import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore, type EventNotification } from '../../stores/simulationStore'
import { TrendingUp, Home, Users, Leaf, DollarSign, X } from 'lucide-react'

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

function SelectedEventView({ event, onClose }: { event: EventNotification, onClose: () => void }) {
  const Icon = eventIcons[event.type]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-auto max-h-[calc(100vh-2rem)]"
    >
      <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg flex flex-col max-h-[calc(100vh-2rem)]">
        <div className="flex items-start justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 shrink-0 text-white/90" />
            <div className="font-semibold text-base text-white">{event.zoneName}</div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>
        
        <p className="text-sm text-white/90 mb-3 leading-relaxed shrink-0">{event.description}</p>
        
        <div className="flex items-center gap-2 mb-4 shrink-0">
          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
            {event.type}
          </span>
          <span className="text-xs text-white/60">
            {new Date(event.timestamp).toLocaleTimeString()}
          </span>
        </div>

        <div className="border-t border-white/10 pt-4 min-h-0 flex flex-col">
          <div className="text-sm font-medium text-white/90 mb-3 shrink-0">Reactions</div>
          <div className="overflow-y-auto pr-2 -mr-2 space-y-3 scrollbar-hide">
            {event.comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <img
                  src={`https://ui-avatars.com/api/?name=${comment.userInitials}&background=1a1a1a&size=40&bold=true&color=fff`}
                  alt={comment.userName}
                  className="w-10 h-10 rounded-full shrink-0 border border-white/30"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white/90">{comment.userName}</span>
                    <span className="text-xs text-white/50">
                      {new Date(comment.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">{comment.comment}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function EventCard({ event, onClick }: { event: EventNotification, onClick: () => void }) {
  const Icon = eventIcons[event.type]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-auto"
    >
      <div
        onClick={onClick}
        className="p-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg cursor-pointer hover:scale-[1.02] transition-transform"
      >
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
}

export function EventNotificationPanel() {
  const { eventNotifications, selectedEventId, setSelectedEventId } = useSimulationStore()
  const selectedEvent = eventNotifications.find((e) => e.id === selectedEventId)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showGradient, setShowGradient] = useState(false)

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current) {
        const { scrollHeight, clientHeight } = containerRef.current
        setShowGradient(scrollHeight > clientHeight)
      }
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    
    const observer = new MutationObserver(checkOverflow)
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true })
    }

    return () => {
      window.removeEventListener('resize', checkOverflow)
      observer.disconnect()
    }
  }, [eventNotifications, selectedEvent])

  if (eventNotifications.length === 0) {
    return null
  }

  return (
    <div className="fixed left-3 top-3 w-1/4 max-h-[calc(100vh-1.5rem)] z-10 pointer-events-none">
      <div ref={containerRef} className="h-full overflow-y-auto pr-2 scrollbar-hide relative">
        <div className="space-y-2">
          <AnimatePresence mode="wait">
            {selectedEvent ? (
              <SelectedEventView
                key={`selected-${selectedEvent.id}`}
                event={selectedEvent}
                onClose={() => setSelectedEventId(null)}
              />
            ) : (
              <motion.div
                key="event-cards"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                {eventNotifications.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onClick={() => setSelectedEventId(event.id)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {showGradient && !selectedEvent && (
          <div className="fixed bottom-0 left-3 w-1/4 h-16 bg-linear-to-t from-slate-900/80 to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  )
}
