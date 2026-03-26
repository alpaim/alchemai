import type { ParsedCombinationResponse } from "@/lib/llm/types";

export function alchemai_parser(response: string): ParsedCombinationResponse {
    const content = response.trim();
    const parts = content.split(/\s+/);
    const emoji = parts.pop() || null;
    const name = parts.join(" ") || "Unknown";

    return {
        name,
        emoji,
        reasoning: "Created through mysterious means...",
    };
}