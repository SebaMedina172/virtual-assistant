import { google } from "googleapis"
import type { Task } from "@/types"

function formatDueDateAsArgentina(dateStr: string): string {
  return `${dateStr}T00:00:00-03:00`
}

export async function resolveTasklistId(accessToken: string, tasklistName: string | null): Promise<string> {
  if (!tasklistName) {
    return "@default"
  }

  // If already looks like an ID (starts with numbers or special chars), return as is
  if (tasklistName.startsWith("MTk") || tasklistName.startsWith("@")) {
    return tasklistName
  }

  try {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    oauth2Client.setCredentials({ access_token: accessToken })

    const tasks = google.tasks({ version: "v1", auth: oauth2Client })

    // Get all task lists
    const response = await tasks.tasklists.list({
      maxResults: 100,
    })

    const tasklists = response.data.items || []

    // Find tasklist by name (case-insensitive)
    const matchedTasklist = tasklists.find((tl) => tl.title?.toLowerCase() === tasklistName.toLowerCase())

    if (matchedTasklist && matchedTasklist.id) {
      return matchedTasklist.id
    }

    return "@default"
  } catch (error) {
    console.error("Error resolving tasklist:", error)
    return "@default"
  }
}

export async function createTask(accessToken: string, task: Task, parentTaskId?: string, parentTasklistId?: string) {
  try {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const tasks = google.tasks({ version: "v1", auth: oauth2Client })

    // Si tenemos un parentTasklistId, usarlo directamente (ya está resuelto)
    // Si no, resolver el tasklist_id de la tarea
    let tasklistId = parentTasklistId || "@default"
    if (!parentTasklistId && task.tasklist_id) {
      tasklistId = await resolveTasklistId(accessToken, task.tasklist_id)
    }

    const googleTask: any = {
      title: task.title,
    }

    if (task.description) {
      googleTask.notes = task.description
    }

    if (task.due_date) {
      googleTask.due = formatDueDateAsArgentina(task.due_date)
    }

    const response = await tasks.tasks.insert({
      tasklist: tasklistId,
      requestBody: googleTask,
      parent: parentTaskId,
    })

    const createdTaskId = response.data.id

    if (!createdTaskId) {
      throw new Error("Failed to create task: no task ID returned")
    }

    if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {

      for (const subtask of task.subtasks) {
        try {
          await createTask(accessToken, subtask, createdTaskId, tasklistId)
        } catch (subtaskError) {
          console.error("Error creating subtask:", subtaskError)
        }
      }
    }

    return {
      success: true,
      taskId: createdTaskId,
      task: response.data,
    }
  } catch (error) {
    console.error("Error creating task:", error)
    throw error
  }
}

export async function listTasks(
  accessToken: string,
  options: {
    maxResults?: number
    tasklistId?: string
    dueMin?: string // ISO date "YYYY-MM-DD"
    dueMax?: string // ISO date "YYYY-MM-DD"
  } = {},
) {
  try {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const tasks = google.tasks({ version: "v1", auth: oauth2Client })

    const tasklistId = options.tasklistId || "@default"

    const listParams: any = {
      tasklist: tasklistId,
      maxResults: options.maxResults || 100, // Increased to get more tasks for filtering
      showCompleted: true,
      showHidden: false,
    }

    const response = await tasks.tasks.list(listParams)

    let tasksList = response.data.items || []

    if (options.dueMin || options.dueMax) {
      tasksList = tasksList.filter((task) => {
        if (!task.due) return false // Skip tasks without due date

        // Extract date only (YYYY-MM-DD) from the due field
        const taskDueDate = task.due.split("T")[0]

        // Check if task is within the date range
        if (options.dueMin && taskDueDate < options.dueMin) return false
        if (options.dueMax && taskDueDate > options.dueMax) return false

        return true
      })

    }

    return {
      success: true,
      tasks: tasksList.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.notes,
        due_date: task.due ? task.due.split("T")[0] : null,
        status: task.status,
        completed: task.completed ? new Date(task.completed) : null,
        parent: task.parent || null,
      })),
    }
  } catch (error) {
    console.error("Error listing tasks:", error)
    throw error
  }
}

