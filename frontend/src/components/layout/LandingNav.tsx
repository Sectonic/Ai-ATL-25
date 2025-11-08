import { Link } from '@tanstack/react-router'

export function LandingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-16 sm:px-20 lg:px-24">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src="/mimic_logo.png" alt="Mimic" className="w-8 h-8" />
            <span className="text-xl font-light text-white">Mimic</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}

