import type { ParsedCombinationResponse } from "@/lib/llm/types";

export function alchemai_parser(response: string): ParsedCombinationResponse {
    console.log("[DEBUG] Parser input:", JSON.stringify(response));

    const content = response.trim();
    const parts = content.split(/\s+/);
    const emoji = parts.pop() || null;
    const name = parts.join(" ") || "Unknown";

    console.log("[DEBUG] Parser output:", { name, emoji });

    return {
        name,
        emoji,
        reasoning: "Created through mysterious means...",
    };
}