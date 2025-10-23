import { google } from "googleapis"
import type { CalendarEvent } from "@/types"

const COLOR_MAP: Record<string, string> = {
  lavanda: "1",
  lavender: "1",
  verde: "2",
  sage: "2",
  violeta: "3",
  grape: "3",
  rosa: "4",
  flamingo: "4",
  amarillo: "5",
  banana: "5",
  naranja: "6",
  tangerine: "6",
  azul: "7",
  peacock: "7",
  gris: "8",
  graphite: "8",
  "azul oscuro": "9",
  blueberry: "9",
  "verde oscuro": "10",
  basil: "10",
  rojo: "11",
  tomato: "11",
}

function getColorId(color?: string): string | undefined {
  if (!color) return undefined
  // If it's already a number 1-11, return it
  if (/^([1-9]|1[01])$/.test(color)) return color
  // Otherwise, try to map the name
  return COLOR_MAP[color.toLowerCase()]
}

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

    const googleEvent: any = {
      summary: event.title,
      description: event.description || undefined,
      location: event.location || undefined,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "America/Argentina/Buenos_Aires",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "America/Argentina/Buenos_Aires",
      },
    }

    // Add color if specified
    const colorId = getColorId(event.color)
    if (colorId) {
      googleEvent.colorId = colorId
    }

    // Add reminders if specified
    if (event.reminders) {
      googleEvent.reminders = event.reminders
    }

    // Add recurrence if specified
    if (event.recurrence && event.recurrence.length > 0) {
      googleEvent.recurrence = event.recurrence
    }

    // Add conference data (Google Meet) if requested
    if (event.conferenceData?.createMeetLink) {
      googleEvent.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      }
    }

    console.log("Creating event with data:", JSON.stringify(googleEvent, null, 2))

    // Crear el evento en Google Calendar
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: googleEvent,
      conferenceDataVersion: event.conferenceData?.createMeetLink ? 1 : 0,
    })

    console.log("Event created successfully:", response.data.id)

    return {
      success: true,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      meetLink: response.data.hangoutLink,
    }
  } catch (error) {
    console.error("Error creating calendar event:", error)
    throw error
  }
}
