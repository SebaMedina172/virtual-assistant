'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/button'
import { Mic, Square } from 'lucide-react'

interface VoiceInputProps {
  onTranscriptChange: (transcript: string) => void
  onTranscriptSubmit: (transcript: string) => void
  disabled?: boolean
}

export function VoiceInput({ onTranscriptChange, onTranscriptSubmit, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const accumulatedTranscriptRef = useRef('')
  const isUserAbortingRef = useRef(false)
  const isInitializedRef = useRef(false)

  useEffect(() => {
    if (isInitializedRef.current) return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (!SpeechRecognition) {
      //console.error('Web Speech API not supported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'es-ES'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      clearSilenceTimeout()
    }

    recognition.onresult = (event: any) => {
      clearSilenceTimeout()
      
      let finalTranscript = ''
      let interimTranscript = ''
      let hasFinalResult = false

      // Reconstruir TODO desde cero (event.results contiene TODOS los resultados)
      for (let i = 0; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript

        if (event.results[i].isFinal) {
          finalTranscript += transcriptSegment + ' '
          if (i >= event.resultIndex) {
            hasFinalResult = true
          }
        } else {
          interimTranscript += transcriptSegment
        }
      }

      // El transcript completo es: finales + interinos
      const fullTranscript = (finalTranscript + interimTranscript).trim()
      onTranscriptChange(fullTranscript)

      // Guardar solo los resultados finales para el submit
      if (hasFinalResult) {
        accumulatedTranscriptRef.current = finalTranscript.trim()
        
        silenceTimeoutRef.current = setTimeout(() => {
          const finalText = accumulatedTranscriptRef.current
          if (finalText && !isUserAbortingRef.current) {
            handleStop()
            onTranscriptSubmit(finalText)
          }
        }, 3000)
      }
    }

    recognition.onerror = (event: any) => {
      //console.error('Speech recognition error:', event.error)

      if (event.error === 'network') {
        handleStop()
      }
      // Ignore: no-speech, audio-capture, aborted
    }

    recognition.onend = () => {
      setIsListening(false)
      // This prevents the infinite abort/restart loop
    }

    recognitionRef.current = recognition
    isInitializedRef.current = true

    return () => {
      clearSilenceTimeout()
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (error) {
          //console.log('Error aborting recognition during cleanup:', error)
        }
      }
    }
  }, [onTranscriptChange, onTranscriptSubmit])

  const clearSilenceTimeout = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
  }

  const handleStart = () => {
    if (!recognitionRef.current) {
      return
    }

    if (isListening) {
      return
    }

    isUserAbortingRef.current = false
    accumulatedTranscriptRef.current = ''
    clearSilenceTimeout()

    try {
      recognitionRef.current.start()
    } catch (error: any) {
      //console.log('Error starting recognition:', error.message)
      if (!error.message.includes('already started')) {
        setIsListening(false)
      }
    }
  }

  const handleStop = () => {
    if (!recognitionRef.current) return

    isUserAbortingRef.current = true
    clearSilenceTimeout()

    try {
      recognitionRef.current.abort()
    } catch (error) {
      //console.log('Error stopping recognition:', error)
    }

    setIsListening(false)
  }

  const handleToggle = () => {
    if (isListening) {
      handleStop()
    } else {
      handleStart()
    }
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={disabled}
      variant={isListening ? 'destructive' : 'outline'}
      size="icon"
      className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 relative"
      title={isListening ? 'Detener grabación' : 'Iniciar grabación de voz'}
    >
      {isListening ? (
        <>
          <Square className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
          <span className="absolute inset-0 rounded-md animate-pulse bg-destructive/50"></span>
        </>
      ) : (
        <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      )}
    </Button>
  )
}