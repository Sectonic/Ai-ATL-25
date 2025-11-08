import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSimulationStore } from '../../stores/simulationStore'
import { simulatePolicy } from '../../services/mockSimulationApi'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Loader2, Play, RotateCcw } from 'lucide-react'

export function CommandPanel() {
  const {
    simulationStatus,
    processedPrompt,
    setSimulationStatus,
    setPromptText,
    setProcessedPrompt,
    addEventNotification,
    updateZoneData,
    updateCityMetrics,
    resetSimulation,
    clearEventNotifications,
  } = useSimulationStore()

  const [localPrompt, setLocalPrompt] = useState('')

  const handleStartSimulation = async () => {
    if (!localPrompt.trim()) return

    setPromptText(localPrompt)
    setProcessedPrompt(localPrompt)
    setSimulationStatus('loading')
    clearEventNotifications()

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))

      for await (const chunk of simulatePolicy(localPrompt)) {
        if (chunk.type === 'event') {
          addEventNotification(chunk.data)
        } else if (chunk.type === 'zoneUpdate') {
          updateZoneData(chunk.data.zoneId, chunk.data)
        } else if (chunk.type === 'metricsUpdate') {
          updateCityMetrics(chunk.data)
        } else if (chunk.type === 'complete') {
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
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="pointer-events-auto w-full mx-auto"
      >
        {simulationStatus === 'idle' && (
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
        )}

        {simulationStatus === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg p-4 flex items-center justify-center"
          >
            <Loader2 className="w-5 h-5 animate-spin text-white/90" />
            <span className="ml-2 text-sm text-white/80">
              Initializing simulation...
            </span>
          </motion.div>
        )}

        {simulationStatus === 'complete' && (
          <div className="relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg">
            <div className="p-3 pr-20 pb-12">
              <div className="text-xs text-white/60 mb-1">
                Complete:
              </div>
              <div className="text-sm text-white/90 leading-tight">
                {processedPrompt}
              </div>
            </div>
            <Button
              onClick={handleReset}
              className="absolute bottom-2 right-2 h-8 px-3 bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

