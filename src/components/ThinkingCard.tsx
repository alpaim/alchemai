import { useMemo } from "react";

import { useAppStore } from "@/lib/stores/app";

export function ThinkingCard() {
    const thinkingCard = useAppStore((state) => state.thinkingCard);
    const setThinkingCard = useAppStore((state) => state.setThinkingCard);

    // Clamp position within viewport bounds for mobile
    const position = useMemo(() => {
        if (!thinkingCard) return { x: 0, y: 0 };

        const cardWidth = 256; // w-64 = 16rem = 256px
        const cardHeight = 150; // approximate height
        const padding = 16;

        const maxX = Math.max(padding, window.innerWidth - cardWidth - padding);
        const maxY = Math.max(padding, window.innerHeight - cardHeight - padding);

        return {
            x: Math.max(padding, Math.min(thinkingCard.position.x, maxX)),
            y: Math.max(padding, Math.min(thinkingCard.position.y, maxY)),
        };
    }, [thinkingCard]);

    if (!thinkingCard?.isOpen) {
        return null;
    }

    return (
        <div
            style={{
                position: "fixed",
                left: position.x,
                top: position.y,
                zIndex: 1000,
            }}
            className="thinking-card"
        >
            <div className="thinking-card-header">
                <div className="flex items-center gap-2">
                    <span className="thinking-card-icon">✨</span>
                    <span className="thinking-card-title">Combining...</span>
                </div>
                <button
                    onClick={() => setThinkingCard(null)}
                    className="thinking-card-close"
                >
                    ×
                </button>
            </div>
            <div className="thinking-card-content">
                <pre className="thinking-card-text">
                    {thinkingCard.content || "Thinking..."}
                </pre>
            </div>
        </div>
    );
}