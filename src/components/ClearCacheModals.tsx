interface ClearCacheConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function ClearCacheConfirmModal({
    isOpen,
    onClose,
    onConfirm,
}: ClearCacheConfirmModalProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-card" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2 className="settings-title">Clear Model Cache?</h2>
                </div>

                <div className="settings-body">
                    <p className="settings-description">
                        This will delete the downloaded AI model (~750MB) from your browser storage.
                        The model will need to be re-downloaded on the next use.
                    </p>
                    <p className="settings-hint">
                        This action cannot be undone.
                    </p>
                </div>

                <div className="settings-footer">
                    <button onClick={onClose} className="btn-text">
                        Cancel
                    </button>
                    <div className="settings-footer-actions">
                        <button onClick={onConfirm} className="btn-danger">
                            Clear Cache
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ClearCacheSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ClearCacheSuccessModal({ isOpen, onClose }: ClearCacheSuccessModalProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-card" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2 className="settings-title">Cache Cleared</h2>
                </div>

                <div className="settings-body">
                    <p className="settings-description">
                        The model cache has been cleared successfully. The next time you combine elements,
                        the model will be downloaded again.
                    </p>
                </div>

                <div className="settings-footer">
                    <button onClick={onClose} className="btn-primary">
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
