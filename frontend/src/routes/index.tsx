import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { Button } from '../components/ui/button'
import { Textarea } from '../components/ui/textarea'
import { ArrowRight } from 'lucide-react'
import { LandingNav } from '../components/layout/LandingNav'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

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
        background: 'linear-gradient(to bottom, #000000 0%, #1a1a20 100%)'
      }}
    >
      <LandingNav />
      <HeroSection onGetStarted={handleGetStarted} />
    </motion.div>
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
    'How will congestion pricing affect Atlanta?',
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
  }, [])

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
  }, [typedText, isDeleting, loopIndex, hasStarted])

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 530)

    return () => clearInterval(cursorInterval)
  }, [])

  return (
    <section className="relative z-10 min-h-screen px-16 sm:px-20 lg:px-24 pt-32">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
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
                Visualize the impact of urban planning decisions on Atlanta
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <p className="text-base sm:text-lg text-white/60 mb-12 font-light leading-relaxed" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Explore how policy changes affect neighborhoods, traffic, housing, and economic metrics in real-time.
                Make data-driven decisions for a better Atlanta.
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
                className="bg-white text-[#020202] hover:bg-white/90 hover:scale-105 text-base px-8 py-6 rounded-lg font-medium transition-all duration-200"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </div>

          <div
            ref={cardRef}
            className="relative"
            style={{
              perspective: '1200px',
              transformStyle: 'preserve-3d'
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="relative rounded-2xl overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
                boxShadow: '0 25px 70px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                transformStyle: 'preserve-3d',
                rotateX,
                rotateY
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
                      type in a city policy.
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
                <p className="text-sm text-white/60 mb-2 font-medium">Simulation Results</p>
                <p className="text-base text-white/90 leading-relaxed">
                  Implementing congestion pricing in downtown Atlanta would reduce traffic by 23% and increase public transit ridership by 18%.
                  The policy would generate $12M annually in revenue while improving air quality by 15% in affected zones.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

