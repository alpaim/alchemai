import { useEffect } from "react";

import { GameBoard } from "@/components/GameBoard";
import { FirstRunModal } from "@/components/FirstRunModal";
import { useAppStore } from "@/lib/stores/app";
import { isTransformersReady } from "@/lib/llm/combine";

function App() {
    const settings = useAppStore((state) => state.settings);
    const firstRunCompleted = useAppStore((state) => state.firstRunCompleted);
    const setFirstRunCompleted = useAppStore((state) => state.setFirstRunCompleted);

    // If first run was completed and transformers is ready (cached), skip modal entirely
    // Only show modal if first run hasn't been completed
    const showFirstRunModal = !firstRunCompleted;

    // If first run was completed but transformers isn't ready yet (e.g., page refreshed during load),
    // mark it complete anyway - model will load when needed
    useEffect(() => {
        if (firstRunCompleted && settings.provider === "transformers" && !isTransformersReady()) {
            // Model isn't ready yet, but user already completed setup
            // Don't show modal, let it load in background when needed
        }
    }, [firstRunCompleted, settings.provider]);

    const handleFirstRunComplete = () => {
        setFirstRunCompleted(true);
    };

    const handleFirstRunSkip = () => {
        setFirstRunCompleted(true);
    };

    return (
        <>
            <GameBoard />
            <FirstRunModal
                isOpen={showFirstRunModal}
                onComplete={handleFirstRunComplete}
                onSkip={handleFirstRunSkip}
            />
        </>
    );
}

export default App;