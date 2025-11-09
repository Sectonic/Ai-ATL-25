import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore, type EventNotification } from '../../stores/simulationStore'
import { TrendingUp, Home, Users, Leaf, DollarSign, X, ChevronDown } from 'lucide-react'
import { getEventColor } from '../../lib/eventColors'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '../ui/skeleton'

const cities = [
  'Atlanta, GA',
  'New York, NY',
  'Los Angeles, CA',
  'Chicago, IL',
  'Houston, TX',
  'Phoenix, AZ',
  'Philadelphia, PA',
  'San Antonio, TX',
  'San Diego, CA',
  'Dallas, TX',
  'San Jose, CA',
  'Austin, TX',
  'Jacksonville, FL',
  'Fort Worth, TX',
  'Columbus, OH',
  'Charlotte, NC',
  'San Francisco, CA',
  'Indianapolis, IN',
  'Seattle, WA',
  'Denver, CO',
]

const eventIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  traffic: TrendingUp,
  housing: Home,
  population: Users,
  environmental: Leaf,
  economic: DollarSign,
  transportation: TrendingUp,
  infrastructure: TrendingUp,
  education: Users,
  healthcare: Users,
  'public-safety': Users,
}

const getEventIcon = (eventType: string) => {
  return eventIcons[eventType.toLowerCase()] || eventIcons[eventType] || TrendingUp
}

const fetchConstituentMessages = async (event: EventNotification, exclusions: string[]) => {
  const response = await fetch('http://localhost:8080/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: event.title,
      description: event.description,
      zone: event.zoneName,
      positivity: event.positivity,
      severity: event.severity,
      exclusions,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch constituent messages')
  }

  return response.json()
}

function CommentSkeleton() {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  )
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

