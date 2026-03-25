import { useState } from "react";

import { useAppStore } from "@/lib/stores/app";

interface AddElementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddElementModal({ isOpen, onClose }: AddElementModalProps) {
    const addCustomElement = useAppStore((state) => state.addCustomElement);
    const elements = useAppStore((state) => state.elements);

    const [name, setName] = useState("");
    const [emoji, setEmoji] = useState("");
    const [error, setError] = useState("");

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");

        const trimmedName = name.trim();

        if (!trimmedName) {
            setError("Please enter an element name");

            return;
        }

        const id = trimmedName.toLowerCase().replace(/\s+/g, "_");

        if (elements[id]) {
            setError("An element with this name already exists");

            return;
        }

        addCustomElement(trimmedName, emoji.trim());
        setName("");
        setEmoji("");
        onClose();
    }

    function handleClose() {
        setName("");
        setEmoji("");
        setError("");
        onClose();
    }

    if (!isOpen) {
        return null;
    }

    return (
        <div className="settings-overlay" onClick={handleClose}>
            <div className="settings-card" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2 className="settings-title">Add Custom Element</h2>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="settings-body">
                        <div className="settings-field">
                            <label className="settings-label">
                                Element Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Lightning"
                                className="settings-input"
                                autoFocus
                            />
                        </div>

                        <div className="settings-field">
                            <label className="settings-label">
                                Emoji <span className="settings-label-hint">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={emoji}
                                onChange={(e) => setEmoji(e.target.value)}
                                placeholder="e.g., ⚡"
                                className="settings-input"
                                maxLength={8}
                            />
                            <p className="settings-hint">
                                Enter a single emoji or leave blank
                            </p>
                        </div>

                        {error && (
                            <p className="settings-error">{error}</p>
                        )}
                    </div>

                    <div className="settings-footer">
                        <div className="settings-footer-actions">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="btn-text"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={!name.trim()}
                            >
                                Add Element
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
