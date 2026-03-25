import { streamText } from "ai";

import { createOpenAI } from "@ai-sdk/openai";

import type { OpenAIConfig } from "@/lib/llm/types";

export async function* streamCombination(
    config: OpenAIConfig,
    systemPrompt: string,
    userPrompt: string,
): AsyncGenerator<string> {
    const openai = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL ?? undefined,
    });

    const { textStream } = streamText({
        model: openai(config.model),
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
    });

    for await (const chunk of textStream) {
        yield chunk;
    }
}