import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { deleteCalendarEvent, searchEventsForDeletion } from "@/lib/google-calendar"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.accessToken) {
      return NextResponse.json({ success: false, error: "No autenticado" }, { status: 401 })
    }

    const body = await request.json()
    const { eventId, searchCriteria } = body

    console.log("Calendar delete - Request body:", JSON.stringify(body, null, 2))

    // If eventId is provided, delete directly
    if (eventId) {
      console.log("Calendar delete - Deleting event with ID:", eventId)

      const result = await deleteCalendarEvent(session.accessToken, eventId)

      return NextResponse.json({
        success: true,
        message: "Evento eliminado exitosamente",
      })
    }

    // If searchCriteria is provided, search for matching events
    if (searchCriteria) {
      console.log("Calendar delete - Searching events with criteria:", searchCriteria)

      const result = await searchEventsForDeletion(session.accessToken, searchCriteria)

      return NextResponse.json({
        success: true,
        events: result.events,
      })
    }

    return NextResponse.json({ success: false, error: "Se requiere eventId o searchCriteria" }, { status: 400 })
  } catch (error) {
    console.error("Error in calendar delete API:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
