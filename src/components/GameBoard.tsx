import { useState, useRef, useEffect, useMemo, useCallback } from "react";

import { useAppStore } from "@/lib/stores/app";
import { useCombiner } from "@/lib/hooks/useCombiner";
import { SettingsModal } from "@/components/SettingsModal";
import { ThinkingCard } from "@/components/ThinkingCard";
import { AddElementModal } from "@/components/AddElementModal";

import type { Element } from "@/lib/llm/types";

interface CanvasElement {
    id: string;
    x: number;
    y: number;
    element: Element;
}

// Shared refs for drag tracking
const dragTrackingRef = {
    current: {
        isDragging: false,
        elementId: null as string | null,
        x: 0,
        y: 0,
    },
};

// Mobile detection hook
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(
        typeof window !== "undefined" ? window.innerWidth < 640 : false,
    );

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);

        window.addEventListener("resize", handleResize);

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return isMobile;
}

// Generate random stars once
const BACKGROUND_STARS = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${(i * 37) % 100}%`,
    top: `${(i * 73) % 100}%`,
    opacity: 0.3 + ((i * 13) % 40) / 100,
}));

// Canvas element that can be dragged
function CanvasElementItem({
    id,
    element,
    x,
    y,
    isSelected,
    isHighlighted,
    onDragStart,
    onDragEnd,
    onDropClick,
}: {
    id: string;
    element: Element;
    x: number;
    y: number;
    isSelected: boolean;
    isHighlighted: boolean;
    onDragStart: (id: string, x: number, y: number) => void;
    onDragEnd: (id: string, x: number, y: number) => void;
    onDropClick: (id: string) => void;
}) {
    const elementRef = useRef<HTMLDivElement>(null);
    const dragState = useRef({
        active: false,
        moved: false,
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0,
    });

    // Set position when not dragging
    useEffect(() => {
        if (elementRef.current && !dragState.current.active) {
            elementRef.current.style.left = `${x}px`;
            elementRef.current.style.top = `${y}px`;
        }
    }, [x, y]);

    const handlePointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const el = elementRef.current;
        if (!el) return;

        dragState.current = {
            active: true,
            moved: false,
            startX: e.clientX,
            startY: e.clientY,
            startLeft: parseInt(el.style.left || `${x}`, 10),
            startTop: parseInt(el.style.top || `${y}`, 10),
        };

        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        const handleMove = (moveEvent: PointerEvent) => {
            if (!dragState.current.active) return;

            const dx = moveEvent.clientX - dragState.current.startX;
            const dy = moveEvent.clientY - dragState.current.startY;

            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
                if (!dragState.current.moved) {
                    dragState.current.moved = true;
                    el.style.cursor = "grabbing";
                    el.style.zIndex = "1000";
                    el.style.transition = "none";
                    el.style.willChange = "left, top";
                    onDragStart(
                        id,
                        dragState.current.startLeft,
                        dragState.current.startTop,
                    );
                }
            }

            const newLeft = dragState.current.startLeft + dx;
            const newTop = dragState.current.startTop + dy;

            if (elementRef.current) {
                elementRef.current.style.left = `${newLeft}px`;
                elementRef.current.style.top = `${newTop}px`;
            }

            dragTrackingRef.current.x = newLeft;
            dragTrackingRef.current.y = newTop;
        };

        const handleUp = () => {
            dragState.current.active = false;

            const finalX = dragState.current.moved
                ? parseInt(elementRef.current?.style.left || `${x}`, 10)
                : dragState.current.startLeft;
            const finalY = dragState.current.moved
                ? parseInt(elementRef.current?.style.top || `${y}`, 10)
                : dragState.current.startTop;

            if (elementRef.current) {
                elementRef.current.style.cursor = "";
                elementRef.current.style.zIndex = isSelected ? "100" : "1";
                elementRef.current.style.transition = "";
                elementRef.current.style.willChange = "";
            }

            document.removeEventListener("pointermove", handleMove);
            document.removeEventListener("pointerup", handleUp);

            if (dragState.current.moved) {
                onDragEnd(id, finalX, finalY);
            }
            else {
                onDropClick(id);
            }
        };

        document.addEventListener("pointermove", handleMove);
        document.addEventListener("pointerup", handleUp);
    };

    const selectedClass = isSelected ? "instance-selected" : "";
    const highlightedClass = isHighlighted ? "instance-hover" : "";

    return (
        <div
            ref={elementRef}
            onPointerDown={handlePointerDown}
            className={`instance ${selectedClass} ${highlightedClass}`}
        >
            <span className="instance-emoji">{element.emoji || "❓"}</span>
            <span className="instance-text">{element.name}</span>
        </div>
    );
}

export function GameBoard() {
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
    const [nextId, setNextId] = useState(1);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const isMobile = useIsMobile();

    // Selection rectangle state
    const [selectionRect, setSelectionRect] = useState<{
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    } | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const justSelectedRef = useRef(false);
    const isSelectingRef = useRef(false);
    const canvasElementsRef = useRef<CanvasElement[]>([]);

    const settings = useAppStore((state) => state.settings);
    const elements = useAppStore((state) => state.elements);
    const resetGame = useAppStore((state) => state.resetGame);
    const removeElement = useAppStore((state) => state.removeElement);
    const customElementsEnabled = useAppStore((state) => state.customElementsEnabled);

    const [addElementModalOpen, setAddElementModalOpen] = useState(false);

    const BASE_ELEMENTS = ["fire", "water", "earth", "air"];

    // Expose reset to window for debugging
    useEffect(() => {
        // @ts-expect-error - intentionally adding to window for debugging
        window.resetAlchemAI = resetGame;
    }, [resetGame]);

    const { combine } = useCombiner();

    const filteredElements = useMemo(
        () =>
            Object.values(elements)
                .sort((a, b) => a.discoveredAt - b.discoveredAt)
                .filter((el) => el.name.toLowerCase().includes(searchQuery.toLowerCase())),
        [elements, searchQuery],
    );

    // Find the closest element that would be combined with the dragged element
    const getClosestTargetElement = useCallback((): string | null => {
        if (!draggedId || !dragPosition) return null;

        let closestId: string | null = null;
        let closestDistance = Infinity;

        canvasElements.forEach((el) => {
            if (el.id === draggedId) return;

            const dx = el.x - dragPosition.x;
            const dy = el.y - dragPosition.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 80 && distance < closestDistance) {
                closestDistance = distance;
                closestId = el.id;
            }
        });

        return closestId;
    }, [draggedId, dragPosition, canvasElements]);

    // Check if an element should be highlighted (only the closest target)
    const isElementHighlighted = useCallback(
        (elementId: string) => {
            if (!draggedId || !dragPosition || elementId === draggedId) return false;

            const closestId = getClosestTargetElement();

            return elementId === closestId;
        },
        [draggedId, dragPosition, getClosestTargetElement],
    );

    // Check if the dragged element should be highlighted (when near a target)
    const isDraggedElementHighlighted = useCallback(
        (elementId: string) => {
            if (elementId !== draggedId) return false;

            return getClosestTargetElement() !== null;
        },
        [draggedId, getClosestTargetElement],
    );

    // Handle keyboard delete and escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Delete" || e.key === "Backspace") {
                if (selectedIds.size > 0) {
                    setCanvasElements((prev) => prev.filter((el) => !selectedIds.has(el.id)));
                    setSelectedIds(new Set());
                }
            }
            else if (e.key === "Escape") {
                setSelectedIds(new Set());
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedIds]);

    // Track mouse position during drag for hover detection
    useEffect(() => {
        if (!draggedId) return;

        const interval = setInterval(() => {
            setDragPosition({ x: dragTrackingRef.current.x, y: dragTrackingRef.current.y });
        }, 16);

        return () => clearInterval(interval);
    }, [draggedId]);

    // Keep canvasElementsRef in sync for document-level event handlers
    useEffect(() => {
        canvasElementsRef.current = canvasElements;
    }, [canvasElements]);

    const handleDragStart = (id: string, x: number, y: number) => {
        setDraggedId(id);
        dragTrackingRef.current = { isDragging: true, elementId: id, x, y };
        setDragPosition({ x, y });
    };

    const handleDragEnd = (id: string, x: number, y: number) => {
        setDraggedId(null);
        setDragPosition(null);
        handleCanvasElementDragEnd(id, x, y);
    };

    const handleSidebarItemClick = (element: Element) => {
        const canvas = document.getElementById("game-canvas");
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();

        // On mobile, place elements in the center with random spread
        if (isMobile) {
            const spreadX = ((nextId * 17) % 80) - 40;
            const spreadY = ((nextId * 23) % 50) - 25;
            const centerX = rect.width / 2 - 50 + spreadX;
            const centerY = rect.height / 2 - 20 + spreadY;

            setCanvasElements((prev) => [
                ...prev,
                {
                    id: `canvas-${nextId}`,
                    x: centerX,
                    y: centerY,
                    element,
                },
            ]);
            setNextId((id) => id + 1);

            return;
        }

        // Desktop: original behavior with spread
        const offsetX = ((nextId * 17) % 100) - 50;
        const offsetY = ((nextId * 23) % 60) - 30;
        const centerX = rect.width / 2 - 50 + offsetX;
        const centerY = rect.height / 2 - 20 + offsetY;

        setCanvasElements((prev) => [
            ...prev,
            {
                id: `canvas-${nextId}`,
                x: centerX,
                y: centerY,
                element,
            },
        ]);
        setNextId((id) => id + 1);
    };

    const handleElementClick = (id: string) => {
        setSelectedIds(new Set([id]));
    };

    // Selection rectangle handlers - uses document-level listeners so
    // selection works even when the pointer leaves the canvas area
    // Disabled on mobile to avoid conflicts with touch scrolling
    const handleSelectionStart = (e: React.PointerEvent) => {
        // Skip selection on mobile
        if (isMobile) return;

        // Don't start selection if clicking on a canvas element
        const target = e.target as HTMLElement;
        if (target.closest(".instance")) return;

        // Clear selection when clicking on canvas background
        setSelectedIds(new Set());

        const canvasEl = e.currentTarget as HTMLElement;
        const rect = canvasEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsSelecting(true);
        justSelectedRef.current = false;
        setSelectionRect({ startX: x, startY: y, endX: x, endY: y });

        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        let hasStartedDragging = false;

        const handleMove = (moveEvent: PointerEvent) => {
            const r = canvasEl.getBoundingClientRect();
            const mx = moveEvent.clientX - r.left;
            const my = moveEvent.clientY - r.top;

            if (!hasStartedDragging) {
                const dx = mx - x;
                const dy = my - y;

                if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
                    hasStartedDragging = true;
                    isSelectingRef.current = true;
                }
            }

            setSelectionRect((prev) => prev ? { ...prev, endX: mx, endY: my } : null);
        };

        const handleUp = () => {
            document.removeEventListener("pointermove", handleMove);
            document.removeEventListener("pointerup", handleUp);

            // Read the latest selection rect via functional updater
            setSelectionRect((currentRect) => {
                if (currentRect) {
                    const { startX: sx, startY: sy, endX: ex, endY: ey } = currentRect;
                    const selLeft = Math.min(sx, ex);
                    const selTop = Math.min(sy, ey);
                    const selWidth = Math.abs(ex - sx);
                    const selHeight = Math.abs(ey - sy);

                    // Only select if rectangle is large enough
                    if (selWidth > 10 || selHeight > 10) {
                        const selected = new Set<string>();
                        const selRight = selLeft + selWidth;
                        const selBottom = selTop + selHeight;

                        // Intersection-based hit test against actual element bounds
                        canvasElementsRef.current.forEach((el) => {
                            const elRight = el.x + 100;
                            const elBottom = el.y + 46;

                            if (
                                el.x < selRight
                                && elRight > selLeft
                                && el.y < selBottom
                                && elBottom > selTop
                            ) {
                                selected.add(el.id);
                            }
                        });

                        if (selected.size > 0) {
                            setSelectedIds(selected);
                            justSelectedRef.current = true;
                        }
                    }
                }

                setIsSelecting(false);

                return null;
            });
        };

        document.addEventListener("pointermove", handleMove);
        document.addEventListener("pointerup", handleUp);
    };

    const handleCanvasClick = (e: React.PointerEvent) => {
        if (justSelectedRef.current) {
            justSelectedRef.current = false;

            return;
        }

        // Check if click is on a canvas element (or inside one)
        const target = e.target as HTMLElement;
        const isOnElement = target.closest(".instance") !== null;

        if (!isOnElement && !isSelectingRef.current) {
            setSelectedIds(new Set());
        }
    };

    const handleCanvasElementDragEnd = (id: string, x: number, y: number) => {
        setCanvasElements((prev) => {
            const draggedEl = prev.find((el) => el.id === id);
            if (!draggedEl) return prev;

            const droppedOn = prev.find((el) => {
                if (el.id === id) return false;
                const dx = el.x - x;
                const dy = el.y - y;

                return Math.sqrt(dx * dx + dy * dy) < 60;
            });

            if (droppedOn && settings) {
                // Store positions before async operation
                const droppedOnX = droppedOn.x;
                const droppedOnY = droppedOn.y;
                const draggedId = id;
                const targetId = droppedOn.id;

                combine(droppedOn.element.id, draggedEl.element.id).then((result) => {
                    if (result) {
                        setCanvasElements((current) => {
                            // Check if elements still exist (haven't been combined already)
                            const hasDragged = current.some((el) => el.id === draggedId);
                            const hasTarget = current.some((el) => el.id === targetId);

                            if (!hasDragged || !hasTarget) {
                                // Already combined or removed, don't add duplicate
                                return current;
                            }

                            return current
                                .filter((el) => el.id !== draggedId && el.id !== targetId)
                                .concat({
                                    id: `canvas-${Date.now()}`,
                                    x: droppedOnX,
                                    y: droppedOnY,
                                    element: result,
                                });
                        });
                        setSelectedIds(new Set());
                    }
                });

                return prev;
            }

            return prev.map((el) => (el.id === id ? { ...el, x, y } : el));
        });
    };

    const clearCanvas = () => {
        setCanvasElements([]);
        setSelectedIds(new Set());
    };

    return (
        <>
            <div className={`container ${isMobile ? "mobile" : ""} ${isMobile && sidebarOpen ? "drawer-open" : ""}`}>
                {/* Header */}
                <div className="header">
                    <span style={{ fontSize: "28px" }}>⚗️</span>
                    <span className="header-title">AlchemAI</span>
                    <span className="header-count">· {Object.keys(elements).length} items</span>
                </div>

                {/* Canvas */}
                <div
                    id="game-canvas"
                    className={`canvas ${isSelecting ? "selecting" : ""} ${!isMobile && !sidebarOpen ? "sidebar-closed" : ""} ${isMobile && sidebarOpen ? "drawer-open" : ""}`}
                    onPointerDown={handleSelectionStart}
                    onPointerUp={handleCanvasClick}
                >
                    {/* Background stars */}
                    <div className="stars">
                        {BACKGROUND_STARS.map((star) => (
                            <div
                                key={star.id}
                                className="star"
                                style={{
                                    left: star.left,
                                    top: star.top,
                                    opacity: star.opacity,
                                }}
                            />
                        ))}
                    </div>

                    {/* Selection rectangle */}
                    {selectionRect && (
                        <div
                            className="selection-rect"
                            style={{
                                left: Math.min(selectionRect.startX, selectionRect.endX),
                                top: Math.min(selectionRect.startY, selectionRect.endY),
                                width: Math.abs(selectionRect.endX - selectionRect.startX),
                                height: Math.abs(selectionRect.endY - selectionRect.startY),
                            }}
                        />
                    )}

                    {/* Canvas elements */}
                    {canvasElements.map((el) => (
                        <CanvasElementItem
                            key={el.id}
                            id={el.id}
                            element={el.element}
                            x={el.x}
                            y={el.y}
                            isSelected={selectedIds.has(el.id)}
                            isHighlighted={
                                el.id === draggedId
                                    ? isDraggedElementHighlighted(el.id)
                                    : isElementHighlighted(el.id)
                            }
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onDropClick={handleElementClick}
                        />
                    ))}

                    {/* Selection info */}
                    {selectedIds.size > 0 && (
                        <div className="selection-info">
                            <span>{selectedIds.size} selected</span>
                            <span>·</span>
                            <span style={{ fontSize: "12px" }}>Press Delete to remove</span>
                        </div>
                    )}

                    {/* AI status warning */}
                    {settings?.provider === "none" && (
                        <div className="api-warning">
                            ℹ️ Playing without AI - drag and drop only. Enable AI in settings to combine elements.
                        </div>
                    )}
                </div>

                {/* Bottom left controls */}
                <div className="controls-bottom">
                    <button className="btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        {isMobile ? (sidebarOpen ? "▼ Close" : "☰ Items") : "☰ Menu"}
                    </button>
                    <button className="btn" onClick={clearCanvas}>
                        Clear
                    </button>
                </div>

                {/* Bottom right controls */}
                <div className={`controls-right ${!isMobile && !sidebarOpen ? "sidebar-closed" : ""}`}>
                    <button className="btn btn-icon" onClick={() => setSettingsOpen(true)}>
                        ⚙️
                    </button>
                </div>

                {/* Sidebar - Drawer on mobile */}
                {isMobile ? (
                    <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
                        {/* Handle - always visible */}
                        <div
                            className="sidebar-handle"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            <div className="sidebar-handle-bar" />
                            {sidebarOpen && (
                                <div className="sidebar-handle-content">
                                    <div className="sidebar-handle-left">
                                        <h2 className="sidebar-title">Items</h2>
                                        <span className="sidebar-count">{filteredElements.length}</span>
                                    </div>
                                    <button
                                        className="btn btn-icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSidebarOpen(false);
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Content - only visible when open */}
                        {sidebarOpen && (
                            <div className="sidebar-content">
                                <div className="sidebar-search">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search items..."
                                        className="sidebar-input"
                                    />
                                </div>

                                <div className="sidebar-list">
                                    {filteredElements.map((element) => {
                                        const isBaseElement = BASE_ELEMENTS.includes(element.id);

                                        return (
                                            <div key={element.id} className="sidebar-item-wrapper">
                                                <button
                                                    className="sidebar-item"
                                                    onClick={() => handleSidebarItemClick(element)}
                                                >
                                                    <span className="sidebar-item-emoji">
                                                        {element.emoji || "❓"}
                                                    </span>
                                                    <span className="sidebar-item-name">{element.name}</span>
                                                    {element.recipe === null && !isBaseElement && (
                                                        <span className="sidebar-item-badge">custom</span>
                                                    )}
                                                </button>
                                                {!isBaseElement && (
                                                    <button
                                                        className="sidebar-item-delete"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeElement(element.id);
                                                        }}
                                                        title="Delete item"
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {customElementsEnabled && (
                                    <div className="sidebar-footer">
                                        <button
                                            className="sidebar-footer-btn"
                                            onClick={() => setAddElementModalOpen(true)}
                                        >
                                            + Add Custom Element
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    sidebarOpen && (
                        <div className="sidebar">
                            <div className="sidebar-header">
                                <h2 className="sidebar-title">Items</h2>
                                <p className="sidebar-count">{filteredElements.length} discovered</p>
                            </div>

                            <div className="sidebar-search">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search items..."
                                    className="sidebar-input"
                                />
                            </div>

                            <div className="sidebar-list">
                                {filteredElements.map((element) => {
                                    const isBaseElement = BASE_ELEMENTS.includes(element.id);

                                    return (
                                        <div key={element.id} className="sidebar-item-wrapper">
                                            <button
                                                className="sidebar-item"
                                                onClick={() => handleSidebarItemClick(element)}
                                            >
                                                <span className="sidebar-item-emoji">
                                                    {element.emoji || "❓"}
                                                </span>
                                                <span className="sidebar-item-name">{element.name}</span>
                                                {element.recipe === null && !isBaseElement && (
                                                    <span className="sidebar-item-badge">custom</span>
                                                )}
                                            </button>
                                            {!isBaseElement && (
                                                <button
                                                    className="sidebar-item-delete"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeElement(element.id);
                                                    }}
                                                    title="Delete item"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {customElementsEnabled && (
                                <div className="sidebar-footer">
                                    <button
                                        className="sidebar-footer-btn"
                                        onClick={() => setAddElementModalOpen(true)}
                                    >
                                        + Add Custom Element
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                )}

                <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
                <AddElementModal isOpen={addElementModalOpen} onClose={() => setAddElementModalOpen(false)} />
                <ThinkingCard />
            </div>
        </>
    );
}