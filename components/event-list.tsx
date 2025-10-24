import { Calendar, Clock, MapPin, Video, Users } from "lucide-react"
import { Card } from "./ui/card"

interface Event {
  id?: string
  title: string
  description?: string
  location?: string
  start: string
  end: string
  colorId?: string
  htmlLink?: string
  hangoutLink?: string
  attendees?: string[]
  recurrence?: string[]
}

interface EventListProps {
  events: Event[]
}

const COLOR_NAMES: Record<string, string> = {
  "1": "Lavanda",
  "2": "Verde",
  "3": "Violeta",
  "4": "Rosa",
  "5": "Amarillo",
  "6": "Naranja",
  "7": "Azul",
  "8": "Gris",
  "9": "Azul oscuro",
  "10": "Verde oscuro",
  "11": "Rojo",
}

const COLOR_CLASSES: Record<string, string> = {
  "1": "border-l-[#7986cb]",
  "2": "border-l-[#33b679]",
  "3": "border-l-[#8e24aa]",
  "4": "border-l-[#e67c73]",
  "5": "border-l-[#f6bf26]",
  "6": "border-l-[#f4511e]",
  "7": "border-l-[#039be5]",
  "8": "border-l-[#616161]",
  "9": "border-l-[#3f51b5]",
  "10": "border-l-[#0b8043]",
  "11": "border-l-[#d50000]",
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function EventList({ events }: EventListProps) {
  if (events.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">No hay eventos en este período</p>
      </Card>
    )
  }

  // Group events by date
  const eventsByDate = events.reduce(
    (acc, event) => {
      const dateKey = formatDate(event.start)
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(event)
      return acc
    },
    {} as Record<string, Event[]>,
  )

  return (
    <div className="space-y-6">
      {Object.entries(eventsByDate).map(([date, dateEvents]) => (
        <div key={date}>
          <h3 className="font-semibold text-lg mb-3 capitalize">{date}</h3>
          <div className="space-y-3">
            {dateEvents.map((event, index) => (
              <Card
                key={event.id || index}
                className={`p-4 border-l-4 ${COLOR_CLASSES[event.colorId || "7"] || "border-l-primary"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-base mb-2">{event.title}</h4>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>
                          {formatTime(event.start)} - {formatTime(event.end)}
                        </span>
                      </div>

                      {event.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}

                      {event.hangoutLink && (
                        <div className="flex items-center gap-1.5">
                          <Video className="h-4 w-4 shrink-0" />
                          <a
                            href={event.hangoutLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Google Meet
                          </a>
                        </div>
                      )}

                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 shrink-0" />
                          <span>{event.attendees.length} asistentes</span>
                        </div>
                      )}

                      {event.colorId && (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                {
                                  "1": "#7986cb",
                                  "2": "#33b679",
                                  "3": "#8e24aa",
                                  "4": "#e67c73",
                                  "5": "#f6bf26",
                                  "6": "#f4511e",
                                  "7": "#039be5",
                                  "8": "#616161",
                                  "9": "#3f51b5",
                                  "10": "#0b8043",
                                  "11": "#d50000",
                                }[event.colorId] || "#039be5",
                            }}
                          />
                          <span>{COLOR_NAMES[event.colorId] || "Azul"}</span>
                        </div>
                      )}
                    </div>

                    {event.description && <p className="text-sm text-muted-foreground mt-2">{event.description}</p>}

                    {event.recurrence && <p className="text-xs text-muted-foreground mt-2 italic">Evento recurrente</p>}
                  </div>

                  {event.htmlLink && (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline shrink-0"
                    >
                      Ver en Calendar
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
