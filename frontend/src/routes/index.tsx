import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Button } from '../components/ui/button'
import { ArrowRight, Users, DollarSign, Home, TrendingUp, Phone, PhoneOff } from 'lucide-react'
import { LandingNav } from '../components/layout/LandingNav'
import { DoughnutChart } from '../components/charts/DoughnutChart'
import { RadarChart } from '../components/charts/RadarChart'
import { BarVisualizer } from '../components/ui/bar-visualizer'
import { getEventColor } from '../lib/eventColors'

export const Route = createFileRoute('/')(({
  component: RouteComponent,
}))

function RouteComponent() {
  const navigate = useNavigate()
  const [isFadingOut, setIsFadingOut] = useState(false)

  const handleGetStarted = () => {
    setIsFadingOut(true)
    setTimeout(() => {
      navigate({ to: '/app' })
    }, 500)
  }

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isFadingOut ? 0 : 1 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="min-h-screen text-white overflow-hidden relative"
      style={{
        background: 'linear-gradient(to bottom, #000000 0%, #0a0a12 50%, #0f0f1a 100%)'
      }}
    >
      <LandingNav />
      <HeroSection onGetStarted={handleGetStarted} />
    </motion.div>
  )
}

function PulsatingDot({ severity, positivity }: { severity: number; positivity: number }) {
  const color = getEventColor(positivity, severity)
  const size = 10 + (severity * 4)

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: `${size}px`, height: `${size}px` }}>
      <div
        className="absolute inset-0 rounded-full animate-ping opacity-75"
        style={{ background: color, width: `${size}px`, height: `${size}px` }}
      />
      <div
        className="relative rounded-full"
        style={{ background: color, width: `${size}px`, height: `${size}px` }}
      />
    </div>
  )
}

function MockDataPanel({ mouseX, mouseY }: { mouseX: any; mouseY: any }) {
  const rotateX = useSpring(useTransform(mouseY, [-1, 1], [4, -4]), {
    stiffness: 100,
    damping: 30
  })
  const rotateY = useSpring(useTransform(mouseX, [-1, 1], [-4, 4]), {
    stiffness: 100,
    damping: 30
  })

  const population = 85.3
  const income = 67
  const raceData = [35, 28, 15, 12, 10]
  const radarData = [65, 72, 58, 68, 55]

  return (
    <div
      className="relative"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d'
      }}
    >
      <motion.div
        initial={{ opacity: 0, x: 40, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="w-72"
        style={{
          transformStyle: 'preserve-3d',
          rotateX,
          rotateY
        }}
      >
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="p-3 rounded-2xl backdrop-blur-xl border border-white/10 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 15, 26, 0.6) 0%, rgba(5, 5, 10, 0.8) 100%)'
            }}
          >
            <h3 className="text-xs font-medium text-white/60 mb-2">Overview</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Users className="w-3 h-3 text-white/60" />
                  <span className="text-[10px] text-white/50">Population</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  {population.toFixed(1)}k
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <DollarSign className="w-3 h-3 text-white/60" />
                  <span className="text-[10px] text-white/50">Avg Income</span>
                </div>
                <div className="text-sm font-semibold text-white">
                  ${Math.round(income)}k
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Home className="w-3 h-3 text-white/60" />
                  <span className="text-[10px] text-white/50">Affordability</span>
                </div>
                <div className="text-sm font-semibold text-white">72/100</div>
              </div>
              <div className="p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <TrendingUp className="w-3 h-3 text-white/60" />
                  <span className="text-[10px] text-white/50">Livability</span>
                </div>
                <div className="text-sm font-semibold text-white">85/100</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="p-3 rounded-2xl backdrop-blur-xl border border-white/10 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 15, 26, 0.6) 0%, rgba(5, 5, 10, 0.8) 100%)'
            }}
          >
            <h3 className="text-xs font-medium text-white/60 mb-2">Demographics</h3>
            <div className="h-32">
              <DoughnutChart
                title=""
                labels={['White', 'Black', 'Asian', 'Mixed', 'Hispanic']}
                data={raceData}
                backgroundColor={['#737373', '#525252', '#a3a3a3', '#d4d4d4', '#e5e5e5']}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0.7 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="p-3 rounded-2xl backdrop-blur-xl border border-white/10 shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 15, 26, 0.6) 0%, rgba(5, 5, 10, 0.8) 100%)'
            }}
          >
            <h3 className="text-xs font-medium text-white/60 mb-2">Urban Profile</h3>
            <div className="h-40">
              <RadarChart
                labels={['Education', 'Diversity', 'Affordability', 'Density', 'Income']}
                data={radarData}
                fillColor="rgba(163, 163, 163, 0.2)"
                borderColor="rgba(163, 163, 163, 0.8)"
              />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

