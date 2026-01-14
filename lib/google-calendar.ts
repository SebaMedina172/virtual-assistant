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

    // Crear el evento en Google Calendar
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: googleEvent,
      conferenceDataVersion: event.conferenceData?.createMeetLink ? 1 : 0,
    })

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

export async function listCalendarEvents(
  accessToken: string,
  options: {
    startDate?: string // ISO date
    endDate?: string // ISO date
    maxResults?: number
  } = {},
) {
  try {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    let timeMin: string
    let timeMax: string

    if (options.startDate) {
      // Parse the date and set to start of day in Argentina timezone
      const startDate = new Date(options.startDate + "T00:00:00-03:00")
      timeMin = startDate.toISOString()
    } else {
      // Default to start of today
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      timeMin = startOfDay.toISOString()
    }

    if (options.endDate) {
      // Parse the date and set to END of day (23:59:59) in Argentina timezone
      const endDate = new Date(options.endDate + "T23:59:59-03:00")
      timeMax = endDate.toISOString()
    } else {
      // Default to end of today
      const now = new Date()
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      timeMax = endOfDay.toISOString()
    }

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults: options.maxResults || 50,
      singleEvents: true,
      orderBy: "startTime",
    })

    const events = response.data.items || []

    return {
      success: true,
      events: events.map((event) => ({
        id: event.id,
        title: event.summary || "Sin título",
        description: event.description,
        location: event.location,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        colorId: event.colorId,
        htmlLink: event.htmlLink,
        hangoutLink: event.hangoutLink,
        attendees: event.attendees?.map((a) => a.email),
        recurrence: event.recurrence,
      })),
    }
  } catch (error) {
    console.error("Error listing calendar events:", error)
    throw error
  }
}

export async function deleteCalendarEvent(accessToken: string, eventId: string) {
  try {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    await calendar.events.delete({
      calendarId: "primary",
      eventId: eventId,
    })

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error deleting calendar event:", error)
    throw error
  }
}

export async function searchEventsForDeletion(
  accessToken: string,
  criteria: {
    title?: string
    date?: string // ISO date
    timeRange?: { start: string; end: string }
  },
) {
  try {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    let timeMin: string
    let timeMax: string

    if (criteria.date) {
      const startDate = new Date(criteria.date + "T00:00:00-03:00")
      const endDate = new Date(criteria.date + "T23:59:59-03:00")
      timeMin = startDate.toISOString()
      timeMax = endDate.toISOString()
    } else if (criteria.timeRange) {
      timeMin = new Date(criteria.timeRange.start).toISOString()
      timeMax = new Date(criteria.timeRange.end).toISOString()
    } else {
      const now = new Date()
      timeMin = now.toISOString()
      const futureDate = new Date(now)
      futureDate.setMonth(futureDate.getMonth() + 1)
      timeMax = futureDate.toISOString()
    }

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults: 50,
      singleEvents: true,
      orderBy: "startTime",
      q: criteria.title,
    })

    const events = response.data.items || []

    return {
      success: true,
      events: events.map((event) => ({
        id: event.id,
        title: event.summary || "Sin título",
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        description: event.description,
        location: event.location,
      })),
    }
  } catch (error) {
    console.error("Error searching events for deletion:", error)
    throw error
  }
}

export async function updateCalendarEvent(accessToken: string, eventId: string, updates: Partial<CalendarEvent>) {
  try {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    const existingEvent = await calendar.events.get({
      calendarId: "primary",
      eventId: eventId,
    })

    const googleEvent: any = {
      summary: updates.title !== undefined ? updates.title : existingEvent.data.summary,
      description: updates.description !== undefined ? updates.description : existingEvent.data.description,
      location: updates.location !== undefined ? updates.location : existingEvent.data.location,
    }

    if (updates.start_time) {
      const startDateTime = new Date(updates.start_time)
      googleEvent.start = {
        dateTime: startDateTime.toISOString(),
        timeZone: "America/Argentina/Buenos_Aires",
      }
    } else {
      googleEvent.start = existingEvent.data.start
    }

    if (updates.end_time) {
      const endDateTime = new Date(updates.end_time)
      googleEvent.end = {
        dateTime: endDateTime.toISOString(),
        timeZone: "America/Argentina/Buenos_Aires",
      }
    } else {
      googleEvent.end = existingEvent.data.end
    }

    if (updates.color !== undefined) {
      const colorId = getColorId(updates.color)
      if (colorId) {
        googleEvent.colorId = colorId
      }
    } else if (existingEvent.data.colorId) {
      googleEvent.colorId = existingEvent.data.colorId
    }

    if (updates.reminders !== undefined) {
      googleEvent.reminders = updates.reminders
    } else if (existingEvent.data.reminders) {
      googleEvent.reminders = existingEvent.data.reminders
    }

    if (updates.recurrence !== undefined) {
      googleEvent.recurrence = updates.recurrence
    } else if (existingEvent.data.recurrence) {
      googleEvent.recurrence = existingEvent.data.recurrence
    }

    if (updates.conferenceData?.createMeetLink) {
      googleEvent.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      }
    } else if (existingEvent.data.conferenceData) {
      googleEvent.conferenceData = existingEvent.data.conferenceData
    }

    const response = await calendar.events.update({
      calendarId: "primary",
      eventId: eventId,
      requestBody: googleEvent,
      conferenceDataVersion: updates.conferenceData?.createMeetLink ? 1 : 0,
    })

    return {
      success: true,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      meetLink: response.data.hangoutLink,
    }
  } catch (error) {
    console.error("Error updating calendar event:", error)
    throw error
  }
}

export async function searchEventsForEditing(
  accessToken: string,
  criteria: {
    title?: string
    date?: string
    timeRange?: { start: string; end: string }
  },
) {
  try {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)

    oauth2Client.setCredentials({
      access_token: accessToken,
    })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    let timeMin: string
    let timeMax: string

    if (criteria.date) {
      const startDate = new Date(criteria.date + "T00:00:00-03:00")
      const endDate = new Date(criteria.date + "T23:59:59-03:00")
      timeMin = startDate.toISOString()
      timeMax = endDate.toISOString()
    } else if (criteria.timeRange) {
      timeMin = new Date(criteria.timeRange.start).toISOString()
      timeMax = new Date(criteria.timeRange.end).toISOString()
    } else {
      const now = new Date()
      timeMin = now.toISOString()
      const futureDate = new Date(now)
      futureDate.setMonth(futureDate.getMonth() + 1)
      timeMax = futureDate.toISOString()
    }

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      maxResults: 50,
      singleEvents: true,
      orderBy: "startTime",
      q: criteria.title,
    })

    const events = response.data.items || []

    return {
      success: true,
      events: events.map((event) => ({
        id: event.id,
        title: event.summary || "Sin título",
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        description: event.description,
        location: event.location,
        colorId: event.colorId,
        reminders: event.reminders,
        recurrence: event.recurrence,
      })),
    }
  } catch (error) {
    console.error("Error searching events for editing:", error)
    throw error
  }
}
