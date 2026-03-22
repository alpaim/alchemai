import { useState } from "react";

import { useAppStore } from "@/lib/stores/app";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const COMMON_MODELS = [
    { id: "gpt-4o-mini", name: "GPT-4o Mini (Recommended)" },
    { id: "gpt-4o", name: "GPT-4o" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const settings = useAppStore((state) => state.settings);
    const setSettings = useAppStore((state) => state.setSettings);
    const resetGame = useAppStore((state) => state.resetGame);

    const [apiKey, setApiKey] = useState(settings?.apiKey ?? "");
    const [baseURL, setBaseURL] = useState(settings?.baseURL ?? "");
    const [model, setModel] = useState(settings?.model ?? "gpt-4o-mini");

    function handleSave() {
        setSettings({
            apiKey: apiKey.trim(),
            baseURL: baseURL.trim() || null,
            model,
        });
        onClose();
    }

    function handleClear() {
        setApiKey("");
        setBaseURL("");
        setModel("gpt-4o-mini");
    }

    function handleReset() {
        if (confirm("Are you sure you want to reset all discovered elements? This cannot be undone.")) {
            resetGame();
        }
    }

    if (!isOpen) {
        return null;
    }

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-card" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2 className="settings-title">Settings</h2>
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
                            {COMMON_MODELS.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <hr className="settings-divider" />

                    <button
                        onClick={handleReset}
                        className="btn-danger"
                    >
                        🗑️ Reset all progress
                    </button>
                </div>

                <div className="settings-footer">
                    <button
                        onClick={handleClear}
                        className="btn-text"
                    >
                        Clear
                    </button>
                    <div className="settings-footer-actions">
                        <button
                            onClick={onClose}
                            className="btn-text"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="btn-primary"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
