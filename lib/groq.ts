import Groq from "groq-sdk"

if (!process.env.GROQ_API_KEY) {
  throw new Error("GROQ_API_KEY no está configurada en las variables de entorno")
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

export const groqModel = {
  async generateContent(prompt: string) {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile", // Excelente modelo, gratis
      temperature: 0.3,
      max_tokens: 1024,
    })

    return {
      response: {
        text: () => completion.choices[0]?.message?.content || ""
      }
    }
  }
}
