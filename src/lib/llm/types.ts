export interface Element {
    id: string;
    name: string;
    emoji: string | null;
    discoveredAt: number;
    recipe: Recipe | null;
}

export interface Recipe {
    first: string;
    second: string;
}

export interface CombinationResult {
    success: boolean;
    element: Element | null;
    reasoning: string;
}

export type LLMProvider = "transformers" | "openai" | "none";

export interface TransformersInferenceConfig {
    maxTokens: number;
    temperature: number;
    topP: number;
    topK: number;
    doSample: boolean;
}

export interface OpenAIConfig {
    apiKey: string;
    baseURL: string | null;
    model: string;
}

export interface LLMConfig {
    provider: LLMProvider;
    transformers: {
        modelId: string;
        inference: TransformersInferenceConfig;
    };
    openai: OpenAIConfig | null;
}

export interface ParsedCombinationResponse {
    name: string;
    emoji: string | null;
    reasoning: string;
}

export interface ModelLoadingProgress {
    state: "idle" | "loading" | "ready" | "error";
    progress: number;
    message: string;
    usingFallback?: boolean;
}

export const DEFAULT_MODEL_ID = "alpaim/alchemai-LFM2.5-1.2B-Instruct-ONNX";

export const AVAILABLE_MODELS = [
    { id: DEFAULT_MODEL_ID, name: "alchemai LFM2.5 1.2B Instruct", size: "~750MB" },
] as const;

export const DEFAULT_INFERENCE_CONFIG: TransformersInferenceConfig = {
    maxTokens: 512,
    temperature: 0.7,
    topP: 0.9,
    topK: 50,
    doSample: true,
};

export const DEFAULT_LLM_CONFIG: LLMConfig = {
    provider: "transformers",
    transformers: {
        modelId: DEFAULT_MODEL_ID,
        inference: DEFAULT_INFERENCE_CONFIG,
    },
    openai: null,
};