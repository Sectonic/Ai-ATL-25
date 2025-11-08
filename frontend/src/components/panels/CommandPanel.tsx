import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore } from '../../stores/simulationStore'
import { simulatePolicy } from '../../services/simulationApi'
import { useNeighborhoods } from '../../services/geojsonApi'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Loader2, Play, ChevronUp, X, Layers } from 'lucide-react'

function TypewriterText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    let currentIndex = 0
    setDisplayedText('')

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(interval)
      }
    }, 30)

    return () => clearInterval(interval)
  }, [text])

  return <span>{displayedText}</span>
}

const examplePrompts = [
  {
    title: 'Transportation Infrastructure',
    prompt: 'Build a new light rail line connecting downtown Atlanta to the airport, with stops in Midtown, Buckhead, and the BeltLine. Include dedicated bike lanes and pedestrian walkways along the route. This will require rezoning areas around stations for mixed-use development.',
  },
  {
    title: 'Affordable Housing Initiative',
    prompt: 'Implement a comprehensive affordable housing program that includes: (1) Upzoning single-family neighborhoods to allow duplexes and triplexes, (2) Providing tax incentives for developers who set aside 30% of units as affordable housing, (3) Creating a community land trust in underserved neighborhoods, and (4) Expanding public transit access to new housing developments.',
  },
  {
    title: 'Green Infrastructure & Climate',
    prompt: 'Launch a city-wide green infrastructure initiative that includes: (1) Installing green roofs on all new commercial buildings over 10,000 sq ft, (2) Converting 20% of parking lots to green spaces with native plants, (3) Expanding the BeltLine trail network with additional parks and community gardens, (4) Implementing a carbon tax on large commercial buildings, and (5) Creating a network of electric vehicle charging stations throughout the city.',
  },
]

