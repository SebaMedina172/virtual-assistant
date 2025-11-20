"use client"

import { CheckCircle2, Calendar, AlertCircle } from 'lucide-react'
import { Card } from "./ui/card"

interface Task {
  id?: string
  title: string
  description?: string
  due_date?: string
  status?: string
  completed?: Date
}

interface TaskListProps {
  tasks: Task[]
}

function formatDate(dateString?: string): string {
  if (!dateString) return "Sin fecha"
  
  // Parse as UTC date to avoid timezone shifts
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC" // Force UTC to prevent timezone conversion
  })
}

function getTaskPriority(dueDate?: string): "overdue" | "today" | "upcoming" | "no-date" {
  if (!dueDate) return "no-date"
  
  // Get today in UTC to match how dates are stored
  const today = new Date()
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  
  // Parse task date as UTC
  const [year, month, day] = dueDate.split('-').map(Number)
  const taskDateUTC = Date.UTC(year, month - 1, day)
  
  const diff = taskDateUTC - todayUTC
  const days = diff / (1000 * 60 * 60 * 24)
  
  if (days < 0) return "overdue"
  if (days === 0) return "today"
  return "upcoming"
}

export function TaskList({ tasks }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <Card className="p-3 sm:p-6 text-center">
        <CheckCircle2 className="h-8 sm:h-12 w-8 sm:w-12 mx-auto mb-2 sm:mb-3 text-muted-foreground" />
        <p className="text-xs sm:text-base text-muted-foreground">No hay tareas</p>
      </Card>
    )
  }

  // Group tasks by priority/date
  const tasksByPriority = {
    overdue: tasks.filter((t) => getTaskPriority(t.due_date) === "overdue"),
    today: tasks.filter((t) => getTaskPriority(t.due_date) === "today"),
    upcoming: tasks.filter((t) => getTaskPriority(t.due_date) === "upcoming"),
    "no-date": tasks.filter((t) => getTaskPriority(t.due_date) === "no-date"),
  }

  const priorityGroups = [
    { key: "overdue", label: "Vencidas", color: "destructive", tasks: tasksByPriority.overdue },
    { key: "today", label: "Para hoy", color: "primary", tasks: tasksByPriority.today },
    { key: "upcoming", label: "Próximamente", color: "muted", tasks: tasksByPriority.upcoming },
    { key: "no-date", label: "Sin fecha", color: "muted", tasks: tasksByPriority["no-date"] },
  ]

  const activePriorityGroups = priorityGroups.filter((group) => group.tasks.length > 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      {activePriorityGroups.map((group) => (
        <div key={group.key}>
          <h3 className="font-semibold text-sm sm:text-lg mb-2 sm:mb-3 flex items-center gap-2">
            {group.key === "overdue" && <AlertCircle className="h-4 w-4 text-destructive" />}
            {group.key === "today" && <Calendar className="h-4 w-4 text-primary" />}
            {group.label}
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {group.tasks.map((task, index) => (
              <Card key={task.id || index} className="p-3 sm:p-4 border-l-4 border-l-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="mt-1 shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm sm:text-base break-words">{task.title}</h4>

                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs sm:text-sm text-muted-foreground mt-2">
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>{formatDate(task.due_date)}</span>
                        </div>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-2 break-words">{task.description}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
