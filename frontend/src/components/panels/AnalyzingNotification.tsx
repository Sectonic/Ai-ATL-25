import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore } from '../../stores/simulationStore'

function AnalyzingLoader() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-1 h-3 bg-white/90 rounded-full"
          animate={{
            scaleY: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: index * 0.15,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
      ))}
    </div>
  )
}

export function AnalyzingNotification() {
  const zonesAnalyzing = useSimulationStore((state) => state.zonesAnalyzing)

  return (
    <AnimatePresence>
      {zonesAnalyzing !== null && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="fixed top-6 right-[22%] z-50 pointer-events-none"
        >
          <div className="rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <AnalyzingLoader />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white/90">
                  {zonesAnalyzing} {zonesAnalyzing === 1 ? 'zone' : 'zones'} affected
                </span>
                <span className="text-xs text-white/60">Analyzing...</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
