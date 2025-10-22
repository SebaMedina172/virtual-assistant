// Tipos para los mensajes del chat
export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  metadata?: {
    intent: "create_event" | "update_event" | "delete_event" | "list_events" | "clarify"
    event?: CalendarEvent
    needs_confirmation: boolean
  }
}

// Tipos para los eventos de calendario
export interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: string // ISO8601 datetime
  end: string // ISO8601 datetime
  attendees?: string[]
}

// Tipos para la respuesta del asistente
export interface AssistantResponse {
  intent: "create_event" | "update_event" | "delete_event" | "list_events" | "clarify"
  needs_confirmation: boolean
  missing_fields?: string[]
  event?: CalendarEvent
  response: string
}

// Tipos para el estado de la conversación
export interface ConversationState {
  messages: Message[]
  isLoading: boolean
  error?: string
}
