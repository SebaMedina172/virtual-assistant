import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { deleteTask, searchTasksForDeletion } from "@/lib/google-tasks"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.accessToken) {
      return NextResponse.json({ success: false, error: "No autenticado" }, { status: 401 })
    }

    const body = await request.json()
    const { taskId, taskListId, searchCriteria } = body

    // If taskId and taskListId are provided, delete directly
    if (taskId && taskListId) {

      const result = await deleteTask(session.accessToken, taskId, taskListId)

      return NextResponse.json({
        success: true,
        message: "Tarea eliminada exitosamente",
      })
    }

    // If searchCriteria is provided, search for matching tasks
    if (searchCriteria) {

      const result = await searchTasksForDeletion(session.accessToken, searchCriteria)

      return NextResponse.json({
        success: true,
        tasks: result.tasks,
      })
    }

    return NextResponse.json(
      { success: false, error: "Se requiere taskId y taskListId, o searchCriteria" },
      { status: 400 },
    )
  } catch (error) {
    console.error("Error in tasks delete API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
