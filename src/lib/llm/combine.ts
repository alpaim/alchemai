import { buildCombinePrompt } from "@/lib/llm/prompts";
import { streamCombination as streamOpenAI } from "@/lib/llm/providers/openai";
import {
    initializeTransformers,
    streamCombination as streamTransformers,
    isTransformersReady,
} from "@/lib/llm/providers/transformers";
import { alchemai_parser_no_emoji } from "@/lib/llm/parsers";
import type { Element, CombinationResult, LLMConfig } from "@/lib/llm/types";
import { generateId } from "@/lib/utils/id";

// Re-export for convenience
export { isTransformersReady } from "@/lib/llm/providers/transformers";

const combinationCache = new Map<string, Element>();

function getCacheKey(firstId: string, secondId: string): string {
    return [firstId, secondId].sort().join("+");
}

export type ProgressCallback = (progress: {
    state: "loading" | "ready" | "error";
    progress: number;
    message: string;
}) => void;

export async function ensureTransformersModel(
    config: LLMConfig,
    onProgress?: ProgressCallback,
): Promise<void> {
    // If model is already loaded and ready, just return
    if (isTransformersReady()) {
        onProgress?.({
            state: "ready",
            progress: 100,
            message: "Model ready",
        });

        return;
    }

    await initializeTransformers(
        config.transformers.modelId,
        onProgress,
    );
}

export async function combineElements(
    config: LLMConfig,
    firstElement: Element,
    secondElement: Element,
    onChunk: (chunk: string) => void,
    onProgress?: ProgressCallback,
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

    if (config.provider === "transformers") {
        for await (const chunk of streamTransformers(
            config.transformers.modelId,
            config.transformers.inference,
            prompt,
            () => ensureTransformersModel(config, onProgress),
        )) {
            fullResponse += chunk;
            onChunk(chunk);
        }
    }
    else if (config.provider === "openai") {
        if (!config.openai) {
            throw new Error("OpenAI configuration is required when using OpenAI provider");
        }

        // OpenAI still uses system prompt for non-finetuned models
        const SYSTEM_PROMPT = "You are an engine for an alchemy game. Combine the two given elements logically or creatively to produce a new single element. Output ONLY the resulting element name without punctuation or explanations.";

        for await (const chunk of streamOpenAI(config.openai, SYSTEM_PROMPT, prompt)) {
            fullResponse += chunk;
            onChunk(chunk);
        }
    }
    else if (config.provider === "none") {
        return {
            success: false,
            element: null,
            reasoning: "No AI provider configured. Enable AI in settings to combine elements.",
        };
    }
    else {
        throw new Error(`Unknown provider: ${config.provider}`);
    }

    const parsed = alchemai_parser_no_emoji(fullResponse);

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

export function hasValidOpenAIConfig(config: LLMConfig): boolean {
    return config.provider === "openai"
        && config.openai !== null
        && config.openai.apiKey.trim().length > 0;
}

export function needsFirstRunSetup(config: LLMConfig | null): boolean {
    if (!config) return true;

    if (config.provider === "transformers") {
        return !isTransformersReady();
    }

    if (config.provider === "openai") {
        return !hasValidOpenAIConfig(config);
    }

    if (config.provider === "none") {
        return false;
    }

    return true;
}