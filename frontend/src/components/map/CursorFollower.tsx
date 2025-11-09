import { useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { useSimulationStore } from '../../stores/simulationStore'

export function CursorFollower() {
  const hoveredNeighborhood = useSimulationStore((state) => state.hoveredNeighborhood)

  const cursorX = useMotionValue(0)
  const cursorY = useMotionValue(0)

  const springConfig = { damping: 20, stiffness: 400, mass: 0.4 }
  const x = useSpring(cursorX, springConfig)
  const y = useSpring(cursorY, springConfig)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX + 12)
      cursorY.set(e.clientY + 12)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [cursorX, cursorY])

  return (
    <AnimatePresence>
      {hoveredNeighborhood && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{
            duration: 0.15,
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            x,
            y,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
        >
          <motion.div
            layout
            transition={{
              layout: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
            }}
            className="rounded-lg bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg px-2 py-0.5 pb-1"
          >
            <motion.span
              layout="position"
              className="text-xs font-medium text-white/90 whitespace-nowrap"
            >
              {hoveredNeighborhood}
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
