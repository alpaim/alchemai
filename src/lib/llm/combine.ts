import { SYSTEM_PROMPT, buildCombinePrompt } from "@/lib/llm/prompts";
import { streamCombination } from "@/lib/llm/providers/openai";
import type { Element, CombinationResult, LLMConfig, ParsedCombinationResponse } from "@/lib/llm/types";
import { generateId } from "@/lib/utils/id";

const combinationCache = new Map<string, Element>();

function getCacheKey(firstId: string, secondId: string): string {
    return [firstId, secondId].sort().join("+");
}

function parseCombinationResponse(response: string): ParsedCombinationResponse {
    const cleaned = response.replace(/```json\n?|\n?```/g, "").trim();

    try {
        const parsed = JSON.parse(cleaned) as ParsedCombinationResponse;

        return {
            name: parsed.name || "Unknown",
            emoji: parsed.emoji || null,
            reasoning: parsed.reasoning || "Created through mysterious means...",
        };
    }
    catch {
        return {
            name: "Unknown",
            emoji: null,
            reasoning: "The alchemy produced an unexpected result...",
        };
    }
}

export async function combineElements(
    config: LLMConfig,
    firstElement: Element,
    secondElement: Element,
    onChunk: (chunk: string) => void,
): Promise<CombinationResult> {
    const cacheKey = getCacheKey(firstElement.id, secondElement.id);
    const cached = combinationCache.get(cacheKey);

    if (cached) {
        return {
            success: true,
            element: cached,
            reasoning: "(from cache)",
        };
    }

    const prompt = buildCombinePrompt(firstElement.name, secondElement.name);
    let fullResponse = "";

    for await (const chunk of streamCombination(config, SYSTEM_PROMPT, prompt)) {
        fullResponse += chunk;
        onChunk(chunk);
    }

    const parsed = parseCombinationResponse(fullResponse);

    const newElement: Element = {
        id: generateId(parsed.name),
        name: parsed.name,
        emoji: parsed.emoji,
        discoveredAt: Date.now(),
        recipe: {
            first: firstElement.id,
            second: secondElement.id,
        },
    };

    combinationCache.set(cacheKey, newElement);

    return {
        success: true,
        element: newElement,
        reasoning: parsed.reasoning,
    };
}

export function clearCache(): void {
    combinationCache.clear();
}