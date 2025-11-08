import { motion } from 'framer-motion'
import { Share2 } from 'lucide-react'
import { useSimulationStore } from '../../stores/simulationStore'
import { Button } from '../ui/button'

export function AppHeader() {
  const { simulationStatus } = useSimulationStore()

  const handleShareAnalysis = () => {
    if (simulationStatus === 'complete') {
      console.log('Share analysis clicked')
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-20 pointer-events-none">
      <div className="pointer-events-auto px-3 pt-3 pb-3">
        <div className="flex items-start justify-between">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
            className="flex items-center gap-2"
          >
            <img src="/mimic_logo.png" alt="Mimic Logo" className="w-14 h-14" />
            <h1 className="text-2xl font-light text-white">Mimic</h1>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
          >
            <Button
              onClick={handleShareAnalysis}
              disabled={simulationStatus !== 'complete'}
              className="h-8 px-3 bg-white/20 hover:bg-white/30 text-white border-0 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              Share Simulation
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

