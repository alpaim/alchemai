import type { ParsedCombinationResponse } from "@/lib/llm/types";
import { ThinkStreamParser } from "./utils/think-parser";

export function alchemai_parser_no_emoji(response: string): ParsedCombinationResponse {
    const parser = new ThinkStreamParser();
    parser.push(response);
    parser.flush();

    const name = parser.content.trim();

    return {
        name: name || "Unknown",
        emoji: null,
        reasoning: parser.reasoning || "Created through mysterious means...",
    };
}

export function alchemai_parser_with_emoji(response: string): ParsedCombinationResponse {
    const parser = new ThinkStreamParser();
    parser.push(response);
    parser.flush();

    const content = parser.content.trim();
    const parts = content.split(/\s+/);

    const emoji = parts.pop() || null;
    const name = parts.join(" ") || "Unknown";

    return {
        name,
        emoji,
        reasoning: parser.reasoning || "Created through mysterious means...",
    };
}