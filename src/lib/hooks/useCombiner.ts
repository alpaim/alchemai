import { useAppStore } from "@/lib/stores/app";
import { combineElements } from "@/lib/llm/combine";
import { getElement } from "@/lib/stores/app";

import type { Element } from "@/lib/llm/types";

interface UseCombinerResult {
    isCombining: boolean;
    error: string | null;
    combine: (firstId: string, secondId: string) => Promise<Element | null>;
}

export function useCombiner(): UseCombinerResult {
    const settings = useAppStore((state) => state.settings);
    const addElement = useAppStore((state) => state.addElement);
    const addHistory = useAppStore((state) => state.addHistory);
    const setThinkingCard = useAppStore((state) => state.setThinkingCard);
    const updateThinkingCardContent = useAppStore((state) => state.updateThinkingCardContent);
    const setActiveCombination = useAppStore((state) => state.setActiveCombination);

    const combine = async (firstId: string, secondId: string): Promise<Element | null> => {
        if (!settings) {
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
    };

    return {
        isCombining: false,
        error: null,
        combine,
    };
}