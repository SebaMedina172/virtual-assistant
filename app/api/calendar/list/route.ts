import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { listCalendarEvents } from "@/lib/google-calendar"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, endDate, maxResults } = body

    const result = await listCalendarEvents(session.accessToken, {
      startDate,
      endDate,
      maxResults,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Calendar list - Error:", error)
    console.error("Calendar list - Error stack:", error.stack)

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
        error: "Error obteniendo eventos",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
