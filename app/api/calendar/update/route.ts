import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { updateCalendarEvent, searchEventsForEditing } from "@/lib/google-calendar"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.accessToken) {
      return NextResponse.json({ success: false, error: "No autenticado" }, { status: 401 })
    }

    const body = await request.json()

    const { eventId, updates, searchCriteria } = body

    if (searchCriteria) {

      const result = await searchEventsForEditing(session.accessToken, searchCriteria)

      return NextResponse.json(result)
    }

    if (!eventId || !updates) {
      return NextResponse.json({ success: false, error: "Se requiere eventId y updates" }, { status: 400 })
    }

    const result = await updateCalendarEvent(session.accessToken, eventId, updates)

    return NextResponse.json({
      success: true,
      eventId: result.eventId,
      link: result.htmlLink,
      meetLink: result.meetLink,
    })
  } catch (error) {
    console.error("Error in calendar update API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
