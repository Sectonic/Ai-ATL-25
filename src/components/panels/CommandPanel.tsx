import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSimulationStore } from '../../stores/simulationStore'
import { simulatePolicy } from '../../services/mockSimulationApi'
import { Card } from '../ui/card'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Loader2, Play, RotateCcw } from 'lucide-react'

export function CommandPanel() {
  const {
    simulationStatus,
    promptText,
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
      setSimulationStatus('running')

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

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[600px] z-10">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-slate-900/80 backdrop-blur-md border-slate-800 shadow-2xl">
          <div className="p-4">
            <h2 className="text-base font-semibold text-slate-100 mb-3">
              Simulation Command
            </h2>

            {simulationStatus === 'idle' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <Textarea
                  value={localPrompt}
                  onChange={(e) => setLocalPrompt(e.target.value)}
                  placeholder="Enter a policy or scenario to simulate... (e.g., 'increase highway lanes', 'add new transit line', 'upzone midtown')"
                  className="min-h-[80px] bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 resize-none"
                />
                <Button
                  onClick={handleStartSimulation}
                  disabled={!localPrompt.trim()}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Simulation
                </Button>
              </motion.div>
            )}

            {simulationStatus === 'loading' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center py-8"
              >
                <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                <span className="ml-3 text-slate-300">
                  Initializing simulation...
                </span>
              </motion.div>
            )}

            {(simulationStatus === 'running' || simulationStatus === 'complete') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <div className="p-3 bg-slate-950 border border-slate-700 rounded-md">
                  <div className="text-xs text-slate-400 mb-1">
                    {simulationStatus === 'running' ? 'Running simulation for:' : 'Simulation complete for:'}
                  </div>
                  <div className="text-sm text-slate-200">
                    {processedPrompt}
                  </div>
                </div>
                {simulationStatus === 'complete' && (
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset & New Simulation
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

