import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { geminiModel } from "@/lib/gemini"
import { SYSTEM_PROMPT, buildConversationContext } from "@/lib/prompts"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationHistory, confirmEvent } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 })
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

    // Construir el contexto de la conversación
    const context = conversationHistory?.length
      ? buildConversationContext(conversationHistory.slice(-5)) // Últimos 5 mensajes
      : ""

    // Construir el prompt completo
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
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
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
