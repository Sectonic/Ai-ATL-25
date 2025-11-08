import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'

export function LandingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-16 sm:px-20 lg:px-24 py-2">
        <div className="flex items-center justify-between h-16">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
            className="flex items-center gap-2"
          >
            <Link to="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <img src="/mimic_logo.png" alt="Mimic Logo" className="w-14 h-14" />
              <h1 className="text-2xl font-light text-white/85 uppercase">Mimic</h1>
            </Link>
          </motion.div>
        </div>
      </div>
    </nav>
  )
}

