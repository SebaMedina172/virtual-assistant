import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { listTasks, resolveTasklistId } from "@/lib/google-tasks"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const body = await request.json()
    const { tasklistName, maxResults, dueMin, dueMax } = body

    // Resolve tasklist name to ID if provided
    let tasklistId = "@default"
    if (tasklistName) {
      tasklistId = await resolveTasklistId(session.accessToken, tasklistName)
    }

    const result = await listTasks(session.accessToken, {
      tasklistId,
      maxResults,
      dueMin,
      dueMax,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Tasks list - Error:", error)
    console.error("Tasks list - Error stack:", error.stack)

    if (error.message?.includes("invalid_grant") || error.message?.includes("Invalid Credentials")) {
      return NextResponse.json(
        {
          error: "Token expirado. Por favor desconectá y volvé a conectar tu cuenta de Google.",
        },
        { status: 401 },
      )
    }

    return NextResponse.json(
      {
        error: "Error obteniendo tareas",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
