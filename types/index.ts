// Tipos para los mensajes del chat
export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  metadata?: {
    intent: "create_event" | "update_event" | "delete_event" | "list_events" | "clarify" | "general"
    event?: CalendarEvent
    needs_confirmation: boolean
  }
}

export interface CalendarEvent {
  id?: string
  title: string
  description?: string
  location?: string
  start_time: string // ISO8601 datetime
  end_time: string // ISO8601 datetime
  attendees?: string[]
}

// Tipos para la respuesta del asistente
export interface AssistantResponse {
  intent: "create_event" | "update_event" | "delete_event" | "list_events" | "clarify" | "general"
  needs_confirmation: boolean
  missing_fields?: string[]
  event?: CalendarEvent
  response: string
  eventCreated?: boolean
}

// Tipos para el estado de la conversación
export interface ConversationState {
  messages: Message[]
  isLoading: boolean
  error?: string
}
