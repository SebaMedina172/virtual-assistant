<div align="center">

# 🗓️ Virtual Assistant

### Asistente personal inteligente para Google Calendar y Google Tasks

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google AI](https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

[Demo](#-demo) • [Funcionalidades](#-funcionalidades) • [Características Técnicas](#-características-técnicas) • [Tecnologías](#-stack-tecnológico) • [Instalación](#-instalación) • [Arquitectura](#-arquitectura)

</div>

---

## 📋 Descripción

**Virtual Assistant** es una aplicación web que permite gestionar tu calendario de Google y tareas de Google Tasks mediante **lenguaje natural**. En lugar de navegar por múltiples menús y formularios, simplemente escribí lo que necesitás hacer y el asistente lo interpreta y ejecuta.

> *"Agendame una reunión con el equipo mañana a las 3pm"*  
> *"Mostrame mis tareas pendientes para esta semana"*  
> *"Cambiá la fecha de la tarea Estudiar para el viernes"*

La aplicación utiliza **Google Gemini AI** para procesar y entender las solicitudes, identificando automáticamente si querés crear, editar, eliminar o listar eventos y tareas.

---

## ✨ Funcionalidades

### Google Calendar
| Acción | Descripción | Ejemplo |
|--------|-------------|---------|
| **Crear** | Crea eventos con título, fecha, hora, ubicación, recordatorios y más | *"Creá una cita con el médico el lunes a las 10am"* |
| **Listar** | Muestra eventos en un rango de fechas | *"¿Qué tengo agendado para hoy?"* |
| **Editar** | Modifica eventos existentes | *"Mové la reunión del martes a las 4pm"* |
| **Eliminar** | Elimina eventos individuales o múltiples | *"Cancelá la reunión de mañana"* |

### Google Tasks
| Acción | Descripción | Ejemplo |
|--------|-------------|---------|
| **Crear** | Crea tareas con fecha de vencimiento y subtareas | *"Agregá una tarea: Comprar verduras con subtareas lechuga y tomate"* |
| **Listar** | Muestra tareas pendientes | *"Mostrame mis tareas de esta semana"* |
| **Editar** | Modifica título, descripción o fecha | *"Cambiá el título de Estudiar a Estudiar para examen"* |
| **Eliminar** | Elimina tareas | *"Eliminá la tarea Comprar leche"* |

---

## 🎯 Características Técnicas

- **OAuth 2.0 con refresh tokens** - Manejo automático de expiración de sesión
- **Procesamiento de lenguaje natural** - Gemini AI para detección de intenciones y extracción de entidades
- **Web Speech API** - Reconocimiento de voz continuo con detección inteligente de silencio
- **Server Actions de Next.js 15** - Arquitectura optimizada con App Router
- **Manejo de estados complejos** - Confirmaciones, operaciones batch, y flujos conversacionales
- **Diseño mobile-first** - Interfaz 100% responsive con soporte para gestos táctiles
- **Manejo robusto de errores** - Validaciones en cliente y servidor + retry logic

---

## 🛠 Stack Tecnológico

### Frontend
- **Next.js 15** - Framework React con App Router
- **TypeScript** - Tipado estático
- **Tailwind CSS 4** - Estilos utilitarios
- **shadcn/ui** - Componentes de UI
- **Lucide Icons** - Iconografía

### Backend & APIs
- **Google Gemini AI** - Procesamiento de lenguaje natural
- **Google Calendar API** - Gestión de eventos
- **Google Tasks API** - Gestión de tareas
- **NextAuth.js** - Autenticación OAuth 2.0

### Herramientas
- **date-fns** - Manipulación de fechas
- **Zod** - Validación de datos
- **Sonner** - Notificaciones toast

---

## 🏗 Arquitectura

```
├── app/
│   ├── api/
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── calendar/      # CRUD Google Calendar
│   │   │   ├── create/
│   │   │   ├── delete/
│   │   │   ├── list/
│   │   │   └── update/
│   │   ├── tasks/         # CRUD Google Tasks
│   │   │   ├── create/
│   │   │   ├── delete/
│   │   │   ├── list/
│   │   │   └── update/
│   │   └── chat/          # Procesamiento de mensajes
│   └── page.tsx
├── components/
│   ├── chat-interface.tsx # Interfaz principal del chat
│   ├── message-bubble.tsx # Burbujas de mensaje
│   ├── event-list.tsx     # Lista de eventos
│   ├── task-list.tsx      # Lista de tareas
│   ├── voice-input.tsx    # Entrada por voz
│   └── ui/                # Componentes shadcn
├── lib/
│   ├── gemini.ts          # Cliente Google Gemini AI
│   ├── google-calendar.ts # Funciones Calendar API
│   ├── google-tasks.ts    # Funciones Tasks API
│   └── prompts.ts         # System prompt del AI
└── types/
    └── index.ts           # Definiciones TypeScript
```

### Flujo de la Aplicación

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Usuario   │────▶│  Chat API   │────▶│  Gemini AI  │
│  (mensaje)  │     │             │     │  (análisis) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │                    │
                           ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │   Google    │◀────│   Intent    │
                    │  Calendar/  │     │  Detected   │
                    │   Tasks     │     │             │
                    └─────────────┘     └─────────────┘
```

1. El usuario escribe un mensaje en lenguaje natural
2. El mensaje se envía al endpoint `/api/chat`
3. Gemini AI analiza el mensaje y detecta la intención
4. Se ejecuta la acción correspondiente en Google Calendar o Tasks
5. El resultado se muestra al usuario en la interfaz

---

## 🚀 Instalación

### Prerrequisitos
- Node.js 18+
- Cuenta de Google
- Proyecto en Google Cloud Console

### 1. Clonar el repositorio
```bash
git clone https://github.com/SebaMedina172/virtual-assistant.git
cd virtual-assistant
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Google Cloud

1. Crear un proyecto en [Google Cloud Console](https://console.cloud.google.com/)
2. Habilitar las siguientes APIs:
   - Google Calendar API
   - Google Tasks API
3. Configurar la pantalla de consentimiento OAuth
4. Crear credenciales OAuth 2.0 (Web Application)
5. Agregar `http://localhost:3000/api/auth/callback/google` como URI de redirección

### 4. Configurar Gemini AI

1. Obtener una API key en [Google AI Studio](https://aistudio.google.com/apikey)

### 5. Variables de entorno

Crear archivo `.env.local`:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu_secret_aleatorio_aqui

# Google OAuth
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret

# Google Gemini AI
GEMINI_API_KEY=tu_gemini_api_key
```

### 6. Ejecutar en desarrollo
```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## 📸 Demo

🔗 **[Ver Demo en Vivo](https://sm-assistant.vercel.app/)**

### Ejemplos de uso:

**Eventos:**
- 📅 "Agendame una reunión con el equipo mañana a las 3pm con link de Meet"
- 🎨 "Creá un recordatorio el viernes a las 10am en color rojo"
- 🔄 "Cambiá mi dentista del martes a las 4pm"

**Tareas:**
- ✅ "Agregá una tarea: Comprar verduras para el 25 con subtareas lechuga, tomate y zanahoria"
- 📋 "Mostrame las tareas pendientes de esta semana"
- 🗑️ "Eliminá las tareas Prueba 1, Prueba 2 y Prueba 3"

---

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para cambios importantes, por favor abrí un issue primero para discutir qué te gustaría cambiar.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

---

<div align="center">

Desarrollado por [Sebastián Medina](https://github.com/SebaMedina172)

</div>
