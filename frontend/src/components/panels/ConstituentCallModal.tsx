import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Phone, PhoneOff } from 'lucide-react'
import { useConversation } from '@elevenlabs/react'
import { BarVisualizer, type AgentState } from '@/components/ui/bar-visualizer'
import { useAgentData } from '@/services/agentsApi'

interface ConstituentCallModalProps {
  constituentName: string | null
  onClose: () => void
  isOpen: boolean
}

export function ConstituentCallModal({
  constituentName,
  onClose,
  isOpen,
}: ConstituentCallModalProps) {
  const [error, setError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Load agent data using React Query
  const { data: agentData, isLoading, error: queryError } = useAgentData(constituentName)

  // ElevenLabs conversation hook
  // Note: Using public agents with agentId. For production, consider using
  // authenticated agents with signedUrl from your backend for better security.
  const conversation = useConversation({
    onConnect: () => console.log('Connected to ElevenLabs'),
    onDisconnect: () => console.log('Disconnected from ElevenLabs'),
    onError: (error) => {
      console.error('ElevenLabs error:', error)
      setError('Failed to connect to voice agent')
    },
  })

  // Map ElevenLabs status to BarVisualizer state
  const getVisualizerState = (): AgentState | undefined => {
    switch (conversation.status) {
      case 'connected':
        if (conversation.isSpeaking) return 'speaking'
        return 'listening'
      default:
        return undefined
    }
  }

  // Handle call start
  const handleStartCall = async () => {
    if (!agentData?.agent_id) return

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true })

      // Start the conversation session
      await conversation.startSession({
        agentId: agentData.agent_id,
        connectionType: 'webrtc',
      })
    } catch (err) {
      console.error('Failed to start call:', err)
      setError('Failed to start call. Please check microphone permissions.')
    }
  }

  // Handle call end
  const handleEndCall = async () => {
    try {
      await conversation.endSession()
    } catch (err) {
      console.error('Failed to end call:', err)
    }
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        if (conversation.status === 'connected') {
          handleEndCall()
        }
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, conversation.status, onClose])

  // Handle back button and cleanup on unmount
  const handleClose = () => {
    if (conversation.status === 'connected') {
      handleEndCall()
    }
    onClose()
  }

  if (!isOpen || !constituentName) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="fixed left-[calc(22%+2rem)] top-[80px] w-[400px] h-[600px] bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 z-50"
      >
        {/* Header with back button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <h2 className="text-lg font-semibold text-white/90">Voice Call</h2>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col gap-6">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-white/70">Loading agent data...</div>
            </div>
          ) : error || queryError ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-red-400">{error || (queryError as Error)?.message || 'An error occurred'}</div>
            </div>
          ) : !agentData ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-white/70">Agent not found</div>
            </div>
          ) : (
            <>
              {/* Constituent Info */}
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-white/90">
                  {constituentName}
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  {agentData?.description}
                </p>
              </div>

              {/* Call Button */}
              <div className="flex justify-center">
                {conversation.status === 'connected' ? (
                  <button
                    onClick={handleEndCall}
                    className="flex items-center gap-2 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl border border-red-500/30 transition-colors"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span className="font-medium">End Call</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartCall}
                    disabled={conversation.status === 'connecting' || !agentData}
                    className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white/90 rounded-xl border border-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Phone className="w-5 h-5" />
                    <span className="font-medium">
                      {conversation.status === 'connecting' ? 'Connecting...' : 'Start Call'}
                    </span>
                  </button>
                )}
              </div>

              {/* Bar Visualizer */}
              <div className="flex-1 flex items-end">
                <BarVisualizer
                  state={getVisualizerState()}
                  barCount={15}
                  demo={conversation.status === 'connected'}
                  className="w-full bg-white/5 border-white/10"
                />
              </div>

              {/* Call Status */}
              {conversation.status === 'connected' && (
                <div className="text-center">
                  <p className="text-sm text-white/60">
                    {conversation.isSpeaking ? 'Agent is speaking...' : 'Listening...'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
