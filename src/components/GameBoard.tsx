import { useState, useRef, useEffect, useMemo, useCallback } from "react";

import { useAppStore } from "@/lib/stores/app";
import { useCombiner } from "@/lib/hooks/useCombiner";
import { SettingsModal } from "@/components/SettingsModal";
import { ThinkingCard } from "@/components/ThinkingCard";

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
        mouseDownX: 0,
        mouseDownY: 0,
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

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();

        const el = elementRef.current;
        if (!el) return;

        dragState.current = {
            active: true,
            moved: false,
            mouseDownX: e.clientX,
            mouseDownY: e.clientY,
            startLeft: parseInt(el.style.left || `${x}`, 10),
            startTop: parseInt(el.style.top || `${y}`, 10),
        };

        const handleMove = (moveEvent: MouseEvent) => {
            if (!dragState.current.active) return;

            const dx = moveEvent.clientX - dragState.current.mouseDownX;
            const dy = moveEvent.clientY - dragState.current.mouseDownY;

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

            document.removeEventListener("mousemove", handleMove);
            document.removeEventListener("mouseup", handleUp);

            if (dragState.current.moved) {
                onDragEnd(id, finalX, finalY);
            }
            else {
                onDropClick(id);
            }
        };

        document.addEventListener("mousemove", handleMove);
        document.addEventListener("mouseup", handleUp);
    };

    const selectedClass = isSelected ? "instance-selected" : "";
    const highlightedClass = isHighlighted ? "instance-hover" : "";

    return (
        <div
            ref={elementRef}
            onMouseDown={handleMouseDown}
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

    // Selection rectangle state
    const [selectionRect, setSelectionRect] = useState<{
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    } | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);

    const settings = useAppStore((state) => state.settings);
    const elements = useAppStore((state) => state.elements);
    const resetGame = useAppStore((state) => state.resetGame);

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

    // Handle keyboard delete
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Delete" || e.key === "Backspace") {
                if (selectedIds.size > 0) {
                    setCanvasElements((prev) => prev.filter((el) => !selectedIds.has(el.id)));
                    setSelectedIds(new Set());
                }
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

    // Selection rectangle handlers
    const handleSelectionStart = (e: React.MouseEvent) => {
        if (e.target !== e.currentTarget) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsSelecting(true);
        setSelectionRect({ startX: x, startY: y, endX: x, endY: y });
    };

    const handleSelectionMove = (e: React.MouseEvent) => {
        if (!isSelecting || !selectionRect) return;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setSelectionRect((prev) => prev ? { ...prev, endX: x, endY: y } : null);
    };

    const handleSelectionEnd = () => {
        if (!isSelecting || !selectionRect) {
            setIsSelecting(false);

            return;
        }

        const { startX, startY, endX, endY } = selectionRect;
        const left = Math.min(startX, endX);
        const top = Math.min(startY, endY);
        const width = Math.abs(endX - startX);
        const height = Math.abs(endY - startY);

        // Only select if rectangle is large enough
        if (width > 10 || height > 10) {
            const selected = new Set<string>();

            // Element positions are stored without scale, but displayed at 0.5 scale
            // The visual center of an element at (el.x, el.y) with scale 0.5 is approximately at:
            // (el.x + 45, el.y + 45) because scale 0.5 means visual half-size from 90px
            canvasElements.forEach((el) => {
                // Element is 46px tall, ~120px wide
                // Visual center is at (el.x + 60, el.y + 23)
                const elCenterX = el.x + 60;
                const elCenterY = el.y + 23;

                if (
                    elCenterX >= left &&
                    elCenterX <= left + width &&
                    elCenterY >= top &&
                    elCenterY <= top + height
                ) {
                    selected.add(el.id);
                }
            });

            if (selected.size > 0) {
                setSelectedIds(selected);
            }
        }

        setIsSelecting(false);
        setSelectionRect(null);
    };

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isSelecting) {
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
            <style>{`
                .container {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    background: #fff;
                    height: 100%;
                    left: 0;
                    position: fixed;
                    top: 0;
                    user-select: none;
                    width: 100%;
                }

                .instance {
                    align-items: center;
                    background: #fff;
                    border: 1px solid #ddd;
                    border-radius: 10px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                    cursor: pointer;
                    display: inline-flex;
                    gap: 10px;
                    font-size: 18px;
                    height: 46px;
                    padding: 0 14px;
                    position: absolute;
                    transition: background 0.12s, box-shadow 0.12s, rotate 0.1s;
                    white-space: nowrap;
                    z-index: 1;
                }

                .instance:hover {
                    background: #f0f8ff;
                    border-color: #a8d4ff;
                    box-shadow: 0 2px 6px rgba(0,100,200,0.12);
                }

                .instance-selected {
                    background: #e8f4ff;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
                }

                @keyframes instanceShake {
                    0%, 100% { rotate: 0deg; }
                    20% { rotate: -3deg; }
                    40% { rotate: 3deg; }
                    60% { rotate: -2deg; }
                    80% { rotate: 2deg; }
                }

                .instance-hover {
                    animation: instanceShake 0.3s ease-in-out infinite;
                    animation-delay: 0.08s;
                    background: #d0f0ff !important;
                    border-color: #00a0e0 !important;
                    box-shadow: 0 0 0 3px rgba(0, 200, 255, 0.4) !important;
                }

                .instance-emoji {
                    font-size: 22px;
                    pointer-events: none;
                }

                .instance-text {
                    font-size: 14px;
                    font-weight: 500;
                    color: #040404;
                    pointer-events: none;
                }

                .selection-rect {
                    position: absolute;
                    background: rgba(85, 164, 255, 0.1);
                    border: 1px solid rgba(85, 164, 255, 0.8);
                    pointer-events: none;
                    z-index: 0;
                }

                .sidebar {
                    background: #fff;
                    border-left: 1px solid #c8c8c8;
                    height: 100vh;
                    position: fixed;
                    right: 0;
                    top: 0;
                    width: 288px;
                    z-index: 10;
                    display: flex;
                    flex-direction: column;
                }

                .sidebar-header {
                    padding: 16px;
                    border-bottom: 1px solid #eee;
                }

                .sidebar-title {
                    font-size: 20px;
                    font-weight: 500;
                    color: #040404;
                    margin: 0;
                }

                .sidebar-count {
                    font-size: 14px;
                    color: #888;
                    margin-top: 4px;
                }

                .sidebar-search {
                    padding: 12px 16px;
                    border-bottom: 1px solid #eee;
                }

                .sidebar-input {
                    width: 100%;
                    padding: 10px 16px;
                    padding-left: 40px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    font-size: 14px;
                    background: #f8f8f8 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.3-4.3'/%3E%3C/svg%3E") no-repeat 12px center;
                    outline: none;
                    transition: border-color 0.15s, box-shadow 0.15s;
                }

                .sidebar-input:focus {
                    border-color: #0073ff;
                    box-shadow: 0 0 0 2px rgba(0, 115, 255, 0.1);
                }

                .sidebar-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 8px;
                }

                .sidebar-item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 12px;
                    border: none;
                    background: none;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: background 0.15s;
                    text-align: left;
                }

                .sidebar-item:hover {
                    background: #f5f5f5;
                }

                .sidebar-item-emoji {
                    font-size: 24px;
                }

                .sidebar-item-name {
                    font-size: 14px;
                    font-weight: 500;
                    color: #040404;
                }

                .btn {
                    padding: 8px 16px;
                    border: 1px solid #c8c8c8;
                    border-radius: 8px;
                    background: #fff;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background 0.15s, transform 0.1s;
                }

                .btn:hover {
                    background: linear-gradient(0deg, #f6f6f6 50%, #fff 90%);
                    transform: scale(1.02);
                }

                .btn:active {
                    transform: scale(0.98);
                }

                .btn-icon {
                    width: 36px;
                    height: 36px;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .controls-bottom {
                    position: fixed;
                    bottom: 12px;
                    left: 12px;
                    display: flex;
                    gap: 8px;
                    z-index: 15;
                }

                .controls-right {
                    position: fixed;
                    bottom: 12px;
                    right: calc(288px + 12px);
                    display: flex;
                    gap: 8px;
                    z-index: 15;
                }

                .header {
                    position: fixed;
                    top: 16px;
                    left: 16px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    z-index: 15;
                }

                .header-title {
                    font-size: 20px;
                    font-weight: 500;
                    color: #040404;
                }

                .header-count {
                    font-size: 14px;
                    color: #888;
                }

                .selection-info {
                    position: fixed;
                    top: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #e4d9ff;
                    border: 1px solid #b8a4e6;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-size: 14px;
                    color: #333;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .api-warning {
                    position: fixed;
                    top: 80px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #fff3cd;
                    border: 1px solid #ffc107;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    color: #856404;
                }

                .canvas {
                    position: fixed;
                    inset: 0;
                    right: 288px;
                    background: #f1f2f6;
                    cursor: default;
                    overflow: hidden;
                }

                .canvas.selecting {
                    cursor: crosshair;
                }

                .stars {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                    pointer-events: none;
                }

                .star {
                    position: absolute;
                    width: 4px;
                    height: 4px;
                    background: #ccc;
                    border-radius: 50%;
                }
            `}</style>

            <div className="container">
                {/* Header */}
                <div className="header">
                    <span style={{ fontSize: "28px" }}>⚗️</span>
                    <span className="header-title">AlchemAI</span>
                    <span className="header-count">· {Object.keys(elements).length} items</span>
                </div>

                {/* Canvas */}
                <div
                    id="game-canvas"
                    className={`canvas ${isSelecting ? "selecting" : ""}`}
                    onMouseDown={handleSelectionStart}
                    onMouseMove={handleSelectionMove}
                    onMouseUp={handleSelectionEnd}
                    onClick={handleCanvasClick}
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

                    {/* API warning */}
                    {!settings && (
                        <div className="api-warning">
                            ⚠️ Configure API key in settings to combine elements
                        </div>
                    )}
                </div>

                {/* Bottom left controls */}
                <div className="controls-bottom">
                    <button className="btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        ☰ Menu
                    </button>
                    <button className="btn" onClick={clearCanvas}>
                        Clear
                    </button>
                </div>

                {/* Bottom right controls */}
                <div className="controls-right">
                    <button className="btn btn-icon" onClick={() => setSettingsOpen(true)}>
                        ⚙️
                    </button>
                </div>

                {/* Sidebar */}
                {sidebarOpen && (
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
                            {filteredElements.map((element) => (
                                <button
                                    key={element.id}
                                    className="sidebar-item"
                                    onClick={() => handleSidebarItemClick(element)}
                                >
                                    <span className="sidebar-item-emoji">
                                        {element.emoji || "❓"}
                                    </span>
                                    <span className="sidebar-item-name">{element.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
                <ThinkingCard />
            </div>
        </>
    );
}