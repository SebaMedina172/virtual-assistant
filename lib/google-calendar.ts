import { google } from "googleapis"
import type { CalendarEvent } from "@/types"

export async function createCalendarEvent(accessToken: string, event: CalendarEvent) {
  try {
    // Crear cliente OAuth2 con el access token del usuario
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    // Crear cliente de Google Calendar
    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Preparar el evento para Google Calendar
    const startDateTime = new Date(event.start_time)
    const endDateTime = new Date(event.end_time)

    const googleEvent = {
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "America/Argentina/Buenos_Aires", // Ajustar según tu zona horaria
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "America/Argentina/Buenos_Aires",
      },
    }

    // Crear el evento en Google Calendar
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: googleEvent,
    })

    return {
      success: true,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
    }
  } catch (error) {
    console.error("Error creating calendar event:", error)
    throw error
  }
}
