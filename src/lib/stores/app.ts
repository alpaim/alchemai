import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Element, LLMConfig } from "@/lib/llm/types";

interface ThinkingCardState {
    isOpen: boolean;
    position: { x: number; y: number };
    content: string;
}

interface AppState {
    elements: Record<string, Element>;
    history: Array<{ first: string; second: string; result: string }>;
    settings: LLMConfig | null;
    thinkingCard: ThinkingCardState | null;
    activeCombination: { first: string; second: string } | null;

    addElement: (element: Element) => void;
    setElements: (elements: Record<string, Element>) => void;
    addHistory: (entry: { first: string; second: string; result: string }) => void;
    setSettings: (settings: LLMConfig | null) => void;
    setThinkingCard: (state: ThinkingCardState | null) => void;
    updateThinkingCardContent: (content: string) => void;
    setActiveCombination: (combo: { first: string; second: string } | null) => void;
    resetGame: () => void;
}

const INITIAL_ELEMENTS: Record<string, Element> = {
    fire: {
        id: "fire",
        name: "Fire",
        emoji: "\ud83d\udd25",
        discoveredAt: 0,
        recipe: null,
    },
    water: {
        id: "water",
        name: "Water",
        emoji: "\ud83d\udca7",
        discoveredAt: 0,
        recipe: null,
    },
    earth: {
        id: "earth",
        name: "Earth",
        emoji: "\ud83c\udf0d",
        discoveredAt: 0,
        recipe: null,
    },
    air: {
        id: "air",
        name: "Air",
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
            settings: null,
            thinkingCard: null,
            activeCombination: null,

            addElement: (element) =>
                set((state) => ({
                    elements: { ...state.elements, [element.id]: element },
                })),

            setElements: (elements) => set({ elements }),

            addHistory: (entry) =>
                set((state) => ({
                    history: [...state.history, entry],
                })),

            setSettings: (settings) => set({ settings }),

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
        }),
        {
            name: "alchemai-storage",
            partialize: (state) => ({
                elements: state.elements,
                history: state.history,
                settings: state.settings,
            }),
        },
    ),
);

export function getElement(id: string): Element | undefined {
    return useAppStore.getState().elements[id];
}

export function getAllElements(): Element[] {
    return Object.values(useAppStore.getState().elements);
}