function SelectedEventView({ event, onClose }: { event: EventNotification, onClose: () => void }) {
  const Icon = getEventIcon(event.type)
  const { usedConstituentNames, updateEventComments, addUsedConstituentNames } = useSimulationStore()

  const { data: fetchedComments, isLoading } = useQuery({
    queryKey: ['constituentMessages', event.id],
    queryFn: () => fetchConstituentMessages(event, usedConstituentNames),
    enabled: event.comments.length === 0,
    staleTime: Infinity,
  })

  useEffect(() => {
    if (fetchedComments && event.comments.length === 0) {
      updateEventComments(event.id, fetchedComments)
      addUsedConstituentNames(fetchedComments.map((c: { name: string }) => c.name))
    }
  }, [fetchedComments, event.id, event.comments.length, updateEventComments, addUsedConstituentNames])

  const comments = event.comments.length > 0 ? event.comments : (fetchedComments || [])

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="pointer-events-auto h-full"
      >
        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg flex flex-col h-full">
        <div className="flex items-start justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 shrink-0 text-white/90" />
            <div className="font-semibold text-base text-white">{event.title}</div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        <div className="text-xs text-white/60 mb-2 shrink-0">
          {event.zoneName}
        </div>

        <p className="text-sm text-white/90 mb-3 leading-relaxed shrink-0">{event.description}</p>

        <div className="flex items-center gap-2 mb-4 shrink-0">
          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
            {event.type}
          </span>
        </div>

        {event.metrics && (
          <div className="border-t border-white/10 pt-4 mb-4 shrink-0">
            <div className="text-sm font-medium text-white/90 mb-3">Impact Metrics</div>
            <div className="p-2 rounded-lg bg-white/5">
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {event.metrics.population_total !== undefined && (
                  <div>
                    <span className="text-white/50">Population: </span>
                    <span className="text-white/90">{event.metrics.population_total.toLocaleString()}</span>
                  </div>
                )}
                {event.metrics.housing_units !== undefined && (
                  <div>
                    <span className="text-white/50">Housing Units: </span>
                    <span className="text-white/90">{event.metrics.housing_units.toLocaleString()}</span>
                  </div>
                )}
                {event.metrics.median_income !== undefined && (
                  <div>
                    <span className="text-white/50">Median Income: </span>
                    <span className="text-white/90">${Math.round(event.metrics.median_income / 1000)}k</span>
                  </div>
                )}
                {event.metrics.median_home_value !== undefined && (
                  <div>
                    <span className="text-white/50">Home Value: </span>
                    <span className="text-white/90">${Math.round(event.metrics.median_home_value / 1000)}k</span>
                  </div>
                )}
                {event.metrics.affordability_index !== undefined && (
                  <div>
                    <span className="text-white/50">Affordability: </span>
                    <span className="text-white/90">{event.metrics.affordability_index.toFixed(2)}</span>
                  </div>
                )}
                {event.metrics.vacancy_rate !== undefined && (
                  <div>
                    <span className="text-white/50">Vacancy Rate: </span>
                    <span className="text-white/90">{event.metrics.vacancy_rate.toFixed(1)}%</span>
                  </div>
                )}
                {event.metrics.owner_occupancy !== undefined && (
                  <div>
                    <span className="text-white/50">Owner Occupancy: </span>
                    <span className="text-white/90">{event.metrics.owner_occupancy.toFixed(1)}%</span>
                  </div>
                )}
                {event.metrics.livability_index !== undefined && (
                  <div>
                    <span className="text-white/50">Livability: </span>
                    <span className="text-white/90">{event.metrics.livability_index.toFixed(1)}</span>
                  </div>
                )}
                {event.metrics.diversity_index !== undefined && (
                  <div>
                    <span className="text-white/50">Diversity: </span>
                    <span className="text-white/90">{event.metrics.diversity_index.toFixed(2)}</span>
                  </div>
                )}
                {event.metrics.commute?.avg_minutes !== undefined && (
                  <div>
                    <span className="text-white/50">Commute: </span>
                    <span className="text-white/90">{event.metrics.commute.avg_minutes.toFixed(1)} min</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-white/10 pt-4 min-h-0 flex flex-col">
          <div className="text-sm font-medium text-white/90 mb-1 shrink-0">Constituents</div>
          <div className="text-xs text-white/60 mb-3 shrink-0">Documented remarks from community members.</div>
          <div className="space-y-3">
            {isLoading ? (
              <>
                <CommentSkeleton />
                <CommentSkeleton />
              </>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.name}
                  className="rounded-xl border border-white/15 bg-white/5 p-3 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-sm font-semibold text-white/90">{comment.name}</span>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">{comment.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      </motion.div>
    </div>
  )
}

function EventCard({ event, onClick }: { event: EventNotification, onClick: () => void }) {
  const Icon = getEventIcon(event.type)

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
            {event.title}
          </div>
          <div className="text-xs text-white/60 mt-0.5">
            {event.zoneName}
          </div>
          <p className="text-xs text-white/80 mt-1 leading-tight line-clamp-2">
            {event.description}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
              {event.type}
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
  const [selectedCity, setSelectedCity] = useState('Atlanta, GA')
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false)
  const cityDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false)
      }
    }

    if (isCityDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCityDropdownOpen])

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

  useEffect(() => {
    if (selectedEventId && containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [selectedEventId])

  return (
    <div className="fixed left-3 top-[80px] bottom-0 w-[22%] z-10 pointer-events-none">
      <div className="relative h-full pointer-events-auto flex flex-col">
        <div className="flex flex-col gap-3 mb-3 ml-1">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
            className="relative"
            ref={cityDropdownRef}
          >
            <button
              onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-colors text-white text-sm font-medium"
            >
              <span>{selectedCity}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  isCityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            <AnimatePresence>
              {isCityDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute top-full left-0 mt-2 w-64 max-h-64 overflow-y-auto rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg scrollbar-hide z-50"
                >
                  <div>
                    {cities.map((city, index) => (
                      <button
                        key={city}
                        onClick={() => {
                          setSelectedCity(city)
                          setIsCityDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-2 text-left text-sm text-white/90 hover:bg-white/10 transition-colors cursor-pointer ${
                          index === 0 ? 'rounded-t-xl' : ''
                        } ${
                          index === cities.length - 1 ? 'rounded-b-xl' : ''
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.4 }}
            className="ml-1 text-lg font-medium text-white/70 uppercase tracking-wider"
          >
            {selectedEventId ? 'Selected Event' : 'Event Alerts'}
          </motion.div>
        </div>
        
        {eventNotifications.length > 0 && (
          <div className="flex-1 min-h-0">
            <div ref={containerRef} className="h-full overflow-y-auto pr-2 pl-1 scrollbar-hide" style={{ overflowX: 'visible' }}>
              <div className="space-y-2 py-1 h-full">
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
        )}
      </div>
    </div>
  )
}
