import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore } from '../../stores/simulationStore'
import { simulatePolicy } from '../../services/simulationApi'
import { useNeighborhoods } from '../../services/geojsonApi'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Loader2, Play, RotateCcw } from 'lucide-react'

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
  } = useSimulationStore()

  const [localPrompt, setLocalPrompt] = useState('')
  const { data: neighborhoodsData } = useNeighborhoods()

  const handleStartSimulation = async () => {
    if (!localPrompt.trim() || !neighborhoodsData) return

    setPromptText(localPrompt)
    setSimulationStatus('loading')
    clearEventNotifications()

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))

      for await (const chunk of simulatePolicy(localPrompt, cityMetrics, selectedZones, neighborhoodsData)) {
        if (chunk.type === 'event') {
          addEventNotification(chunk.data)
        } else if (chunk.type === 'zoneUpdate') {
          updateZoneData(chunk.data.zoneId, chunk.data)
        } else if (chunk.type === 'metricsUpdate') {
          updateCityMetrics(chunk.data)
        } else if (chunk.type === 'complete') {
          setSimulationSummary(chunk.data.summary)
          setSimulationStatus('complete')
        }
      }
    } catch (error) {
      console.error('Simulation error:', error)
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
    <div className="fixed bottom-4 left-[49.2%] -translate-x-1/2 w-[calc(50%-50px)] z-10 pointer-events-none">
      <AnimatePresence mode="wait">
        {simulationStatus === 'idle' && (
          <motion.div
            key="idle"
            layout
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="pointer-events-auto w-full mx-auto"
          >
            <div className="relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg">
              <Textarea
                value={localPrompt}
                onChange={(e) => setLocalPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="type in some city policy"
                className="min-h-[60px] pr-20 pb-12 bg-transparent border-0 text-white placeholder:text-white/50 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
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
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="pointer-events-auto"
          >
            <div className="relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg">
              <div className="p-3 pr-20 pb-12">
                <div className="text-xs text-white/60 mb-1">
                  Summary:
                </div>
                <div className="text-sm text-white/90 leading-relaxed">
                  <TypewriterText text={simulationSummary} />
                </div>
              </div>
              <Button
                onClick={handleReset}
                className="absolute bottom-2 right-2 h-8 px-3 bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
