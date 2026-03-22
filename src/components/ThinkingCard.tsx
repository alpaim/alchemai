import { useAppStore } from "@/lib/stores/app";

export function ThinkingCard() {
    const thinkingCard = useAppStore((state) => state.thinkingCard);
    const setThinkingCard = useAppStore((state) => state.setThinkingCard);

    if (!thinkingCard?.isOpen) {
        return null;
    }

    return (
        <div
            style={{
                position: "fixed",
                left: thinkingCard.position.x,
                top: thinkingCard.position.y,
                zIndex: 1000,
            }}
            className="w-64 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
        >
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <span className="text-sm animate-pulse">✨</span>
                    <span className="text-sm font-medium text-gray-700">Combining...</span>
                </div>
                <button
                    onClick={() => setThinkingCard(null)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 w-6 h-6 flex items-center justify-center rounded-full transition-all"
                >
                    ×
                </button>
            </div>
            <div className="p-3 max-h-40 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-xs text-gray-600 font-mono">
                    {thinkingCard.content || "Thinking..."}
                </pre>
            </div>
        </div>
    );
}