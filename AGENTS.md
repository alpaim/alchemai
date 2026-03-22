# AlchemAI

Local LLM powered Alchemy game with infinite possibilities. Combine elements to discover new ones, powered by AI that runs entirely on your machine or even in your browser.

## Tech Stack
- **Framework**: Vite + React 19 + TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand with localStorage persistence
- **Drag & Drop**: @dnd-kit/core
- **LLM**: Vercel AI SDK with @ai-sdk/openai

## Commands
- `bun run dev` - Start dev server
- `bun run build` - Production build
- `bun run lint` - ESLint + TypeScript check
- `bun run test` - Run tests
- `bun run preview` - Preview production build

## Architecture

### `src/lib/llm/`
- `providers/openai.ts` - OpenAI-compatible LLM provider using `@ai-sdk/openai`
- `prompts.ts` - System prompts for element combination logic
- `types.ts` - TypeScript types for LLM integration

### `src/lib/stores/`
- `app.ts` - Zustand store: game state (elements, history) with localStorage persistence, and UI state (thinking card, active combination)

### `src/lib/hooks/`
- `useLLM.ts` - Hook wrapping Vercel AI SDK for streaming responses

### `src/lib/utils/`
- `storage.ts` - localStorage helper utilities

### `src/components/`
- `GameBoard.tsx` - Main drop zone for combining elements
- `ElementPalette.tsx` - Sidebar grid of discovered elements
- `DraggableElement.tsx` - @dnd-kit draggable wrapper
- `DropZone.tsx` - @dnd-kit droppable zone
- `ThinkingCard.tsx` - Floating streaming response popup
- `ElementIcon.tsx` - Visual representation of elements

## Design Principles
- Frontend-only (no server components)
- LLM backend abstracted via provider pattern (OpenAI now, WebLLM future)
- Streaming responses shown in floating draggable card
- Initial elements: Fire, Water, Earth, Air

## Testing
- Unit tests with Vitest
- Component tests with Testing Library
- Run tests: `bun run test`

## ESLint
Uses @stylistic/eslint-plugin with antfu config. Key rules:
- 4-space indentation
- Double quotes
- Always trailing commas
- Blank lines between statements
