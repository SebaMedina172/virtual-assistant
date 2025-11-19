// Tipos para los mensajes del chat
export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  metadata?: {
    intent: "create_event" | "update_event" | "delete_event" | "list_events" | "clarify" | "general" | "create_task" | "update_task" | "delete_task" | "list_tasks"
    event?: CalendarEvent
    task?: Task
    needs_confirmation: boolean
    events?: any[] // array for list_events
    tasks?: any[] // array for list_tasks
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
  color?: string // Color name or ID (1-11)
  reminders?: {
    useDefault?: boolean
    overrides?: Array<{
      method: "email" | "popup"
      minutes: number
    }>
  }
  recurrence?: string[]
  conferenceData?: {
    createMeetLink?: boolean
  }
}

// Tipos para la tarea de Google Tasks
export interface Task {
  id?: string
  title: string
  description?: string
  due_date?: string // ISO8601 date (YYYY-MM-DD)
  status?: string
  completed?: Date
  subtasks?: Task[] 
  tasklist_id?: string 
}

// Tipos para la respuesta del asistente
export interface AssistantResponse {
  intent: "create_event" | "update_event" | "delete_event" | "list_events" | "create_task" | "update_task" | "delete_task" | "list_tasks" | "clarify" | "general"
  needs_confirmation: boolean
  missing_fields?: string[]
  event?: CalendarEvent
  task?: Task
  query?: ListEventsQuery | ListTasksQuery
  deleteQuery?: DeleteEventQuery | DeleteTaskQuery
  editQuery?: EditEventQuery | EditTaskQuery
  taskQuery?: DeleteTaskQuery
  taskEditQuery?: EditTaskQuery
  matchingEvents?: Array<{
    id: string
    title: string
    start: string
    end: string
  }>
  matchingTasks?: Array<{
    id: string
    title: string
    due_date: string
  }>
  response: string
  eventCreated?: boolean
  taskCreated?: boolean
}

// Tipos para el estado de la conversación
export interface ConversationState {
  messages: Message[]
  isLoading: boolean
  error?: string
}

export interface ListEventsQuery {
  startDate?: string
  endDate?: string
  maxResults?: number
}

export interface DeleteEventQuery {
  eventId?: string
  queries?: Array<{
    title?: string
    date?: string
    timeRange?: {
      start: string
      end: string
    }
  }>
  title?: string
  date?: string
  timeRange?: {
    start: string
    end: string
  }
}

export interface EditEventQuery {
  searchCriteria: {
    title?: string
    date?: string
    timeRange?: {
      start: string
      end: string
    }
  }
  updates: Partial<CalendarEvent>
}

// Tipos para la consulta de tareas
export interface ListTasksQuery {
  startDate?: string
  endDate?: string
  maxResults?: number
}

// Tipos para la eliminación de tareas
export interface DeleteTaskQuery {
  title?: string
}

// Tipos para la edición de tareas
export interface EditTaskQuery {
  searchCriteria: {
    title?: string
  }
  updates: Partial<Task>
}