function MockEventPanel({ mouseX, mouseY }: { mouseX: any; mouseY: any }) {
  const rotateX = useSpring(useTransform(mouseY, [-1, 1], [3, -3]), {
    stiffness: 100,
    damping: 30
  })
  const rotateY = useSpring(useTransform(mouseX, [-1, 1], [-3, 3]), {
    stiffness: 100,
    damping: 30
  })

  const mockEvents = [
    {
      id: '1',
      title: 'Traffic Congestion Reduced',
      zoneName: 'Downtown',
      description: 'New transit lanes have decreased traffic by 15% in the downtown area.',
      type: 'transportation',
      severity: 0.6,
      positivity: 0.7,
    },
    {
      id: '2',
      title: 'Housing Costs Rising',
      zoneName: 'Midtown',
      description: 'Median home values increased 8% following new development.',
      type: 'housing',
      severity: 0.5,
      positivity: -0.3,
    },
    {
      id: '3',
      title: 'Green Space Expansion',
      zoneName: 'East Atlanta',
      description: 'New park opens, improving community livability scores.',
      type: 'environmental',
      severity: 0.4,
      positivity: 0.8,
    },
  ]

  return (
    <div
      className="relative"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d'
      }}
    >
      <motion.div
        initial={{ opacity: 0, x: -40, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.8, delay: 0.7, ease: [0.4, 0, 0.2, 1] }}
        className="w-72"
        style={{
          transformStyle: 'preserve-3d',
          rotateX,
          rotateY
        }}
      >
        <div className="mb-3 ml-1 text-sm font-medium text-white/70 uppercase tracking-wider">
          Event Alerts
        </div>
        <div className="space-y-2">
          {mockEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
              className="p-3 rounded-2xl backdrop-blur-xl border border-white/10 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 15, 26, 0.6) 0%, rgba(5, 5, 10, 0.8) 100%)'
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <TrendingUp className="w-4 h-4 shrink-0 text-white/90" />
                <PulsatingDot severity={event.severity} positivity={event.positivity} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-white leading-tight">
                  {event.title}
                </div>
                <div className="text-xs text-white/60 mt-0.5">
                  {event.zoneName}
                </div>
                <p className="text-xs text-white/80 mt-1 leading-tight line-clamp-2">
                  {event.description}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
                    {event.type}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

function MockCallPanel({ mouseX, mouseY }: { mouseX: any; mouseY: any }) {
  const rotateX = useSpring(useTransform(mouseY, [-1, 1], [6, -6]), {
    stiffness: 100,
    damping: 30
  })
  const rotateY = useSpring(useTransform(mouseX, [-1, 1], [-6, 6]), {
    stiffness: 100,
    damping: 30
  })

  return (
    <div
      className="relative"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d'
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.9, ease: [0.4, 0, 0.2, 1] }}
        className="w-72"
        style={{
          transformStyle: 'preserve-3d',
          rotateX,
          rotateY
        }}
      >
        <div className="rounded-2xl border border-white/10 p-4 shadow-2xl backdrop-blur-xl flex flex-col gap-3" style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 26, 0.6) 0%, rgba(5, 5, 10, 0.8) 100%)'
        }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10">
              <Phone className="w-5 h-5 text-white/90" />
            </div>
            <h2 className="text-base font-semibold text-white/90">Sarah Johnson</h2>
          </div>

          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-white/70">
              Local resident concerned about traffic changes in their neighborhood
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button className="flex items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-2.5 text-sm font-medium text-red-200 w-full">
              <PhoneOff className="h-4 w-4" />
              End Call
            </button>
            <BarVisualizer
              state="speaking"
              barCount={16}
              demo={true}
              className="h-12 rounded-xl bg-transparent w-full"
            />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function HeroSection({ onGetStarted }: { onGetStarted: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const [typedText, setTypedText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [loopIndex, setLoopIndex] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)

  const phrases = [
    'Implement congestion pricing in downtown with $15 peak-hour tolls',
  ]

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setHasStarted(true)
    }, 2000)

    return () => clearTimeout(startTimer)
  }, [])

  const rotateX = useSpring(useTransform(mouseY, [-1, 1], [8, -8]), {
    stiffness: 100,
    damping: 30
  })
  const rotateY = useSpring(useTransform(mouseX, [-1, 1], [-8, 8]), {
    stiffness: 100,
    damping: 30
  })

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!cardRef.current) return

      const rect = cardRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const mouseXPos = event.clientX - centerX
      const mouseYPos = event.clientY - centerY

      mouseX.set(mouseXPos / (rect.width / 2))
      mouseY.set(mouseYPos / (rect.height / 2))
    }

    window.addEventListener('mousemove', handleMouseMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [mouseX, mouseY])

  useEffect(() => {
    if (!hasStarted) return

    const currentPhrase = phrases[loopIndex]
    const typingSpeed = isDeleting ? 30 : 80
    const pauseBeforeDelete = 2000
    const pauseBeforeType = 2000

    let timer: NodeJS.Timeout

    if (!isDeleting && typedText === currentPhrase) {
      timer = setTimeout(() => setIsDeleting(true), pauseBeforeDelete)
    } else if (isDeleting && typedText === '') {
      timer = setTimeout(() => {
        setIsDeleting(false)
        setLoopIndex((prev) => (prev + 1) % phrases.length)
      }, pauseBeforeType)
    } else {
      timer = setTimeout(() => {
        if (isDeleting) {
          setTypedText(currentPhrase.substring(0, typedText.length - 1))
        } else {
          setTypedText(currentPhrase.substring(0, typedText.length + 1))
        }
      }, typingSpeed)
    }

    return () => clearTimeout(timer)
  }, [typedText, isDeleting, loopIndex, hasStarted, phrases])

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 530)

    return () => clearInterval(cursorInterval)
  }, [])

  return (
    <section className="relative z-10 min-h-screen px-16 sm:px-20 lg:px-24 pt-32">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative">
          <div className="text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight mb-6 leading-[1.1]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Simulate city policies
                <br />
                <span className="font-normal text-4xl sm:text-5xl lg:text-6xl">with AI-powered insights</span>
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
            >
              <p className="text-xl sm:text-2xl text-white/70 mb-8 font-light" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Visualize the impact of urban planning decisions on cities
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <p className="text-base sm:text-lg text-white/60 mb-12 font-light leading-relaxed" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Explore how policy changes affect neighborhoods, traffic, housing, and economic metrics in real-time.
                Make data-driven decisions for better cities.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <Button
                onClick={onGetStarted}
                size="lg"
                className="bg-white text-dark hover:bg-white/90 hover:scale-105 text-base px-8 py-6 rounded-lg font-medium transition-all duration-200"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>

          <div
            ref={cardRef}
            className="-mt-16 relative"
            style={{
              perspective: '1300px',
              transformStyle: 'preserve-3d'
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="relative rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #0f0f1a 0%, #05050a 100%)',
                boxShadow: '0 25px 70px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                transformStyle: 'preserve-3d',
                rotateX,
                rotateY,
                translateZ: 100
              }}
            >
              <div className="border-b border-white/10 relative">
                <div className="min-h-[60px] px-4 py-4 text-white text-sm relative">
                  {typedText === '' ? (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6 }}
                      className="text-white/50"
                    >
                      Describe a policy to simulate...
                    </motion.span>
                  ) : (
                    <span>
                      {typedText.split('').map((char, index) => (
                        <motion.span
                          key={`${loopIndex}-${index}`}
                          initial={{ filter: 'blur(4px)', opacity: 0.5 }}
                          animate={{ filter: 'blur(0px)', opacity: 1 }}
                          transition={{ duration: 0.15 }}
                          style={{ display: 'inline-block' }}
                        >
                          {char === ' ' ? '\u00A0' : char}
                        </motion.span>
                      ))}
                    </span>
                  )}
                  {typedText !== '' && (
                    <span className={`inline-block w-0.5 h-4 bg-white ml-0.5 ${showCursor ? 'opacity-100' : 'opacity-0'}`} style={{ transition: 'opacity 0.1s' }} />
                  )}
                </div>
              </div>
              <div className="px-4 py-4">
                <p className="text-sm text-white/60 mb-2 font-medium">Summary</p>
                <p className="text-base text-white/90 leading-relaxed">
                  This policy reduces downtown traffic congestion by 23% during peak hours while increasing public transit ridership by 18%.
                  Annual revenue of $12M supports transit improvements, and air quality improves by 15% in affected zones.
                  Average commute times decrease by 8 minutes for remaining drivers.
                </p>
              </div>
            </motion.div>

            <div className="absolute -top-40 -left-20 z-20 pointer-events-none" style={{ transform: 'translateZ(-50px)', transformStyle: 'preserve-3d' }}>
              <MockEventPanel mouseX={mouseX} mouseY={mouseY} />
            </div>

            <div className="absolute -bottom-42 -right-20 z-20 pointer-events-none" style={{ transform: 'translateZ(-50px)', transformStyle: 'preserve-3d' }}>
              <MockDataPanel mouseX={mouseX} mouseY={mouseY} />
            </div>

            <div className="absolute -bottom-60 left-48 z-20 pointer-events-none" style={{ transform: 'translateZ(0px)', transformStyle: 'preserve-3d' }}>
              <MockCallPanel mouseX={mouseX} mouseY={mouseY} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
