import { type NextRequest, NextResponse } from "next/server"
import { geminiModel } from "@/lib/gemini"
import { SYSTEM_PROMPT, buildConversationContext } from "@/lib/prompts"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationHistory } = body

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 })
    }

    // Construir el contexto de la conversación
    const context = conversationHistory?.length
      ? buildConversationContext(conversationHistory.slice(-5)) // Últimos 5 mensajes
      : ""

    // Construir el prompt completo
    const fullPrompt = `${SYSTEM_PROMPT}

${context ? `Contexto de la conversación anterior:\n${context}\n\n` : ""}Usuario: ${message}

Recordá: Respondé SOLO con JSON válido, sin texto adicional antes o después.`

    console.log("[v0] Sending prompt to Gemini")

    // Llamar a Gemini
    const result = await geminiModel.generateContent(fullPrompt)
    const response = result.response
    const text = response.text()

    console.log("[v0] Gemini raw response:", text)

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
      console.error("[v0] Error parsing Gemini response:", parseError)
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

    console.log("[v0] Parsed response:", parsedResponse)

    return NextResponse.json(parsedResponse)
  } catch (error) {
    console.error("[v0] Error in chat API:", error)
    return NextResponse.json(
      {
        error: "Error procesando la solicitud",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
