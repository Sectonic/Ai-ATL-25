import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulationStore } from '../../stores/simulationStore'

export function LoadingProgressPopup() {
  const { simulationStatus, eventNotifications } = useSimulationStore()
  const [itemsFound, setItemsFound] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (simulationStatus === 'loading') {
      setIsVisible(true)
      setItemsFound(0)
    } else {
      setIsVisible(false)
    }
  }, [simulationStatus])

  useEffect(() => {
    if (simulationStatus === 'loading') {
      setItemsFound(eventNotifications.length)
    }
  }, [eventNotifications.length, simulationStatus])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="fixed top-4 right-4 z-50 pointer-events-none"
        >
          <div className="rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-full border-2 border-white/30" />
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-white border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  Finding events...
                </div>
                <div className="text-xs text-white/70 mt-0.5">
                  {itemsFound} {itemsFound === 1 ? 'event' : 'events'} found
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

