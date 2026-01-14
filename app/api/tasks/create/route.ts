import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createTask } from "@/lib/google-tasks"
import type { Task } from "@/types"

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions)

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

    const { task } = body as { task: any }

    if (!task) {
      return NextResponse.json({ error: "No se proporcionó información de la tarea" }, { status: 400 })
    }

    const taskData: Task = {
      title: task.title,
      description: task.description || null,
      due_date: task.due_date || null,
      tasklist_id: task.tasklist_id || null,
      subtasks: task.subtasks || null,
    }

    if (!taskData.title) {
      return NextResponse.json({ error: "La tarea debe tener un título" }, { status: 400 })
    }

    // Create the task in Google Tasks
    const result = await createTask(session.accessToken, taskData)

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
