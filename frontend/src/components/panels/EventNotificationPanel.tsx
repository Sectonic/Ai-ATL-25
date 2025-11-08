import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore, type EventNotification } from '../../stores/simulationStore'
import { TrendingUp, Home, Users, Leaf, DollarSign, X } from 'lucide-react'
import { getEventColor } from '../../lib/eventColors'

const eventIcons = {
  traffic: TrendingUp,
  housing: Home,
  population: Users,
  environmental: Leaf,
  economic: DollarSign,
}

function PulsatingDot({ severity, positivity }: { severity: number; positivity: number }) {
  const color = getEventColor(positivity, severity)
  const size = 10 + (severity * 4)
  
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: `${size}px`, height: `${size}px` }}>
      <div 
        className="absolute inset-0 rounded-full animate-ping opacity-75" 
        style={{ background: color, width: `${size}px`, height: `${size}px` }}
      />
      <div 
        className="relative rounded-full" 
        style={{ background: color, width: `${size}px`, height: `${size}px` }}
      />
    </div>
  )
}

function SelectedEventView({ event, onClose, containerRef }: { event: EventNotification, onClose: () => void, containerRef: React.RefObject<HTMLDivElement | null> }) {
  const Icon = eventIcons[event.type]
  const [showGradient, setShowGradient] = useState(false)

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = containerRef.current
        const hasOverflow = scrollHeight > clientHeight
        const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10
        setShowGradient(hasOverflow && !isScrolledToBottom)
      }
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', checkOverflow)
      const observer = new MutationObserver(checkOverflow)
      observer.observe(container, { childList: true, subtree: true })
      
      return () => {
        window.removeEventListener('resize', checkOverflow)
        container.removeEventListener('scroll', checkOverflow)
        observer.disconnect()
      }
    }

    return () => {
      window.removeEventListener('resize', checkOverflow)
    }
  }, [containerRef])

  return (
    <div className="relative">
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
      <AnimatePresence>
        {showGradient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-10"
            style={{
              background: 'linear-gradient(to top, rgba(2, 2, 2, 0.95) 0%, rgba(2, 2, 2, 0.7) 20%, rgba(2, 2, 2, 0.4) 40%, rgba(2, 2, 2, 0.1) 70%, transparent 100%)'
            }}
          />
        )}
      </AnimatePresence>
    </div>
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
          <PulsatingDot severity={event.severity} positivity={event.positivity} />
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
        const { scrollHeight, clientHeight, scrollTop } = containerRef.current
        const hasOverflow = scrollHeight > clientHeight
        const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10
        setShowGradient(hasOverflow && !isScrolledToBottom)
      }
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', checkOverflow)
      const observer = new MutationObserver(checkOverflow)
      observer.observe(container, { childList: true, subtree: true })
      
      return () => {
        window.removeEventListener('resize', checkOverflow)
        container.removeEventListener('scroll', checkOverflow)
        observer.disconnect()
      }
    }

    return () => {
      window.removeEventListener('resize', checkOverflow)
    }
  }, [eventNotifications, selectedEvent])

  if (eventNotifications.length === 0) {
    return null
  }

  return (
    <div className="fixed left-3 top-[160px] bottom-0 w-1/4 z-10 pointer-events-none">
      <div className="relative h-full">
        <div ref={containerRef} className="h-full overflow-y-auto pr-2 pl-1 scrollbar-hide" style={{ overflowX: 'visible' }}>
          <div className="space-y-2 py-1">
            <AnimatePresence mode="wait">
              {selectedEvent ? (
                <SelectedEventView
                  key={`selected-${selectedEvent.id}`}
                  event={selectedEvent}
                  onClose={() => setSelectedEventId(null)}
                  containerRef={containerRef}
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
        </div>
        <AnimatePresence>
          {showGradient && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-10"
            style={{
              background: 'linear-gradient(to top, rgba(2, 2, 2, 0.95) 0%, rgba(2, 2, 2, 0.7) 20%, rgba(2, 2, 2, 0.4) 40%, rgba(2, 2, 2, 0.1) 70%, transparent 100%)'
            }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