function PreviousSimulationsTab({
  isOpen,
  onToggle,
  onSelectPrompt
}: {
  isOpen: boolean
  onToggle: () => void
  onSelectPrompt: (prompt: string) => void
}) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) {
          onToggle()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onToggle])

  const handlePromptClick = (prompt: string) => {
    onSelectPrompt(prompt)
    onToggle()
  }

  return (
    <div className="relative z-20" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-colors text-white text-sm font-medium"
      >
        <span>Previous Simulations</span>
        <ChevronUp className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? '' : 'rotate-180'}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="absolute bottom-full left-0 mb-2 w-96 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg overflow-hidden z-30"
          >
            <div>
              {examplePrompts.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handlePromptClick(example.prompt)}
                  className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors cursor-pointer border-b border-white/5 last:border-b-0 ${index === 0 ? 'rounded-t-xl' : ''
                    } ${index === examplePrompts.length - 1 ? 'rounded-b-xl' : ''
                    }`}
                >
                  <div className="text-xs font-semibold text-white/70 mb-1">
                    {example.title}
                  </div>
                  <div className="text-sm text-white/90 line-clamp-2">
                    {example.prompt}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function CommandPanel() {
  const {
    simulationStatus,
    simulationSummary,
    selectedZones,
    cityMetrics,
    setSimulationStatus,
    setPromptText,
    setSimulationSummary,
    addEventNotification,
    updateZoneData,
    updateCityMetrics,
    resetSimulation,
    clearEventNotifications,
    clearSelectedZones,
  } = useSimulationStore()

  const [localPrompt, setLocalPrompt] = useState('')
  const [isPreviousSimulationsOpen, setIsPreviousSimulationsOpen] = useState(false)
  const { data: neighborhoodsData } = useNeighborhoods()

  const handleStartSimulation = async () => {
    if (!localPrompt.trim() || !neighborhoodsData) return

    setPromptText(localPrompt)
    setSimulationStatus('loading')
    clearEventNotifications()

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))

      let chunkCount = 0
      for await (const chunk of simulatePolicy(localPrompt, cityMetrics, selectedZones, neighborhoodsData)) {
        chunkCount++
        console.log('Received chunk:', chunk.type, chunk)

        if (chunk.type === 'event') {
          addEventNotification(chunk.data)
        } else if (chunk.type === 'zoneUpdate') {
          updateZoneData(chunk.data.zoneId, chunk.data)
        } else if (chunk.type === 'metricsUpdate') {
          updateCityMetrics(chunk.data)
        } else if (chunk.type === 'complete') {
          setSimulationSummary(chunk.data.summary)
          setSimulationStatus('complete')
          clearSelectedZones()
        }
      }

      if (chunkCount === 0) {
        console.warn('No chunks received from backend')
        setSimulationStatus('idle')
      }
    } catch (error) {
      console.error('Simulation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Simulation failed: ${errorMessage}\n\nCheck the browser console and backend terminal for details.`)
      setSimulationStatus('idle')
    }
  }

  const handleReset = () => {
    resetSimulation()
    setLocalPrompt('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (localPrompt.trim()) {
        handleStartSimulation()
      }
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(60%-6rem)] z-10 pointer-events-none">
      <motion.div layout transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}>
        <AnimatePresence>
          {simulationStatus !== 'loading' && (
            <motion.div
              layout
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{
                opacity: 1,
                height: 'auto',
                marginBottom: 8
              }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
                layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
              }}
              className="flex items-center gap-2 pointer-events-auto overflow-hidden"
              style={{ overflow: 'visible' }}
            >
              <PreviousSimulationsTab
                isOpen={isPreviousSimulationsOpen}
                onToggle={() => setIsPreviousSimulationsOpen(!isPreviousSimulationsOpen)}
                onSelectPrompt={(prompt) => {
                  setLocalPrompt(prompt)
                  setPromptText(prompt)
                }}
              />
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-colors text-white text-sm font-medium cursor-pointer"
              >
                New Simulation
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {simulationStatus === 'idle' && (
            <motion.div
              key="idle"
              layout
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
                layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
              }}
              className="pointer-events-auto w-full mx-auto"
            >
              <div className="relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg">
                <AnimatePresence>
                  {selectedZones.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      className="absolute top-2.5 left-2.5 z-10"
                    >
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                        <Layers className="w-3.5 h-3.5 text-white/90" />
                        <span className="text-xs text-white/90 font-medium">
                          {selectedZones.length} {selectedZones.length === 1 ? 'zone' : 'zones'} in context
                        </span>
                        <button
                          onClick={clearSelectedZones}
                          className="flex items-center justify-center h-4 px-0.5 rounded cursor-pointer"
                          aria-label="Clear all selected zones"
                        >
                          <X className="w-3 h-3 text-white/90" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.div
                  layout
                  animate={{ paddingTop: selectedZones.length > 0 ? 36 : 0 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1],
                    layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
                  }}
                  className="relative"
                >
                  <Textarea
                    value={localPrompt}
                    onChange={(e) => setLocalPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type In Some City Policies"
                    className="min-h-[60px] pr-20 pb-12 bg-transparent border-0 text-white placeholder:text-white/50 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </motion.div>
                <Button
                  onClick={handleStartSimulation}
                  disabled={!localPrompt.trim()}
                  className="absolute bottom-2 right-2 h-8 px-3 bg-white/20 hover:bg-white/30 text-white border-0 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {simulationStatus === 'loading' && (
            <motion.div
              key="loading"
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{
                duration: 0.25,
                ease: [0.4, 0, 0.2, 1],
                layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
              }}
              className="pointer-events-auto"
            >
              <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg p-4 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-white/90" />
                <span className="ml-2 text-sm text-white/80">
                  Initializing simulation...
                </span>
              </div>
            </motion.div>
          )}

          {simulationStatus === 'complete' && (
            <motion.div
              key="complete"
              layout
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
                layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
              }}
              className="pointer-events-auto w-full mx-auto"
            >
              <div className="relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg">
                <div className="p-4">
                  <div className="text-xs text-white/60 mb-2">
                    Summary:
                  </div>
                  <div className="text-sm text-white/90 leading-relaxed opacity-90 cursor-default select-none">
                    <TypewriterText text={simulationSummary} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
