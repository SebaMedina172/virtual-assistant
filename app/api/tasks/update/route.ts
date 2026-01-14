import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { updateTask, searchTasksForEditing } from "@/lib/google-tasks"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (session?.error === "RefreshAccessTokenError") {
      return NextResponse.json(
        { success: false, error: "Tu sesión expiró. Por favor desconectá y volvé a conectar tu cuenta de Google." },
        { status: 401 },
      )
    }

    if (!session || !session.accessToken) {
      return NextResponse.json({ success: false, error: "No autenticado" }, { status: 401 })
    }

    const body = await request.json()
    const { taskId, tasklistId, updates, searchCriteria } = body

    // If taskId is provided, update directly
    if (taskId) {

      const result = await updateTask(session.accessToken, taskId, updates, tasklistId)

      return NextResponse.json({
        success: true,
        message: "Tarea actualizada exitosamente",
        taskId: result.taskId,
        task: result.task,
      })
    }

    // If searchCriteria is provided, search for matching tasks
    if (searchCriteria) {

      const result = await searchTasksForEditing(session.accessToken, searchCriteria)

      return NextResponse.json({
        success: true,
        tasks: result.tasks,
      })
    }

    return NextResponse.json({ success: false, error: "Se requiere taskId o searchCriteria" }, { status: 400 })
  } catch (error) {
    console.error("Error in tasks update API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
