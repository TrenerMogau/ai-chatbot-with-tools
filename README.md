# Full-Featured AI Chatbot Platform

A production-ready AI chatbot platform built with Next.js 16 (Turbopack), [AI SDK 4](https://ai-sdk.dev), [shadcn/ui](https://ui.shadcn.com), SQLite persistence, and [KodeKloud AI Playground](https://api.ai.kodekloud.com).

## Features

- 🧠 **Chain of Thought Reasoning**: Full support for reasoning models (e.g. Qwen, DeepSeek). Features live pulsing status during thinking and an accordion displaying the complete thought process.
- 📁 **Projects & Folders Organization**: Group chats into collapsible project folders with quick creation, renaming, deletion, and folder transfer.
- 💬 **Full Chat Management**: Inline chat renaming, safe deletion, and auto-generated conversation titles via background AI summarization.
- ✏️ **Latest Prompt Editing & Copying**: One-click prompt copying and inline prompt editing with history truncation and re-streaming.
- 🔄 **Assistant Response Actions**:
  - Copy response text to clipboard.
  - Interactive Like and Dislike feedback toggles.
  - Response regeneration (scoped to the latest assistant response).
- 🌐 **Expandable Search Sources**: Real-time Tavily web search with an expandable sources accordion (default closed) featuring domain tags, snippet previews, and direct links.
- 🛡️ **Interrupted Turn Recovery**: If the page is refreshed while the model is thinking or streaming, the conversation safely detects the interrupted state and provides a "Generate response" button to seamlessly resume.
- 💾 **Local SQLite Persistence**: High-performance, zero-config local storage with WAL mode, foreign keys, and self-healing schema migrations.
- 🛠️ **Human-in-the-Loop & Tool Calling**: Interactive `ask_user` questions pinned to the chat viewport, GitHub repository inspection, and web search.

---

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# KodeKloud AI Gateway
KODEKLOUD_BASE_URL="https://api.ai.kodekloud.com/v1"
KODEKLOUD_API_KEY="your_kodekloud_api_key"

# Tavily Web Search (for live web browsing)
TAVILY_API_KEY="your_tavily_api_key"
TAVILY_SEARCH_BASE_URL="https://api.tavily.com/search"
```

### 3. Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Models

Models are defined in [`lib/models.ts`](lib/models.ts):

| Model ID | Name | Capabilities |
| :--- | :--- | :--- |
| `qwen/qwen3.8-flash` | Qwen 3.8 Flash (Default) | Fast reasoning, web search, tool calling |
| `minimax/MiniMax-M2.5` | MiniMax M2.5 | Deep reasoning, high context window |
| `gpt-oss-120b` | GPT-OSS 120B | Large open-weights reasoning model |
| `zai/glm-5.3-flash` | GLM 5.3 Flash | Fast general assistance |

---

## Architecture & Code Structure

```
├── app/
│   ├── api/
│   │   ├── chat/             # Chat streaming endpoint with reasoning middleware
│   │   ├── chat/title/       # First-turn chat title generator
│   │   ├── chats/[id]/       # Chat rename, move to project, and delete
│   │   └── folders/          # Projects/Folders CRUD endpoints
│   ├── chat/[id]/            # Saved conversation view
│   ├── layout.tsx            # Global layout with persistent sidebar
│   └── page.tsx              # Root new chat page
├── components/
│   ├── ai/
│   │   └── chain-of-thought.tsx # Shadcn reasoning collapsible component
│   ├── parts/
│   │   ├── reasoning-part.tsx   # Model thought process presentation
│   │   ├── sources-part.tsx     # Expandable web search sources drawer/cards
│   │   ├── web-search-part.tsx   # Web search status indicator
│   │   ├── github-repo-part.tsx  # GitHub repository metadata card
│   │   ├── ask-user-part.tsx     # Interactive questionnaire responses
│   │   └── text-part.tsx         # Markdown rendering with syntax highlighting
│   ├── chat.tsx              # Main chat engine with useChat integration
│   ├── chat-message.tsx      # User/Assistant message bubbles & action bars
│   └── sidebar.tsx           # Projects & conversation history navigation
├── lib/
│   ├── db.ts                 # Better-SQLite3 database schema & helper methods
│   ├── kodekloud.ts          # AI gateway client & SSE stream transformer
│   ├── models.ts             # Supported model definitions
│   └── utils.ts              # Styling utilities and chat title formatting
└── tools/
    ├── web_search.ts         # Tavily live web search tool
    ├── github_repo.ts        # GitHub repository inspector tool
    ├── ask_user.ts           # Human-in-the-loop interactive tool
    └── index.ts              # Tool registry and UI message types
```

---

## Database Schema (SQLite)

Conversations and projects are stored in `chat.db` with WAL mode enabled:

### `folders` Table
- `id` (TEXT, Primary Key)
- `name` (TEXT)
- `created_at` (INTEGER)
- `updated_at` (INTEGER)

### `chats` Table
- `id` (TEXT, Primary Key)
- `title` (TEXT)
- `model` (TEXT)
- `folder_id` (TEXT, Foreign Key -> folders.id, ON DELETE SET NULL)
- `created_at` (INTEGER)
- `updated_at` (INTEGER)

### `messages` Table
- `id` (TEXT, Primary Key)
- `chat_id` (TEXT, Foreign Key -> chats.id, ON DELETE CASCADE)
- `role` (TEXT: `user` | `assistant`)
- `parts` (TEXT: JSON serialized array of typed message parts)
- `created_at` (INTEGER)

---

## Tool Parts & Message Streaming

Every assistant message is a list of typed parts. [`components/chat-message.tsx`](components/chat-message.tsx) renders each part according to its type:

| Part Type | Component | Description |
| :--- | :--- | :--- |
| `reasoning` | [`reasoning-part.tsx`](components/parts/reasoning-part.tsx) | Live pulsing reasoning step while thinking; collapses into a thought process accordion. |
| `text` | [`text-part.tsx`](components/parts/text-part.tsx) | GitHub-flavored markdown with code syntax highlighting. |
| `tool-web_search` | [`web-search-part.tsx`](components/parts/web-search-part.tsx) | Status indicators during web search execution. |
| `source-url` / search results | [`sources-part.tsx`](components/parts/sources-part.tsx) | Expandable sources list (default closed) at the bottom of the response with numbered citation cards and previews. |
| `tool-github_repo` | [`github-repo-part.tsx`](components/parts/github-repo-part.tsx) | Repository metrics (stars, forks, primary language). |
| `tool-ask_user` | [`ask-user-part.tsx`](components/parts/ask-user-part.tsx) | Clarifying multiple-choice questionnaire answered directly in the UI. |

---

## Scripts

- `npm run dev` - Starts Next.js development server with Turbopack.
- `npm run build` - Builds production bundle and validates route definitions.
- `npm run typecheck` - Validates TypeScript types across the entire codebase.
- `npm run lint` - Runs ESLint.

---

## License

MIT
