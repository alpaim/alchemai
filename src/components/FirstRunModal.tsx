import { useState } from "react";

import { useAppStore } from "@/lib/stores/app";
import { AVAILABLE_MODELS, DEFAULT_INFERENCE_CONFIG, DEFAULT_MODEL_ID } from "@/lib/llm/types";
import { ensureTransformersModel, isTransformersReady } from "@/lib/llm/combine";

interface FirstRunModalProps {
    isOpen: boolean;
    onComplete: () => void;
    onSkip: () => void;
}

type SetupMode = "choose" | "download" | "openai";

export function FirstRunModal({ isOpen, onComplete, onSkip }: FirstRunModalProps) {
    const setSettings = useAppStore((state) => state.setSettings);
    const setFirstRunCompleted = useAppStore((state) => state.setFirstRunCompleted);
    const modelLoadingProgress = useAppStore((state) => state.modelLoadingProgress);
    const setModelLoadingProgress = useAppStore((state) => state.setModelLoadingProgress);

    const [mode, setMode] = useState<SetupMode>("choose");
    const [apiKey, setApiKey] = useState("");
    const [baseURL, setBaseURL] = useState("");
    const [model, setModel] = useState("gpt-4o-mini");

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

    function handleOpenAISetup() {
        setMode("openai");
    }

    function handleOpenAISave() {
        setSettings({
            provider: "openai",
            transformers: {
                modelId: DEFAULT_MODEL_ID,
                inference: DEFAULT_INFERENCE_CONFIG,
            },
            openai: {
                apiKey: apiKey.trim(),
                baseURL: baseURL.trim() || null,
                model,
            },
        });
        setFirstRunCompleted(true);
        onComplete();
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
                                    className="btn btn-text"
                                >
                                    Skip and play without AI
                                </button>
                                <button
                                    onClick={handleOpenAISetup}
                                    className="btn btn-primary"
                                >
                                    Use OpenAI API instead
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (mode === "openai") {
        return (
            <div className="settings-overlay">
                <div className="settings-card settings-card-large" onClick={(e) => e.stopPropagation()}>
                    <div className="settings-header">
                        <h2 className="settings-title">Configure OpenAI API</h2>
                    </div>

                    <div className="settings-body">
                        <div className="settings-field">
                            <label className="settings-label">
                                OpenAI API Key
                            </label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="sk-..."
                                className="settings-input"
                            />
                        </div>

                        <div className="settings-field">
                            <label className="settings-label">
                                Base URL <span className="settings-label-hint">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={baseURL}
                                onChange={(e) => setBaseURL(e.target.value)}
                                placeholder="https://api.openai.com/v1"
                                className="settings-input"
                            />
                            <p className="settings-hint">
                                For OpenAI-compatible APIs (llama.cpp, LM Studio, Groq, etc.)
                            </p>
                        </div>

                        <div className="settings-field">
                            <label className="settings-label">
                                Model
                            </label>
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="settings-select"
                            >
                                <option value="gpt-4o-mini">GPT-4o Mini</option>
                                <option value="gpt-4o">GPT-4o</option>
                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                            </select>
                        </div>
                    </div>

                    <div className="settings-footer">
                        <button
                            onClick={() => setMode("choose")}
                            className="btn-text"
                        >
                            Back
                        </button>
                        <div className="settings-footer-actions">
                            <button
                                onClick={handleSkip}
                                className="btn-text"
                            >
                                Skip
                            </button>
                            <button
                                onClick={handleOpenAISave}
                                className="btn-primary"
                                disabled={!apiKey.trim()}
                            >
                                Save and Continue
                            </button>
                        </div>
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
                                Run Locally (Recommended)
                            </span>
                            <span className="first-run-option-desc">
                                Download and run LFM2.5-1.2B model in your browser (~750MB)
                            </span>
                        </div>
                    </button>

                    <button
                        onClick={handleOpenAISetup}
                        className="first-run-option"
                    >
                        <span className="first-run-option-icon">☁️</span>
                        <div className="first-run-option-content">
                            <span className="first-run-option-title">
                                Use OpenAI API
                            </span>
                            <span className="first-run-option-desc">
                                Connect to OpenAI or compatible API (requires API key)
                            </span>
                        </div>
                    </button>

                    <button
                        onClick={handleSkip}
                        className="first-run-skip"
                    >
                        Play without AI (drag & drop only)
                    </button>
                </div>
            </div>
        </div>
    );
}