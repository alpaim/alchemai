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

export interface LLMConfig {
    apiKey: string;
    baseURL: string | null;
    model: string;
}

export interface ParsedCombinationResponse {
    name: string;
    emoji: string | null;
    reasoning: string;
}