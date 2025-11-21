"use client"

import type React from "react"
import { ThemeToggle } from "./theme-toggle"
import { VoiceInput } from "./voice-input"

import { useState, useRef, useEffect } from "react"
import { useSession, signIn, signOut } from "next-auth/react"
import type { Message, AssistantResponse } from "@/types"
import { MessageBubble } from "./message-bubble"
import { EventList } from "./event-list"
import { TaskList } from "./task-list"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Send, LogOut } from "lucide-react"

export function ChatInterface() {
  const { data: session, status } = useSession()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hola! Soy tu asistente virtual de calendario y tareas. Podés crear eventos con colores, recordatorios, recurrencia y links de Meet, y también gestionar tus tareas. ¿En qué puedo ayudarte?",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [pendingEvent, setPendingEvent] = useState<any>(null)
  const [pendingTask, setPendingTask] = useState<any>(null)
  const [pendingDelete, setPendingDelete] = useState<any[]>([])
  const [pendingDeleteTasks, setPendingDeleteTasks] = useState<any[]>([])
  const [pendingEdit, setPendingEdit] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
          task: data.task,
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
            task: undefined,
            needs_confirmation: false,
            events: (data as any).events,
          },
        }
        setMessages((prev) => [...prev, eventsMessage])
      }

      if (data.intent === "list_tasks" && (data as any).tasks) {
        const tasksMessage: Message = {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: "",
          timestamp: new Date(),
          metadata: {
            intent: "list_tasks",
            event: undefined,
            task: undefined,
            needs_confirmation: false,
            tasks: (data as any).tasks,
          },
        }
        setMessages((prev) => [...prev, tasksMessage])
      }

      if (data.intent === "delete_event" && (data as any).matchingEvents) {
        const matchingEvents = (data as any).matchingEvents
        setPendingDelete(matchingEvents)
      }

      if (data.intent === "delete_task" && (data as any).matchingTasks) {
        const matchingTasks = (data as any).matchingTasks
        setPendingDeleteTasks(matchingTasks)
      }

      if (data.intent === "update_event" && (data as any).matchingEvents) {
        const matchingEvents = (data as any).matchingEvents
        const editUpdates = (data as any).editUpdates
        setPendingEdit({ events: matchingEvents, updates: editUpdates })
      }

      if (data.needs_confirmation && data.task) {
        setPendingTask(data.task)
      } else {
        setPendingTask(null)
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
          task: undefined,
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
          task: undefined,
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
          conversationHistory: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
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
          task: undefined,
          needs_confirmation: false,
        },
      }

      setMessages((prev) => [...prev, assistantMessage])
      setPendingEdit(null)
    } catch (error) {
      console.error("Error confirming edit:", error)
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

  const handleConfirmTask = async () => {
    if (!pendingTask) return

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
          confirmTask: pendingTask,
        }),
      })

      if (!response.ok) {
        throw new Error("Error confirmando la tarea")
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
          task: data.task,
          needs_confirmation: false,
        },
      }

      setMessages((prev) => [...prev, assistantMessage])
      setPendingTask(null)
    } catch (error) {
      console.error("Error confirming task:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Disculpá, hubo un error creando la tarea. Por favor intentá de nuevo.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelTask = () => {
    setPendingTask(null)
    const cancelMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: "Entendido, cancelé la creación de la tarea. ¿Hay algo más en lo que pueda ayudarte?",
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

  const handleVoiceTranscript = (transcript: string) => {
    // Simplemente reemplazar el input con el transcript completo
    // El transcript ya contiene todo el texto acumulado desde voice-input
    setInput(transcript)
  }

  const handleVoiceSubmit = (transcript: string) => {
    if (!transcript.trim()) return
    
    setInput("")
    setIsLoading(true)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: transcript,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: transcript,
        conversationHistory: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Error en la respuesta del servidor")
        return response.json() as Promise<AssistantResponse>
      })
      .then((data) => {
        console.log("Assistant response from voice:", data)

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          metadata: {
            intent: data.intent,
            event: data.event,
            task: data.task,
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
              task: undefined,
              needs_confirmation: false,
              events: (data as any).events,
            },
          }
          setMessages((prev) => [...prev, eventsMessage])
        }

        if (data.intent === "list_tasks" && (data as any).tasks) {
          const tasksMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: "",
            timestamp: new Date(),
            metadata: {
              intent: "list_tasks",
              event: undefined,
              task: undefined,
              needs_confirmation: false,
              tasks: (data as any).tasks,
            },
          }
          setMessages((prev) => [...prev, tasksMessage])
        }

        if (data.intent === "delete_event" && (data as any).matchingEvents) {
          setPendingDelete((data as any).matchingEvents)
        }

        if (data.intent === "delete_task" && (data as any).matchingTasks) {
          setPendingDeleteTasks((data as any).matchingTasks)
        }

        if (data.intent === "update_event" && (data as any).matchingEvents) {
          const matchingEvents = (data as any).matchingEvents
          const editUpdates = (data as any).editUpdates
          setPendingEdit({ events: matchingEvents, updates: editUpdates })
        }

        if (data.needs_confirmation && data.task) {
          setPendingTask(data.task)
        }

        if (data.needs_confirmation && data.event) {
          setPendingEvent(data.event)
        }
      })
      .catch((error) => {
        console.error("Error in voice submission:", error)
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Disculpá, hubo un error procesando tu solicitud por voz. Por favor intentá de nuevo.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  const handleRemoveFromDeleteTasks = (taskId: string) => {
    setPendingDeleteTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  const handleConfirmDeleteTasks = async () => {
    if (!pendingDeleteTasks || pendingDeleteTasks.length === 0) return

    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "confirmar eliminación de tareas",
          conversationHistory: messages,
          confirmDeleteTaskBatch: pendingDeleteTasks,
        }),
      })

      if (!response.ok) {
        throw new Error("Error confirmando la eliminación de tareas")
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
          task: undefined,
          needs_confirmation: false,
        },
      }

      setMessages((prev) => [...prev, assistantMessage])
      setPendingDeleteTasks([])
    } catch (error) {
      console.error("Error confirming delete tasks:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Disculpá, hubo un error eliminando la tarea. Por favor intentá de nuevo.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
      setPendingDeleteTasks([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelDeleteTasks = () => {
    setPendingDeleteTasks([])
    const cancelMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: "Entendido, no eliminé la tarea. ¿Hay algo más en lo que pueda ayudarte?",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, cancelMessage])
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b bg-card px-3 sm:px-6 py-2.5 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Título - dos líneas en móvil pero más compacto */}
          <div className="min-w-0 flex-1">
            <h1 className="text-sm leading-tight sm:text-2xl font-semibold">
              <span className="block sm:inline">Asistente Virtual</span>
              <span className="block sm:inline sm:ml-1.5">de Calendario</span>
            </h1>
          </div>
          
          {/* Controles */}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            {status === "loading" ? (
              <div className="text-xs sm:text-sm text-muted-foreground">Cargando...</div>
            ) : session ? (
              <div className="flex items-center gap-2">
                <div className="text-xs sm:text-sm min-w-0 max-w-[100px] sm:max-w-none">
                  <div className="font-medium truncate">{session.user?.name}</div>
                  <div className="text-muted-foreground text-[10px] sm:text-xs truncate">{session.user?.email}</div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => signOut()} 
                  className="h-8 w-8 sm:h-9 sm:w-auto p-0 sm:px-4"
                >
                  <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Desconectar</span>
                </Button>
              </div>
            ) : (
              <Button onClick={() => signIn("google")} size="sm" className="text-xs sm:text-sm px-3 sm:px-4">
                Conectar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            <MessageBubble message={message} />
            {message.metadata?.intent === "list_events" && (message.metadata as any).events && (
              <div className="mb-3 sm:mb-4">
                <EventList events={(message.metadata as any).events} />
              </div>
            )}
            {message.metadata?.intent === "list_tasks" && (message.metadata as any).tasks && (
              <div className="mb-3 sm:mb-4">
                <TaskList tasks={(message.metadata as any).tasks} />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start mb-3 sm:mb-4">
            <div className="bg-muted rounded-lg px-3 sm:px-4 py-2 sm:py-3">
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
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Button onClick={handleConfirmEvent} size="sm" className="w-full sm:w-auto">
              Confirmar y crear evento
            </Button>
            <Button onClick={handleCancelEvent} variant="outline" size="sm" className="w-full sm:w-auto bg-transparent">
              Cancelar
            </Button>
          </div>
        )}
        {pendingDelete.length > 0 && !isLoading && (
          <div className="mb-3 sm:mb-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 sm:p-4">
              <h3 className="font-semibold text-destructive mb-2 sm:mb-3 text-sm sm:text-base">Eventos a eliminar ({pendingDelete.length}):</h3>
              <div className="space-y-2 mb-3 sm:mb-4">
                {pendingDelete.map((event) => (
                  <div key={event.id} className="flex items-center justify-between bg-background rounded p-2 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{event.title}</div>
                      <div className="text-xs text-muted-foreground">
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
                      className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                    >
                      Quitar
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
                <Button
                  onClick={handleConfirmDelete}
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  Confirmar y eliminar {pendingDelete.length === 1 ? "evento" : "todos"}
                </Button>
                <Button
                  onClick={handleCancelDelete}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto text-xs sm:text-sm bg-transparent"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
        {pendingDeleteTasks.length > 0 && !isLoading && (
          <div className="mb-3 sm:mb-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 sm:p-4">
              <h3 className="font-semibold text-destructive mb-2 sm:mb-3 text-sm sm:text-base">
                Tareas a eliminar ({pendingDeleteTasks.length}):
              </h3>
              <div className="space-y-2 mb-3 sm:mb-4">
                {pendingDeleteTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between bg-background rounded p-2 sm:p-3 gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{task.title}</div>
                      {task.due_date && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(task.due_date + "T00:00:00").toLocaleDateString("es-AR", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                      )}
                      {task.description && (
                        <div className="text-xs text-muted-foreground truncate">{task.description}</div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFromDeleteTasks(task.id)}
                      className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                    >
                      Quitar
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3">
                <Button
                  onClick={handleConfirmDeleteTasks}
                  variant="destructive"
                  size="sm"
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  Confirmar y eliminar {pendingDeleteTasks.length === 1 ? "tarea" : "todas"}
                </Button>
                <Button
                  onClick={handleCancelDeleteTasks}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto text-xs sm:text-sm bg-transparent"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
        {pendingEdit && !isLoading && (
          <div className="mb-3 sm:mb-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 sm:p-4">
              <h3 className="font-semibold text-primary mb-2 sm:mb-3 text-sm sm:text-base">
                Seleccioná el evento a editar ({pendingEdit.events.length}):
              </h3>
              <div className="space-y-2 mb-3 sm:mb-4">
                {pendingEdit.events.map((event: any) => (
                  <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-background rounded p-2 sm:p-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{event.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(event.start).toLocaleString("es-AR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </div>
                      {event.location && <div className="text-xs text-muted-foreground">📍 {event.location}</div>}
                    </div>
                    <Button
                      onClick={() => handleConfirmEdit(event.id, event.title)}
                      size="sm"
                      className="bg-primary hover:bg-primary/90 w-full sm:w-auto text-xs sm:text-sm"
                    >
                      Editar este
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex justify-center">
                <Button onClick={handleCancelEdit} variant="outline" size="sm" className="text-xs sm:text-sm bg-transparent">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
        {pendingTask && !isLoading && (
          <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Button onClick={handleConfirmTask} size="sm" className="w-full sm:w-auto">
              Confirmar y crear tarea
            </Button>
            <Button onClick={handleCancelTask} variant="outline" size="sm" className="w-full sm:w-auto bg-transparent">
              Cancelar
            </Button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-card px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex gap-2 items-start">
          <VoiceInput 
            onTranscriptChange={handleVoiceTranscript}
            onTranscriptSubmit={handleVoiceSubmit}
            disabled={isLoading || !session}
          />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Escribí tu solicitud..."
            disabled={isLoading}
            className="flex-1 text-sm"
          />
          <Button onClick={handleSendMessage} disabled={!input.trim() || isLoading} size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
