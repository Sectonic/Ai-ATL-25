import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore } from '../../stores/simulationStore'
import { X } from 'lucide-react'

export function SelectedZonesPanel() {
  const { selectedZones, zoneData, removeSelectedZone, clearSelectedZones } = useSimulationStore()

  if (selectedZones.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
    >
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-lg p-3 pointer-events-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="text-xs font-medium text-white/90">
            Selected Zones ({selectedZones.length})
          </div>
          <button
            onClick={clearSelectedZones}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            aria-label="Clear all selections"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {selectedZones.map((zoneId) => {
              const zone = zoneData[zoneId]
              const zoneName = zone?.zoneName || `Zone ${zoneId}`
              
              return (
                <motion.div
                  key={zoneId}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-xs text-white/90"
                >
                  <span className="truncate max-w-[200px]">{zoneName}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSelectedZone(zoneId)
                    }}
                    className="p-0.5 rounded hover:bg-white/10 transition-colors text-white/70 hover:text-white shrink-0"
                    aria-label={`Remove ${zoneName}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

