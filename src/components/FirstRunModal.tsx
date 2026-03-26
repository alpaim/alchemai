import { useState } from "react";

import { useAppStore } from "@/lib/stores/app";
import { AVAILABLE_MODELS, DEFAULT_INFERENCE_CONFIG, DEFAULT_MODEL_ID } from "@/lib/llm/types";
import { ensureTransformersModel, isTransformersReady } from "@/lib/llm/combine";

interface FirstRunModalProps {
    isOpen: boolean;
    onComplete: () => void;
    onSkip: () => void;
}

type SetupMode = "choose" | "download";

export function FirstRunModal({ isOpen, onComplete, onSkip }: FirstRunModalProps) {
    const setSettings = useAppStore((state) => state.setSettings);
    const setFirstRunCompleted = useAppStore((state) => state.setFirstRunCompleted);
    const modelLoadingProgress = useAppStore((state) => state.modelLoadingProgress);
    const setModelLoadingProgress = useAppStore((state) => state.setModelLoadingProgress);

    const [mode, setMode] = useState<SetupMode>("choose");

    async function handleStartDownload() {
        // Check if model is already cached
        if (isTransformersReady()) {
            setSettings({
                provider: "transformers",
                transformers: {
                    modelId: DEFAULT_MODEL_ID,
                    inference: DEFAULT_INFERENCE_CONFIG,
                },
                openai: null,
            });
            onComplete();

            return;
        }

        setMode("download");
        setSettings({
            provider: "transformers",
            transformers: {
                modelId: DEFAULT_MODEL_ID,
                inference: DEFAULT_INFERENCE_CONFIG,
            },
            openai: null,
        });

        // Immediately show loading state
        setModelLoadingProgress({
            state: "loading",
            progress: 0,
            message: "Initializing model...",
        });

        try {
            await ensureTransformersModel(
                {
                    provider: "transformers",
                    transformers: {
                        modelId: DEFAULT_MODEL_ID,
                        inference: DEFAULT_INFERENCE_CONFIG,
                    },
                    openai: null,
                },
                (progress) => {
                    setModelLoadingProgress(progress);
                },
            );

            setFirstRunCompleted(true);
            onComplete();
        }
        catch (error) {
            setModelLoadingProgress({
                state: "error",
                progress: 0,
                message: error instanceof Error ? error.message : "Failed to load model",
            });
        }
    }

    function handleSkip() {
        setSettings({
            provider: "none",
            transformers: {
                modelId: DEFAULT_MODEL_ID,
                inference: DEFAULT_INFERENCE_CONFIG,
            },
            openai: null,
        });
        setFirstRunCompleted(true);
        onSkip();
    }

    if (!isOpen) {
        return null;
    }

    if (mode === "download") {
        const isWebGPUError = modelLoadingProgress.state === "error"
            && modelLoadingProgress.message?.includes("webgpu");

        return (
            <div className="settings-overlay">
                <div className="settings-card" onClick={(e) => e.stopPropagation()}>
                    <div className="settings-header">
                        <h2 className="settings-title">
                            {isWebGPUError ? "WebGPU Error" : "Downloading Model"}
                        </h2>
                    </div>

                    <div className="settings-body">
                        <div className="first-run-model-info">
                            <span className="first-run-model-icon">🧠</span>
                            <span className="first-run-model-name">{AVAILABLE_MODELS[0].name}</span>
                        </div>

                        <p className="first-run-description">
                            {modelLoadingProgress.state === "loading"
                                ? modelLoadingProgress.message
                                : modelLoadingProgress.state === "error"
                                    ? modelLoadingProgress.message
                                    : "Preparing to download..."}
                        </p>

                        {modelLoadingProgress.state === "loading" && (
                            <div className="first-run-progress-container">
                                <div className="first-run-progress-bar">
                                    <div
                                        className="first-run-progress-fill"
                                        style={{ width: `${modelLoadingProgress.progress}%` }}
                                    />
                                </div>
                                <span className="first-run-progress-text">
                                    {modelLoadingProgress.progress}%
                                </span>
                            </div>
                        )}

                        {modelLoadingProgress.state === "error" && (
                            <div className="first-run-error-actions">
                                <button
                                    onClick={handleSkip}
                                    className="btn btn-primary"
                                >
                                    Play without AI
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-overlay">
            <div className="settings-card" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2 className="settings-title">Welcome to AlchemAI</h2>
                </div>

                <div className="settings-body">
                    <p className="first-run-description">
                        Choose how you want to power the element combinations:
                    </p>

                    <button
                        onClick={handleStartDownload}
                        className="first-run-option first-run-option-primary"
                    >
                        <span className="first-run-option-icon">🧠</span>
                        <div className="first-run-option-content">
                            <span className="first-run-option-title">
                                Download Model (Recommended)
                            </span>
                            <span className="first-run-option-desc">
                                Download and run LFM2.5-1.2B model in your browser (~1.2GB)
                            </span>
                        </div>
                    </button>

                    <button
                        onClick={handleSkip}
                        className="first-run-option"
                    >
                        <span className="first-run-option-icon">🎮</span>
                        <div className="first-run-option-content">
                            <span className="first-run-option-title">
                                Play without AI
                            </span>
                            <span className="first-run-option-desc">
                                Use predefined combinations only (drag & drop)
                            </span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}