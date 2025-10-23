import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { createCalendarEvent } from "@/lib/google-calendar"
import type { CalendarEvent } from "@/types"

export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario esté autenticado
    const session = await getServerSession(authOptions)

    console.log("Calendar create - Session exists:", !!session)
    console.log("Calendar create - Access token exists:", !!session?.accessToken)

    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "No autenticado. Por favor conectá tu cuenta de Google." }, { status: 401 })
    }

    const body = await request.json()
    console.log("Calendar create - Received body:", JSON.stringify(body, null, 2))

    const { event } = body as { event: any }

    if (!event) {
      console.log("Calendar create - No event in body")
      return NextResponse.json({ error: "No se proporcionó información del evento" }, { status: 400 })
    }

    // Mapear los campos de Gemini a los campos esperados por CalendarEvent
    const calendarEvent: CalendarEvent = {
      title: event.summary || event.title,
      description: event.description || null,
      start_time: event.start || event.start_time,
      end_time: event.end || event.end_time,
      attendees: event.attendees || null,
    }

    console.log("Calendar create - Mapped event:", JSON.stringify(calendarEvent, null, 2))

    if (!calendarEvent.title || !calendarEvent.start_time || !calendarEvent.end_time) {
      console.log("Calendar create - Missing required fields:", {
        hasTitle: !!calendarEvent.title,
        hasStart: !!calendarEvent.start_time,
        hasEnd: !!calendarEvent.end_time,
      })
      return NextResponse.json({ error: "Datos del evento incompletos" }, { status: 400 })
    }

    // Crear el evento en Google Calendar
    const result = await createCalendarEvent(session.accessToken, calendarEvent)

    console.log("Calendar create - Success:", result)

    return NextResponse.json({
      success: true,
      message: "Evento creado exitosamente en tu Google Calendar",
      eventId: result.eventId,
    })
  } catch (error) {
    console.error("Error in calendar create API:", error)
    return NextResponse.json(
      {
        error: "Error creando el evento",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
