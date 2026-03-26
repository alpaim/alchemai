import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
    Element,
    LLMConfig,
    ModelLoadingProgress,
} from "@/lib/llm/types";
import { DEFAULT_LLM_CONFIG } from "@/lib/llm/types";
import { clearModelCache } from "@/lib/llm/providers/transformers";

interface ThinkingCardState {
    isOpen: boolean;
    position: { x: number; y: number };
    content: string;
}

interface AppState {
    elements: Record<string, Element>;
    history: Array<{ first: string; second: string; result: string }>;
    settings: LLMConfig;
    customElementsEnabled: boolean;
    modelLoadingProgress: ModelLoadingProgress;
    firstRunCompleted: boolean;
    thinkingCard: ThinkingCardState | null;
    activeCombination: { first: string; second: string } | null;

    addElement: (element: Element) => void;
    addCustomElement: (name: string, emoji: string) => void;
    removeElement: (id: string) => void;
    setElements: (elements: Record<string, Element>) => void;
    addHistory: (entry: { first: string; second: string; result: string }) => void;
    setSettings: (settings: LLMConfig) => void;
    setCustomElementsEnabled: (enabled: boolean) => void;
    setModelLoadingProgress: (progress: ModelLoadingProgress) => void;
    setFirstRunCompleted: (completed: boolean) => void;
    setThinkingCard: (state: ThinkingCardState | null) => void;
    updateThinkingCardContent: (content: string) => void;
    setActiveCombination: (combo: { first: string; second: string } | null) => void;
    resetGame: () => void;
    clearModelCache: () => Promise<void>;
}

const INITIAL_ELEMENTS: Record<string, Element> = {
    fire: {
        id: "fire",
        name: "fire",
        emoji: "\ud83d\udd25",
        discoveredAt: 0,
        recipe: null,
    },
    water: {
        id: "water",
        name: "water",
        emoji: "\ud83d\udca7",
        discoveredAt: 0,
        recipe: null,
    },
    earth: {
        id: "earth",
        name: "earth",
        emoji: "\ud83c\udf0d",
        discoveredAt: 0,
        recipe: null,
    },
    air: {
        id: "air",
        name: "air",
        emoji: "\ud83d\udca8",
        discoveredAt: 0,
        recipe: null,
    },
};

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            elements: INITIAL_ELEMENTS,
            history: [],
            settings: DEFAULT_LLM_CONFIG,
            customElementsEnabled: false,
            modelLoadingProgress: { state: "idle", progress: 0, message: "" },
            firstRunCompleted: false,
            thinkingCard: null,
            activeCombination: null,

            addElement: (element) =>
                set((state) => ({
                    elements: { ...state.elements, [element.id]: element },
                })),

            addCustomElement: (name, emoji) => {
                const id = name.toLowerCase().replace(/\s+/g, "_");
                const element: Element = {
                    id,
                    name: name.toLowerCase(),
                    emoji: emoji || null,
                    discoveredAt: Date.now(),
                    recipe: null,
                };
                set((state) => ({
                    elements: { ...state.elements, [id]: element },
                }));
            },

            removeElement: (id) =>
                set((state) => {
                    const newElements = { ...state.elements };
                    delete newElements[id];

                    return { elements: newElements };
                }),

            setElements: (elements) => set({ elements }),

            addHistory: (entry) =>
                set((state) => ({
                    history: [...state.history, entry],
                })),

            setSettings: (settings) => set({ settings }),

            setCustomElementsEnabled: (customElementsEnabled) =>
                set({ customElementsEnabled }),

            setModelLoadingProgress: (modelLoadingProgress) =>
                set({ modelLoadingProgress }),

            setFirstRunCompleted: (firstRunCompleted) =>
                set({ firstRunCompleted }),

            setThinkingCard: (thinkingCard) => set({ thinkingCard }),

            updateThinkingCardContent: (content) =>
                set((state) => {
                    if (!state.thinkingCard) return state;

                    return {
                        thinkingCard: { ...state.thinkingCard, content },
                    };
                }),

            setActiveCombination: (activeCombination) =>
                set({ activeCombination }),

            resetGame: () =>
                set({
                    elements: INITIAL_ELEMENTS,
                    history: [],
                }),

            clearModelCache: async () => {
                await clearModelCache();
                set({
                    modelLoadingProgress: { state: "idle", progress: 0, message: "" },
                });
            },
        }),
        {
            name: "alchemai-storage",
            version: 2,
            partialize: (state) => ({
                elements: state.elements,
                history: state.history,
                settings: state.settings,
                customElementsEnabled: state.customElementsEnabled,
                firstRunCompleted: state.firstRunCompleted,
            }),
            merge: (persistedState, currentState) => {
                // Handle migration from old settings format
                const persisted = persistedState as Partial<AppState>;
                const merged = { ...currentState };

                if (persisted.elements) {
                    merged.elements = persisted.elements;
                }

                if (persisted.history) {
                    merged.history = persisted.history;
                }

                if (persisted.firstRunCompleted !== undefined) {
                    merged.firstRunCompleted = persisted.firstRunCompleted;
                }

                if (persisted.customElementsEnabled !== undefined) {
                    merged.customElementsEnabled = persisted.customElementsEnabled;
                }

                // Validate settings structure - if missing required fields, use defaults
                if (persisted.settings) {
                    const settings = persisted.settings as LLMConfig;

                    if (
                        settings.provider
                        && settings.transformers?.modelId
                        && settings.transformers?.inference
                    ) {
                        merged.settings = settings;
                    }
                    else {
                        // Invalid/old settings structure - reset to defaults
                        merged.settings = DEFAULT_LLM_CONFIG;
                        merged.firstRunCompleted = false;
                    }
                }

                return merged;
            },
        },
    ),
);

export function getElement(id: string): Element | undefined {
    return useAppStore.getState().elements[id];
}

export function getAllElements(): Element[] {
    return Object.values(useAppStore.getState().elements);
}