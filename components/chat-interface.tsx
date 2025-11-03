"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import type { Message, AssistantResponse } from "@/types"
import { MessageBubble } from "./message-bubble"
import { EventList } from "./event-list"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Mic, Send, LogOut } from "lucide-react"

export function ChatInterface() {
  const { data: session, status } = useSession()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hola! Soy tu asistente virtual de calendario. Podés crear eventos con colores, recordatorios, recurrencia y links de Meet. ¿En qué puedo ayudarte?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [pendingEvent, setPendingEvent] = useState<any>(null)
  const [pendingDelete, setPendingDelete] = useState<any[]>([])
  const [pendingEdit, setPendingEdit] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor")
      }

      const data: AssistantResponse = await response.json()

      console.log("Assistant response:", data)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        metadata: {
          intent: data.intent,
          event: data.event,
          needs_confirmation: data.needs_confirmation,
        },
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (data.intent === "list_events" && (data as any).events) {
        const eventsMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: "",
          timestamp: new Date(),
          metadata: {
            intent: "list_events",
            event: undefined,
            needs_confirmation: false,
            events: (data as any).events,
          },
        }
        setMessages((prev) => [...prev, eventsMessage])
      }

      if (data.intent === "delete_event" && (data as any).matchingEvents) {
        const matchingEvents = (data as any).matchingEvents
        setPendingDelete(matchingEvents)
      }

      if (data.intent === "update_event" && (data as any).matchingEvents) {
        const matchingEvents = (data as any).matchingEvents
        const editUpdates = (data as any).editUpdates
        setPendingEdit({ events: matchingEvents, updates: editUpdates })
      }

      if (data.needs_confirmation && data.event) {
        setPendingEvent(data.event)
      } else {
        setPendingEvent(null)
      }
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Disculpá, hubo un error procesando tu mensaje. Por favor intentá de nuevo.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmEvent = async () => {
    if (!pendingEvent) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "confirmar",
          conversationHistory: messages,
          confirmEvent: pendingEvent,
        }),
      })

      if (!response.ok) {
        throw new Error("Error confirmando el evento")
      }

      const data: AssistantResponse = await response.json()

      let responseContent = data.response
      if (data.event && (data.event as any).meetLink) {
        responseContent += `\n\n🔗 Link de Meet: ${(data.event as any).meetLink}`
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
        metadata: {
          intent: data.intent,
          event: data.event,
          needs_confirmation: false,
        },
      }

      setMessages((prev) => [...prev, assistantMessage])
      setPendingEvent(null)
    } catch (error) {
      console.error("Error confirming event:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Disculpá, hubo un error creando el evento. Por favor intentá de nuevo.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEvent = () => {
    setPendingEvent(null)
    const cancelMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: "Entendido, cancelé la creación del evento. ¿Hay algo más en lo que pueda ayudarte?",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, cancelMessage])
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete || pendingDelete.length === 0) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "confirmar eliminación",
          conversationHistory: messages,
          confirmDeleteBatch: pendingDelete,
        }),
      })

      if (!response.ok) {
        throw new Error("Error confirmando la eliminación")
      }

      const data: AssistantResponse = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        metadata: {
          intent: data.intent,
          event: undefined,
          needs_confirmation: false,
        },
      }

      setMessages((prev) => [...prev, assistantMessage])
      setPendingDelete([])
    } catch (error) {
      console.error("Error confirming delete:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Disculpá, hubo un error eliminando el evento. Por favor intentá de nuevo.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setPendingDelete([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelDelete = () => {
    setPendingDelete([])
    const cancelMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: "Entendido, no eliminé el evento. ¿Hay algo más en lo que pueda ayudarte?",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, cancelMessage])
  }

  const handleRemoveFromDelete = (eventId: string) => {
    setPendingDelete((prev) => prev.filter((e) => e.id !== eventId))
  }

  const handleConfirmEdit = async (eventId: string, eventTitle: string) => {
    if (!pendingEdit) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "confirmar edición",
          conversationHistory: messages,
          confirmEdit: {
            eventId,
            eventTitle,
            updates: pendingEdit.updates,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Error confirmando la edición")
      }

      const data: AssistantResponse = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        metadata: {
          intent: data.intent,
          event: undefined,
          needs_confirmation: false,
        },
      }

      setMessages((prev) => [...prev, assistantMessage])
      setPendingEdit(null)
    } catch (error) {
      console.error("[v0] Error confirming edit:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Disculpá, hubo un error editando el evento. Por favor intentá de nuevo.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setPendingEdit(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setPendingEdit(null)
    const cancelMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: "Entendido, no edité ningún evento. ¿Hay algo más en lo que pueda ayudarte?",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, cancelMessage])
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-balance">Asistente Virtual de Calendario</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestioná tus eventos con lenguaje natural</p>
          </div>
          <div className="flex items-center gap-3">
            {status === "loading" ? (
              <div className="text-sm text-muted-foreground">Cargando...</div>
            ) : session ? (
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <div className="font-medium">{session.user?.name}</div>
                  <div className="text-muted-foreground text-xs">{session.user?.email}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Desconectar
                </Button>
              </div>
            ) : (
              <Button onClick={() => signIn("google")} size="sm">
                Conectar Google Calendar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.map((message) => (
          <div key={message.id}>
            <MessageBubble message={message} />
            {message.metadata?.intent === "list_events" && (message.metadata as any).events && (
              <div className="mb-4">
                <EventList events={(message.metadata as any).events} />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="bg-muted rounded-lg px-4 py-3">
              <div className="flex gap-1">
                <span
                  className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}
        {pendingEvent && !isLoading && (
          <div className="flex justify-center gap-3 mb-4">
            <Button onClick={handleConfirmEvent} size="sm">
              Confirmar y crear evento
            </Button>
            <Button onClick={handleCancelEvent} variant="outline" size="sm">
              Cancelar
            </Button>
          </div>
        )}
        {pendingDelete.length > 0 && !isLoading && (
          <div className="mb-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <h3 className="font-semibold text-destructive mb-3">Eventos a eliminar ({pendingDelete.length}):</h3>
              <div className="space-y-2 mb-4">
                {pendingDelete.map((event) => (
                  <div key={event.id} className="flex items-center justify-between bg-background rounded p-2">
                    <div className="flex-1">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(event.start).toLocaleString("es-AR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFromDelete(event.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Quitar
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-3">
                <Button onClick={handleConfirmDelete} variant="destructive" size="sm">
                  Confirmar y eliminar {pendingDelete.length === 1 ? "evento" : "todos"}
                </Button>
                <Button onClick={handleCancelDelete} variant="outline" size="sm">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
        {pendingEdit && !isLoading && (
          <div className="mb-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <h3 className="font-semibold text-primary mb-3">
                Seleccioná el evento a editar ({pendingEdit.events.length}):
              </h3>
              <div className="space-y-2 mb-4">
                {pendingEdit.events.map((event: any) => (
                  <div key={event.id} className="flex items-center justify-between bg-background rounded p-3">
                    <div className="flex-1">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(event.start).toLocaleString("es-AR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </div>
                      {event.location && <div className="text-sm text-muted-foreground">📍 {event.location}</div>}
                    </div>
                    <Button
                      onClick={() => handleConfirmEdit(event.id, event.title)}
                      size="sm"
                      className="bg-primary hover:bg-primary/90"
                    >
                      Editar este
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-center">
                <Button onClick={handleCancelEdit} variant="outline" size="sm">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-card px-6 py-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 bg-transparent"
            disabled
            title="Grabación de voz (próximamente)"
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Escribí tu solicitud... (ej: 'Agéndame reunión mañana a las 10')"
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!input.trim() || isLoading} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Presioná Enter para enviar</p>
      </div>
    </div>
  )
}
