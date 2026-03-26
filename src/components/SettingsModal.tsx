import { useState } from "react";

import { useAppStore } from "@/lib/stores/app";
import { ClearCacheConfirmModal, ClearCacheSuccessModal } from "./ClearCacheModals";
import {
    AVAILABLE_MODELS,
    DEFAULT_INFERENCE_CONFIG,
    DEFAULT_MODEL_ID,
    DEFAULT_LLM_CONFIG,
} from "@/lib/llm/types";

import type { LLMConfig } from "@/lib/llm/types";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function getSafeSettings(settings: LLMConfig | undefined | null): LLMConfig {
    if (!settings) {
        return DEFAULT_LLM_CONFIG;
    }

    // Check if settings has required transformers structure
    if (!settings.transformers?.modelId || !settings.transformers?.inference) {
        return DEFAULT_LLM_CONFIG;
    }

    return settings;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const settings = useAppStore((state) => state.settings);
    const setSettings = useAppStore((state) => state.setSettings);
    const resetGame = useAppStore((state) => state.resetGame);
    const customElementsEnabled = useAppStore((state) => state.customElementsEnabled);
    const setCustomElementsEnabled = useAppStore((state) => state.setCustomElementsEnabled);

    const safeSettings = getSafeSettings(settings);

    const [provider, setProvider] = useState<"transformers" | "openai" | "none">(
        safeSettings.provider,
    );
    const [modelId, setModelId] = useState(
        safeSettings.transformers.modelId,
    );
    const [maxTokens, setMaxTokens] = useState(
        safeSettings.transformers.inference.maxTokens.toString(),
    );
    const [temperature, setTemperature] = useState(
        safeSettings.transformers.inference.temperature.toString(),
    );
    const [topP, setTopP] = useState(
        safeSettings.transformers.inference.topP.toString(),
    );
    const [topK, setTopK] = useState(
        safeSettings.transformers.inference.topK.toString(),
    );
    const [doSample, setDoSample] = useState(
        safeSettings.transformers.inference.doSample,
    );
    const [apiKey, setApiKey] = useState(safeSettings.openai?.apiKey ?? "");
    const [baseURL, setBaseURL] = useState(safeSettings.openai?.baseURL ?? "");
    const [openaiModel, setOpenaiModel] = useState(
        safeSettings.openai?.model ?? "gpt-4o-mini",
    );
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

    function handleSave() {
        const newSettings = {
            provider,
            transformers: {
                modelId,
                inference: {
                    maxTokens: Number.parseInt(maxTokens, 10) || 512,
                    temperature: Number.parseFloat(temperature) || 0.7,
                    topP: Number.parseFloat(topP) || 0.9,
                    topK: Number.parseInt(topK, 10) || 50,
                    doSample,
                },
            },
            openai:
                provider === "openai"
                    ? {
                        apiKey: apiKey.trim(),
                        baseURL: baseURL.trim() || null,
                        model: openaiModel,
                    }
                    : null,
        };

        setSettings(newSettings);
        onClose();
    }

    function handleClear() {
        setProvider("transformers");
        setModelId(DEFAULT_MODEL_ID);
        setMaxTokens(DEFAULT_INFERENCE_CONFIG.maxTokens.toString());
        setTemperature(DEFAULT_INFERENCE_CONFIG.temperature.toString());
        setTopP(DEFAULT_INFERENCE_CONFIG.topP.toString());
        setTopK(DEFAULT_INFERENCE_CONFIG.topK.toString());
        setDoSample(DEFAULT_INFERENCE_CONFIG.doSample);
        setApiKey("");
        setBaseURL("");
        setOpenaiModel("gpt-4o-mini");
    }

    function handleReset() {
        if (
            confirm(
                "Are you sure you want to reset all discovered elements? This cannot be undone.",
            )
        ) {
            resetGame();
        }
    }

    function handleResetSettings() {
        setSettings(DEFAULT_LLM_CONFIG);
        handleClear();
    }

    if (!isOpen) {
        return null;
    }

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-card settings-card-large" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2 className="settings-title">Settings</h2>
                </div>

                <div className="settings-body">
                    <div className="settings-section">
                        <h3 className="settings-section-title">LLM Provider</h3>

                        <div className="settings-field">
                            <label className="settings-label">
                                Provider
                            </label>
                            <div className="settings-radio-group">
                                <label className="settings-radio">
                                    <input
                                        type="radio"
                                        name="provider"
                                        value="transformers"
                                        checked={provider === "transformers"}
                                        onChange={() => setProvider("transformers")}
                                    />
                                    <span>Local (Transformers.js)</span>
                                </label>
                                <label className="settings-radio">
                                    <input
                                        type="radio"
                                        name="provider"
                                        value="openai"
                                        checked={provider === "openai"}
                                        onChange={() => setProvider("openai")}
                                    />
                                    <span>OpenAI API</span>
                                </label>
                                <label className="settings-radio">
                                    <input
                                        type="radio"
                                        name="provider"
                                        value="none"
                                        checked={provider === "none"}
                                        onChange={() => setProvider("none")}
                                    />
                                    <span>None (Offline mode)</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {provider === "transformers" && (
                        <div className="settings-section">
                            <h3 className="settings-section-title">Local Model</h3>

                            <div className="settings-field">
                                <label className="settings-label">
                                    Model
                                </label>
                                <select
                                    value={modelId}
                                    onChange={(e) => setModelId(e.target.value)}
                                    className="settings-select"
                                >
                                    {AVAILABLE_MODELS.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} ({m.size})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <h4 className="settings-subsection-title">Inference Settings</h4>

                            <div className="settings-field">
                                <label className="settings-label">
                                    Max Tokens
                                </label>
                                <input
                                    type="number"
                                    value={maxTokens}
                                    onChange={(e) => setMaxTokens(e.target.value)}
                                    className="settings-input"
                                    min="64"
                                    max="2048"
                                />
                            </div>

                            <div className="settings-field">
                                <label className="settings-label">
                                    Temperature
                                </label>
                                <input
                                    type="number"
                                    value={temperature}
                                    onChange={(e) => setTemperature(e.target.value)}
                                    className="settings-input"
                                    min="0"
                                    max="2"
                                    step="0.1"
                                />
                            </div>

                            <div className="settings-field">
                                <label className="settings-label">
                                    Top P
                                </label>
                                <input
                                    type="number"
                                    value={topP}
                                    onChange={(e) => setTopP(e.target.value)}
                                    className="settings-input"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                />
                            </div>

                            <div className="settings-field">
                                <label className="settings-label">
                                    Top K
                                </label>
                                <input
                                    type="number"
                                    value={topK}
                                    onChange={(e) => setTopK(e.target.value)}
                                    className="settings-input"
                                    min="1"
                                    max="100"
                                />
                            </div>

                            <div className="settings-field">
                                <label className="settings-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={doSample}
                                        onChange={(e) => setDoSample(e.target.checked)}
                                    />
                                    <span>Enable sampling</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {provider === "openai" && (
                        <div className="settings-section">
                            <h3 className="settings-section-title">OpenAI Configuration</h3>

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
                                    value={openaiModel}
                                    onChange={(e) => setOpenaiModel(e.target.value)}
                                    className="settings-select"
                                >
                                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                                    <option value="gpt-4o">GPT-4o</option>
                                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <hr className="settings-divider" />

                    <div className="settings-section">
                        <h3 className="settings-section-title">Custom Elements</h3>

                        <div className="settings-field">
                            <label className="settings-checkbox">
                                <input
                                    type="checkbox"
                                    checked={customElementsEnabled}
                                    onChange={(e) => setCustomElementsEnabled(e.target.checked)}
                                />
                                <span>Enable custom element creation</span>
                            </label>
                            <p className="settings-hint">
                                When enabled, you can add your own elements via the sidebar
                            </p>
                        </div>
                    </div>

                    <button onClick={handleReset} className="btn-danger">
                        Reset all progress
                    </button>

                    {provider === "transformers" && (
                        <button onClick={() => setIsConfirmModalOpen(true)} className="btn-danger">
                            Clear model cache
                        </button>
                    )}
                </div>

                <div className="settings-footer">
                    <button onClick={handleResetSettings} className="btn-text">
                        Reset Settings
                    </button>
                    <div className="settings-footer-actions">
                        <button onClick={onClose} className="btn-text">
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="btn-primary"
                            disabled={provider === "openai" && !apiKey.trim()}
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>

            <ClearCacheConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={async () => {
                    await useAppStore.getState().clearModelCache();
                    setIsConfirmModalOpen(false);
                    setIsSuccessModalOpen(true);
                }}
            />

            <ClearCacheSuccessModal
                isOpen={isSuccessModalOpen}
                onClose={() => setIsSuccessModalOpen(false)}
            />
        </div>
    );
}