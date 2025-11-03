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
    console.log("Calendar update - Request body:", JSON.stringify(body, null, 2))

    const { eventId, updates, searchCriteria } = body

    if (searchCriteria) {
      console.log("Calendar update - Searching for events:", JSON.stringify(searchCriteria, null, 2))

      const result = await searchEventsForEditing(session.accessToken, searchCriteria)

      console.log("Calendar update - Search results:", JSON.stringify(result, null, 2))

      return NextResponse.json(result)
    }

    if (!eventId || !updates) {
      return NextResponse.json({ success: false, error: "Se requiere eventId y updates" }, { status: 400 })
    }

    console.log("Calendar update - Updating event:", eventId)
    console.log("Calendar update - Updates:", JSON.stringify(updates, null, 2))

    const result = await updateCalendarEvent(session.accessToken, eventId, updates)

    console.log("Calendar update - Result:", JSON.stringify(result, null, 2))

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