export async function deleteTask(accessToken: string, taskId: string, tasklistId?: string) {
  try {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const tasks = google.tasks({ version: "v1", auth: oauth2Client })

    const tlistId = tasklistId || "@default"

    await tasks.tasks.delete({
      tasklist: tlistId,
      task: taskId,
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error deleting task:", error)
    throw error
  }
}

export async function updateTask(accessToken: string, taskId: string, updates: Partial<Task>, tasklistId?: string) {
  try {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const tasks = google.tasks({ version: "v1", auth: oauth2Client })

    const tlistId = tasklistId || "@default"

    const existingTask = await tasks.tasks.get({
      tasklist: tlistId,
      task: taskId,
    })

    const googleTask: any = {
      id: taskId,
      title: updates.title !== undefined ? updates.title : existingTask.data.title,
    }

    if (updates.description !== undefined) {
      googleTask.notes = updates.description
    } else if (existingTask.data.notes) {
      googleTask.notes = existingTask.data.notes
    }

    if (updates.due_date !== undefined) {
      if (updates.due_date) {
        googleTask.due = formatDueDateAsArgentina(updates.due_date)
      }
    } else if (existingTask.data.due) {
      googleTask.due = existingTask.data.due
    }

    const response = await tasks.tasks.update({
      tasklist: tlistId,
      task: taskId,
      requestBody: googleTask,
    })

    return {
      success: true,
      taskId: response.data.id,
      task: response.data,
    }
  } catch (error) {
    console.error("Error updating task:", error)
    throw error
  }
}

export async function searchTasksForDeletion(
  accessToken: string,
  criteria: {
    title?: string
    tasklistId?: string
    dueDate?: string // ISO date "YYYY-MM-DD"
  },
) {
  try {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const tasks = google.tasks({ version: "v1", auth: oauth2Client })

    const tasklistId = criteria.tasklistId || "@default"

    const response = await tasks.tasks.list({
      tasklist: tasklistId,
      maxResults: 100,
      showCompleted: false,
      showHidden: false,
    })

    let tasksList = response.data.items || []

    // Filter by title if provided
    if (criteria.title) {
      const searchTerm = criteria.title.toLowerCase()
      tasksList = tasksList.filter((task) => task.title?.toLowerCase().includes(searchTerm))
    }

    // Filter by due date if provided
    if (criteria.dueDate) {
      tasksList = tasksList.filter((task) => {
        if (!task.due) return false
        const taskDueDate = task.due.split("T")[0]
        return taskDueDate === criteria.dueDate
      })
    }

    return {
      success: true,
      tasks: tasksList.map((task) => ({
        id: task.id,
        title: task.title || "Sin título",
        description: task.notes,
        due_date: task.due ? task.due.split("T")[0] : null,
        status: task.status,
        tasklistId: tasklistId,
      })),
    }
  } catch (error) {
    console.error("Error searching tasks for deletion:", error)
    throw error
  }
}

export async function searchTasksForEditing(
  accessToken: string,
  criteria: {
    title?: string
    tasklistId?: string
    dueDate?: string // ISO date "YYYY-MM-DD"
  },
) {
  try {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const tasks = google.tasks({ version: "v1", auth: oauth2Client })

    const tasklistId = criteria.tasklistId || "@default"

    const response = await tasks.tasks.list({
      tasklist: tasklistId,
      maxResults: 100,
      showCompleted: false,
      showHidden: false,
    })

    let tasksList = response.data.items || []

    // Filter by title if provided
    if (criteria.title) {
      const searchTerm = criteria.title.toLowerCase()
      tasksList = tasksList.filter((task) => task.title?.toLowerCase().includes(searchTerm))
    }

    // Filter by due date if provided
    if (criteria.dueDate) {
      tasksList = tasksList.filter((task) => {
        if (!task.due) return false
        const taskDueDate = task.due.split("T")[0]
        return taskDueDate === criteria.dueDate
      })
    }

    return {
      success: true,
      tasks: tasksList.map((task) => ({
        id: task.id,
        title: task.title || "Sin título",
        description: task.notes,
        due_date: task.due ? task.due.split("T")[0] : null,
        status: task.status,
        tasklistId: tasklistId,
      })),
    }
  } catch (error) {
    console.error("Error searching tasks for editing:", error)
    throw error
  }
}
