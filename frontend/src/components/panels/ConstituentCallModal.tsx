import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Phone, PhoneOff } from 'lucide-react'
import { useConversation } from '@elevenlabs/react'
import { BarVisualizer, type AgentState } from '@/components/ui/bar-visualizer'
import { useAgentData } from '@/services/agentsApi'
import type { EventNotification } from '@/stores/simulationStore'

interface ConstituentCallModalProps {
  constituentName: string | null
  onClose: () => void
  isOpen: boolean
  event?: EventNotification | null
  constituentMessage?: string | null
}

export function ConstituentCallModal({
  constituentName,
  onClose,
  isOpen,
  event,
  constituentMessage,
}: ConstituentCallModalProps) {
  const [error, setError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const { data: agentData, isLoading, error: queryError } = useAgentData(constituentName)

  const conversation = useConversation({
    onConnect: () => console.log('Connected to ElevenLabs'),
    onDisconnect: () => console.log('Disconnected from ElevenLabs'),
    onError: (err) => {
      console.error('ElevenLabs error:', err)
      setError('Failed to connect to voice agent')
    },
  })

  const getVisualizerState = (): AgentState | undefined => {
    if (conversation.status !== 'connected') return undefined
    return conversation.isSpeaking ? 'speaking' : 'listening'
  }

  const handleStartCall = async () => {
    if (!agentData?.agent_id) return

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      
      const sessionConfig: any = {
        agentId: agentData.agent_id,
        connectionType: 'webrtc',
      }

      if (event && constituentMessage && agentData.agent_prompt) {
        const additionalContext = `\n\nADDITIONAL CONTEXT FOR THIS CONVERSATION:\nYou are speaking with the person who enacted the policy that caused this event.\n\nEVENT DETAILS:\n- Title: ${event.title}\n- Location: ${event.zoneName}\n- Description: ${event.description}\n- Type: ${event.type}\n- Severity: ${event.severity.toFixed(2)} (0-1 scale)\n- Positivity: ${event.positivity.toFixed(2)} (-1 to 1 scale)\n\nYOUR PREVIOUS RESPONSE:\nYou previously said: "${constituentMessage}"\n\nIMPORTANT:\nThe person you're speaking with is the one who enacted this policy. Reference your previous response and discuss the event naturally while staying true to your character and personality.`
        
        const combinedPrompt = `${agentData.agent_prompt}${additionalContext}`
        
        sessionConfig.overrideAgentConfig = {
          prompt: {
            prompt: combinedPrompt,
          },
        }
      }

      if (agentData.gender === 'female') {
        if (!sessionConfig.overrideAgentConfig) {
          sessionConfig.overrideAgentConfig = {}
        }
        if (!sessionConfig.overrideAgentConfig.tts) {
          sessionConfig.overrideAgentConfig.tts = {}
        }
        sessionConfig.overrideAgentConfig.tts.voice_id = 'iNwc1Lv2YQLywnCvjfn1'
      }

      await conversation.startSession(sessionConfig)
    } catch (err) {
      console.error('Failed to start call:', err)
      setError('Failed to start call. Please check microphone permissions.')
    }
  }

  const handleEndCall = useCallback(async () => {
    try {
      await conversation.endSession()
    } catch (err) {
      console.error('Failed to end call:', err)
    }
  }, [conversation])

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
  }, [isOpen, conversation.status, onClose, handleEndCall])

  const handleClose = () => {
    if (conversation.status === 'connected') {
      handleEndCall()
    }
    onClose()
  }

  const renderCallButton = () => {
    if (conversation.status === 'connected') {
      return (
        <button
          onClick={handleEndCall}
          className="flex items-center justify-center gap-2 rounded-xl border border-red-400/40 bg-red-500/15 px-4 py-2.5 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/25 w-full"
        >
          <PhoneOff className="h-4 w-4" />
          End Call
        </button>
      )
    }

    return (
      <button
        onClick={handleStartCall}
        disabled={conversation.status === 'connecting' || !agentData}
        className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/15 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 w-full"
      >
        <Phone className="h-4 w-4" />
        {conversation.status === 'connecting' ? 'Connecting...' : 'Start Call'}
      </button>
    )
  }

  return (
    <AnimatePresence>
      {isOpen && constituentName && (
        <motion.div
          key="constituent-call-modal"
          ref={modalRef}
          initial={{ opacity: 0, x: 12, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 12, scale: 0.96 }}
          transition={{
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="fixed left-[calc(22%+1.5rem)] top-[290px] w-[280px] max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-xl z-40 flex flex-col gap-3"
        >
        <div className="flex items-center gap-3">
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10"
            aria-label="Close modal"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base font-semibold text-white/90">{constituentName}</h2>
        </div>

        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-white/70">Loading agent data...</div>
          ) : error || queryError ? (
            <div className="flex items-center justify-center py-8 text-sm text-red-400">
              {error || (queryError as Error)?.message || 'An error occurred'}
            </div>
          ) : !agentData ? (
            <div className="flex items-center justify-center py-8 text-sm text-white/70">Agent not found</div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="space-y-2">
                <p className="text-sm leading-relaxed text-white/70 line-clamp-4">{agentData.description}</p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="w-full">{renderCallButton()}</div>
                <BarVisualizer
                  state={getVisualizerState()}
                  barCount={16}
                  demo={conversation.status === 'connected'}
                  className={`h-12 rounded-xl bg-transparent w-full transition-opacity ${
                    conversation.status === 'connected' ? 'opacity-100' : 'opacity-30'
                  }`}
                />
              </div>
            </div>
          )}
        </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
