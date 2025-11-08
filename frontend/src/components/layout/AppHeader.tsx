import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Share2 } from 'lucide-react'
import { useSimulationStore } from '../../stores/simulationStore'
import { Button } from '../ui/button'

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

export function AppHeader() {
  const { simulationStatus, selectedEventId } = useSimulationStore()
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

  const handleShareAnalysis = () => {
    if (simulationStatus === 'complete') {
      console.log('Share analysis clicked')
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-20 pointer-events-none">
      <div className="pointer-events-auto px-3 pt-3">
        <div className="flex items-start justify-between mb-4">
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

        <div className="ml-1 flex flex-col gap-3">
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
                  className="absolute top-full left-0 mt-2 w-64 max-h-64 overflow-y-auto rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg scrollbar-hide"
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
            className="ml-1 text-xs font-medium text-white/70 uppercase tracking-wider"
          >
            {selectedEventId ? 'Selected Event' : 'Event Alerts'}
          </motion.div>
        </div>
      </div>
    </div>
  )
}

