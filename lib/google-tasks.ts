import { google } from "googleapis"
import type { Task } from "@/types"

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
    console.log(
      "Available tasklists:",
      tasklists.map((t) => ({ id: t.id, title: t.title })),
    )

    // Find tasklist by name (case-insensitive)
    const matchedTasklist = tasklists.find((tl) => tl.title?.toLowerCase() === tasklistName.toLowerCase())

    if (matchedTasklist && matchedTasklist.id) {
      console.log(`Resolved tasklist "${tasklistName}" to ID: ${matchedTasklist.id}`)
      return matchedTasklist.id
    }

    console.log(`Tasklist "${tasklistName}" not found, using @default`)
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

    console.log("Creating task in tasklist:", tasklistId)

    const googleTask: any = {
      title: task.title,
    }

    if (task.description) {
      googleTask.notes = task.description
    }

    if (task.due_date) {
      const dueDate = new Date(task.due_date + "T00:00:00")
      googleTask.due = dueDate.toISOString()
    }

    console.log("Creating task with data:", JSON.stringify(googleTask, null, 2))

    const response = await tasks.tasks.insert({
      tasklist: tasklistId,
      requestBody: googleTask,
      parent: parentTaskId,
    })

    console.log("Task created successfully:", response.data.id)

    const createdTaskId = response.data.id

    if (!createdTaskId) {
      throw new Error("Failed to create task: no task ID returned")
    }

    if (task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0) {
      console.log(`Creating ${task.subtasks.length} subtasks for parent task ${createdTaskId}`)

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

    console.log("Listing tasks with params:", JSON.stringify(listParams, null, 2))

    const response = await tasks.tasks.list(listParams)

    let tasksList = response.data.items || []

    console.log("Found", tasksList.length, "tasks in tasklist:", tasklistId)

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

      console.log("After date filtering:", tasksList.length, "tasks remain")
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

    console.log("Deleting task with ID:", taskId, "from tasklist:", tlistId)

    await tasks.tasks.delete({
      tasklist: tlistId,
      task: taskId,
    })

    console.log("Task deleted successfully")

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

    console.log("Fetching existing task:", taskId, "from tasklist:", tlistId)

    const existingTask = await tasks.tasks.get({
      tasklist: tlistId,
      task: taskId,
    })

    console.log("Existing task:", JSON.stringify(existingTask.data, null, 2))

    const googleTask: any = {
      title: updates.title !== undefined ? updates.title : existingTask.data.title,
    }

    if (updates.description !== undefined) {
      googleTask.notes = updates.description
    } else if (existingTask.data.notes) {
      googleTask.notes = existingTask.data.notes
    }

    if (updates.due_date !== undefined) {
      if (updates.due_date) {
        const dueDate = new Date(updates.due_date + "T00:00:00")
        googleTask.due = dueDate.toISOString()
      }
    } else if (existingTask.data.due) {
      googleTask.due = existingTask.data.due
    }

    console.log("Updating task with data:", JSON.stringify(googleTask, null, 2))

    const response = await tasks.tasks.update({
      tasklist: tlistId,
      task: taskId,
      requestBody: googleTask,
    })

    console.log("Task updated successfully:", response.data.id)

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

    console.log("Searching tasks for deletion with criteria:", JSON.stringify(criteria, null, 2))

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

    console.log("Found", tasksList.length, "matching tasks for deletion")

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
