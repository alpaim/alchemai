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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            OpenAI API Key
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Base URL <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={baseURL}
                            onChange={(e) => setBaseURL(e.target.value)}
                            placeholder="https://api.openai.com/v1"
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-1.5">
                            For OpenAI-compatible APIs (Ollama, LM Studio, Groq, etc.)
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Model
                        </label>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        >
                            {COMMON_MODELS.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2 border-t border-gray-100">
                        <button
                            onClick={handleReset}
                            className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                        >
                            🗑️ Reset all progress
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={handleClear}
                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Clear
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-full transition-colors shadow-sm"
                        >
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}