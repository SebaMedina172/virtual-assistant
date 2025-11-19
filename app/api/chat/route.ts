import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { geminiModel } from "@/lib/gemini"
import { SYSTEM_PROMPT, buildConversationContext } from "@/lib/prompts"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationHistory, confirmEvent, confirmDelete, confirmDeleteBatch, confirmEdit, confirmTask } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 })
    }

    if (confirmTask) {
      const session = await getServerSession(authOptions)

      console.log("Chat - Confirming task:", JSON.stringify(confirmTask, null, 2))

      if (!session || !session.accessToken) {
        return NextResponse.json({
          intent: "create_task",
          needs_confirmation: false,
          task: null,
          response:
            "Para crear tareas necesito que conectes tu cuenta de Google. Por favor hacé clic en 'Conectar Google Calendar' en la parte superior.",
        })
      }

      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const createResponse = await fetch(`${baseUrl}/api/tasks/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify({ task: confirmTask }),
        })

        console.log("Chat - Tasks API response status:", createResponse.status)

        const createResult = await createResponse.json()
        console.log("Chat - Tasks API response:", createResult)

        if (createResult.success) {
          return NextResponse.json({
            intent: "create_task",
            needs_confirmation: false,
            task: confirmTask,
            response: `Perfecto! Tu tarea "${confirmTask.title}" fue creada exitosamente en tu Google Tasks.`,
            taskCreated: true,
          })
        } else {
          return NextResponse.json({
            intent: "create_task",
            needs_confirmation: false,
            task: null,
            response: `Hubo un problema creando la tarea: ${createResult.error}`,
          })
        }
      } catch (error) {
        console.error("Error creating task:", error)
        return NextResponse.json({
          intent: "create_task",
          needs_confirmation: false,
          task: null,
          response: "Disculpá, hubo un error creando la tarea. Por favor intentá de nuevo.",
        })
      }
    }

    if (confirmDeleteBatch && Array.isArray(confirmDeleteBatch) && confirmDeleteBatch.length > 0) {
      const session = await getServerSession(authOptions)

      console.log("Chat - Confirming batch delete:", JSON.stringify(confirmDeleteBatch, null, 2))

      if (!session || !session.accessToken) {
        return NextResponse.json({
          intent: "delete_event",
          needs_confirmation: false,
          response:
            "Para eliminar eventos necesito que conectes tu cuenta de Google. Por favor hacé clic en 'Conectar Google Calendar' en la parte superior.",
        })
      }

      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const deletePromises = confirmDeleteBatch.map((event) =>
          fetch(`${baseUrl}/api/calendar/delete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify({ eventId: event.id }),
          }).then((res) => res.json()),
        )

        const results = await Promise.all(deletePromises)
        const successCount = results.filter((r) => r.success).length
        const failedCount = results.length - successCount

        if (failedCount === 0) {
          const eventTitles = confirmDeleteBatch.map((e) => `"${e.title}"`).join(", ")
          return NextResponse.json({
            intent: "delete_event",
            needs_confirmation: false,
            response: `Listo! ${successCount === 1 ? "El evento" : "Los eventos"} ${eventTitles} ${successCount === 1 ? "fue eliminado" : "fueron eliminados"} exitosamente de tu Google Calendar.`,
          })
        } else {
          return NextResponse.json({
            intent: "delete_event",
            needs_confirmation: false,
            response: `Se eliminaron ${successCount} eventos correctamente, pero hubo problemas con ${failedCount}.`,
          })
        }
      } catch (error) {
        console.error("Error batch deleting events:", error)
        return NextResponse.json({
          intent: "delete_event",
          needs_confirmation: false,
          response: "Disculpá, hubo un error eliminando los eventos. Por favor intentá de nuevo.",
        })
      }
    }

    if (confirmDelete) {
      const session = await getServerSession(authOptions)

      console.log("Chat - Confirming delete:", JSON.stringify(confirmDelete, null, 2))

      if (!session || !session.accessToken) {
        return NextResponse.json({
          intent: "delete_event",
          needs_confirmation: false,
          response:
            "Para eliminar eventos necesito que conectes tu cuenta de Google. Por favor hacé clic en 'Conectar Google Calendar' en la parte superior.",
        })
      }

      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const deleteResponse = await fetch(`${baseUrl}/api/calendar/delete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify({ eventId: confirmDelete.id }),
        })

        const deleteResult = await deleteResponse.json()

        if (deleteResult.success) {
          return NextResponse.json({
            intent: "delete_event",
            needs_confirmation: false,
            response: `Listo! El evento "${confirmDelete.title}" fue eliminado exitosamente de tu Google Calendar.`,
          })
        } else {
          return NextResponse.json({
            intent: "delete_event",
            needs_confirmation: false,
            response: `Hubo un problema eliminando el evento: ${deleteResult.error}`,
          })
        }
      } catch (error) {
        console.error("Error deleting event:", error)
        return NextResponse.json({
          intent: "delete_event",
          needs_confirmation: false,
          response: "Disculpá, hubo un error eliminando el evento. Por favor intentá de nuevo.",
        })
      }
    }

    if (confirmEvent) {
      const session = await getServerSession(authOptions)

      console.log("Chat - Confirming event:", JSON.stringify(confirmEvent, null, 2))
      console.log("Chat - Session exists:", !!session)

      if (!session || !session.accessToken) {
        return NextResponse.json({
          intent: "create_event",
          needs_confirmation: false,
          missing_fields: [],
          event: null,
          response:
            "Para crear eventos necesito que conectes tu cuenta de Google. Por favor hacé clic en 'Conectar Google Calendar' en la parte superior.",
        })
      }

      // Create the event in Google Calendar
      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const createResponse = await fetch(`${baseUrl}/api/calendar/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify({ event: confirmEvent }),
        })

        console.log("Chat - Calendar API response status:", createResponse.status)

        const createResult = await createResponse.json()
        console.log("Chat - Calendar API response:", createResult)

        if (createResult.success) {
          return NextResponse.json({
            intent: "create_event",
            needs_confirmation: false,
            missing_fields: [],
            event: confirmEvent,
            response: `Perfecto! Tu evento "${confirmEvent.summary || confirmEvent.title}" fue creado exitosamente en tu Google Calendar.`,
            eventCreated: true,
          })
        } else {
          return NextResponse.json({
            intent: "create_event",
            needs_confirmation: false,
            missing_fields: [],
            event: null,
            response: `Hubo un problema creando el evento: ${createResult.error}`,
          })
        }
      } catch (error) {
        console.error("Error creating event:", error)
        return NextResponse.json({
          intent: "create_event",
          needs_confirmation: false,
          missing_fields: [],
          event: null,
          response: "Disculpá, hubo un error creando el evento. Por favor intentá de nuevo.",
        })
      }
    }

    if (confirmEdit) {
      const session = await getServerSession(authOptions)

      console.log("Chat - Confirming edit:", JSON.stringify(confirmEdit, null, 2))

      if (!session || !session.accessToken) {
        return NextResponse.json({
          intent: "update_event",
          needs_confirmation: false,
          response:
            "Para editar eventos necesito que conectes tu cuenta de Google. Por favor hacé clic en 'Conectar Google Calendar' en la parte superior.",
        })
      }

      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const updateResponse = await fetch(`${baseUrl}/api/calendar/update`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify({
            eventId: confirmEdit.eventId,
            updates: confirmEdit.updates,
          }),
        })

        const updateResult = await updateResponse.json()

        if (updateResult.success) {
          return NextResponse.json({
            intent: "update_event",
            needs_confirmation: false,
            response: `Listo! El evento "${confirmEdit.eventTitle}" fue actualizado exitosamente en tu Google Calendar.`,
          })
        } else {
          return NextResponse.json({
            intent: "update_event",
            needs_confirmation: false,
            response: `Hubo un problema actualizando el evento: ${updateResult.error}`,
          })
        }
      } catch (error) {
        console.error("Error updating event:", error)
        return NextResponse.json({
          intent: "update_event",
          needs_confirmation: false,
          response: "Disculpá, hubo un error actualizando el evento. Por favor intentá de nuevo.",
        })
      }
    }

    const context = conversationHistory?.length ? buildConversationContext(conversationHistory.slice(-5)) : ""

    const fullPrompt = `${SYSTEM_PROMPT}

${context ? `Contexto de la conversación anterior:\n${context}\n\n` : ""}Usuario: ${message}

Recordá: Respondé SOLO con JSON válido, sin texto adicional antes o después.`

    console.log("Sending prompt to Gemini")

    // Llamar a Gemini
    const result = await geminiModel.generateContent(fullPrompt)
    const response = result.response
    const text = response.text()

    console.log("Gemini raw response:", text)

    // Parsear la respuesta JSON
    let parsedResponse
    try {
      // Limpiar la respuesta por si tiene markdown code blocks
      const cleanedText = text
        .replace(/\`\`\`json\n?/g, "")
        .replace(/\`\`\`\n?/g, "")
        .trim()
      parsedResponse = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError)
      return NextResponse.json(
        {
          intent: "general",
          needs_confirmation: false,
          missing_fields: [],
          event: null,
          response: "Disculpá, tuve un problema procesando tu solicitud. ¿Podés reformularla?",
        },
        { status: 200 },
      )
    }

    console.log("Parsed response:", parsedResponse)

    if (parsedResponse.intent === "delete_event" && parsedResponse.deleteQuery) {
      const session = await getServerSession(authOptions)

      if (!session || !session.accessToken) {
        return NextResponse.json({
          intent: "delete_event",
          needs_confirmation: false,
          response:
            "Para eliminar eventos necesito que conectes tu cuenta de Google. Por favor hacé clic en 'Conectar Google Calendar' en la parte superior.",
        })
      }

      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

        const queries = parsedResponse.deleteQuery.queries || [
          {
            title: parsedResponse.deleteQuery.title,
            date: parsedResponse.deleteQuery.date,
            timeRange: parsedResponse.deleteQuery.timeRange,
          },
        ]

        const searchPromises = queries.map((query: any) => 
          fetch(`${baseUrl}/api/calendar/delete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: request.headers.get("cookie") || "",
            },
            body: JSON.stringify({ searchCriteria: query }),
          }).then((res) => res.json()),
        )

        const searchResults = await Promise.all(searchPromises)
        const allEvents = searchResults.flatMap((result) => (result.success && result.events ? result.events : []))

        if (allEvents.length === 0) {
          return NextResponse.json({
            intent: "delete_event",
            needs_confirmation: false,
            response: "No encontré ningún evento que coincida con tu búsqueda.",
          })
        } else {
          return NextResponse.json({
            intent: "delete_event",
            needs_confirmation: true,
            response: parsedResponse.response,
            matchingEvents: allEvents,
          })
        }
      } catch (error) {
        console.error("Error searching events for deletion:", error)
        return NextResponse.json({
          intent: "delete_event",
          needs_confirmation: false,
          response: "Disculpá, hubo un error buscando los eventos. Por favor intentá de nuevo.",
        })
      }
    }

    if (parsedResponse.intent === "update_event" && parsedResponse.editQuery) {
      const session = await getServerSession(authOptions)

      if (!session || !session.accessToken) {
        return NextResponse.json({
          intent: "update_event",
          needs_confirmation: false,
          response:
            "Para editar eventos necesito que conectes tu cuenta de Google. Por favor hacé clic en 'Conectar Google Calendar' en la parte superior.",
        })
      }

      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const searchResponse = await fetch(`${baseUrl}/api/calendar/update`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify({ searchCriteria: parsedResponse.editQuery.searchCriteria }),
        })

        const searchResult = await searchResponse.json()

        if (searchResult.success && searchResult.events && searchResult.events.length > 0) {
          return NextResponse.json({
            intent: "update_event",
            needs_confirmation: true,
            response: parsedResponse.response,
            matchingEvents: searchResult.events,
            editUpdates: parsedResponse.editQuery.updates,
          })
        } else {
          return NextResponse.json({
            intent: "update_event",
            needs_confirmation: false,
            response: "No encontré ningún evento que coincida con tu búsqueda.",
          })
        }
      } catch (error) {
        console.error("Error searching events for editing:", error)
        return NextResponse.json({
          intent: "update_event",
          needs_confirmation: false,
          response: "Disculpá, hubo un error buscando los eventos. Por favor intentá de nuevo.",
        })
      }
    }

    if (parsedResponse.intent === "list_events" && parsedResponse.query) {
      const session = await getServerSession(authOptions)

      console.log("Chat - Listing events:", JSON.stringify(parsedResponse.query, null, 2))

      if (!session || !session.accessToken) {
        return NextResponse.json({
          intent: "list_events",
          needs_confirmation: false,
          missing_fields: [],
          event: null,
          response:
            "Para ver tus eventos necesito que conectes tu cuenta de Google. Por favor hacé clic en 'Conectar Google Calendar' en la parte superior.",
        })
      }

      try {
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
        const listResponse = await fetch(`${baseUrl}/api/calendar/list`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: request.headers.get("cookie") || "",
          },
          body: JSON.stringify(parsedResponse.query),
        })

        const listResult = await listResponse.json()

        if (listResult.success) {
          return NextResponse.json({
            ...parsedResponse,
            events: listResult.events,
          })
        } else {
          return NextResponse.json({
            intent: "list_events",
            needs_confirmation: false,
            missing_fields: [],
            event: null,
            response: `Hubo un problema obteniendo los eventos: ${listResult.error}`,
          })
        }
      } catch (error) {
        console.error("Error listing events:", error)
        return NextResponse.json({
          intent: "list_events",
          needs_confirmation: false,
          missing_fields: [],
          event: null,
          response: "Disculpá, hubo un error obteniendo los eventos. Por favor intentá de nuevo.",
        })
      }
    }

    return NextResponse.json(parsedResponse)
  } catch (error) {
    console.error("Error in chat API:", error)
    return NextResponse.json(
      {
        error: "Error procesando la solicitud",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
