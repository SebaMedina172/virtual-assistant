import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createTask } from "@/lib/google-tasks"
import type { Task } from "@/types"

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions)

    console.log("Tasks create - Session exists:", !!session)
    console.log("Tasks create - Access token exists:", !!session?.accessToken)

    if (session?.error === "RefreshAccessTokenError") {
      return NextResponse.json(
        { error: "Tu sesión expiró. Por favor desconectá y volvé a conectar tu cuenta de Google." },
        { status: 401 },
      )
    }

    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "No autenticado. Por favor conectá tu cuenta de Google." }, { status: 401 })
    }

    const body = await request.json()
    console.log("Tasks create - Received body:", JSON.stringify(body, null, 2))

    const { task } = body as { task: any }

    if (!task) {
      console.log("Tasks create - No task in body")
      return NextResponse.json({ error: "No se proporcionó información de la tarea" }, { status: 400 })
    }

    const taskData: Task = {
      title: task.title,
      description: task.description || null,
      due_date: task.due_date || null,
      tasklist_id: task.tasklist_id || null,
      subtasks: task.subtasks || null,
    }

    console.log("Tasks create - Mapped task:", JSON.stringify(taskData, null, 2))

    if (!taskData.title) {
      console.log("Tasks create - Missing required fields:", {
        hasTitle: !!taskData.title,
      })
      return NextResponse.json({ error: "La tarea debe tener un título" }, { status: 400 })
    }

    // Create the task in Google Tasks
    const result = await createTask(session.accessToken, taskData)

    console.log("Tasks create - Success:", result)

    return NextResponse.json({
      success: true,
      message: "Tarea creada exitosamente en tu Google Tasks",
      taskId: result.taskId,
    })
  } catch (error) {
    console.error("Error in tasks create API:", error)
    return NextResponse.json(
      {
        error: "Error creando la tarea",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
