import { useCallback } from "react";

import { useAppStore } from "@/lib/stores/app";
import {
    combineElements,
    needsFirstRunSetup,
    hasValidOpenAIConfig,
} from "@/lib/llm/combine";
import { getElement } from "@/lib/stores/app";

import type { Element } from "@/lib/llm/types";

interface UseCombinerResult {
    isCombining: boolean;
    error: string | null;
    needsSetup: boolean;
    combine: (firstId: string, secondId: string) => Promise<Element | null>;
}

export function useCombiner(): UseCombinerResult {
    const settings = useAppStore((state) => state.settings);
    const addElement = useAppStore((state) => state.addElement);
    const addHistory = useAppStore((state) => state.addHistory);
    const setThinkingCard = useAppStore((state) => state.setThinkingCard);
    const updateThinkingCardContent = useAppStore((state) => state.updateThinkingCardContent);
    const setActiveCombination = useAppStore((state) => state.setActiveCombination);
    const setModelLoadingProgress = useAppStore((state) => state.setModelLoadingProgress);

    const needsSetup = needsFirstRunSetup(settings);

    const combine = useCallback(
        async (firstId: string, secondId: string): Promise<Element | null> => {
            if (!settings) {
                return null;
            }

            if (settings.provider === "openai" && !hasValidOpenAIConfig(settings)) {
                return null;
            }

            const firstElement = getElement(firstId);
            const secondElement = getElement(secondId);

            if (!firstElement || !secondElement) {
                return null;
            }

            setActiveCombination({ first: firstId, second: secondId });

            setThinkingCard({
                isOpen: true,
                position: { x: 100, y: 100 },
                content: "",
            });

            let fullContent = "";

            const result = await combineElements(
                settings,
                firstElement,
                secondElement,
                (chunk) => {
                    fullContent += chunk;
                    updateThinkingCardContent(fullContent);
                },
                (progress) => {
                    setModelLoadingProgress(progress);
                },
            );

            if (result.success && result.element) {
                addElement(result.element);
                addHistory({
                    first: firstId,
                    second: secondId,
                    result: result.element.id,
                });

                setThinkingCard(null);
                setActiveCombination(null);

                return result.element;
            }

            setThinkingCard(null);
            setActiveCombination(null);

            return null;
        },
        [
            settings,
            addElement,
            addHistory,
            setThinkingCard,
            updateThinkingCardContent,
            setActiveCombination,
            setModelLoadingProgress,
        ],
    );

    return {
        isCombining: false,
        error: null,
        needsSetup,
        combine,
    };
}