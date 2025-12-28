import {
    type MouseEvent,
    type ReactNode,
    useCallback,
    useLayoutEffect,
    useRef,
    useState,
    type WheelEvent,
} from 'react';

interface TreeCanvasProps {
    children: ReactNode;
    /** Position to center on when the canvas mounts */
    initialCenter?: { x: number; y: number };
}

interface Transform {
    x: number;
    y: number;
    scale: number;
}

const MIN_SCALE = 0.25;
const MAX_SCALE = 2;
const ZOOM_SENSITIVITY = 0.001;

/**
 * SVG canvas with zoom and pan functionality.
 */
export function TreeCanvas({ children, initialCenter }: TreeCanvasProps) {
    const [transform, setTransform] = useState<Transform>({
        x: 20,
        y: 20,
        scale: 1,
    });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);

    // Store initial center in a ref so we only use the mount-time value
    const initialCenterRef = useRef(initialCenter);

    // Center on the initial position when the canvas mounts
    useLayoutEffect(() => {
        const center = initialCenterRef.current;
        if (!center || !svgRef.current) return;

        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();

        // Calculate transform to center the node in the viewport
        const centerX = rect.width / 2 - center.x;
        const centerY = rect.height / 2 - center.y;

        setTransform({
            x: centerX,
            y: centerY,
            scale: 1,
        });
    }, []);

    // Handle wheel zoom
    const handleWheel = useCallback(
        (e: WheelEvent<SVGSVGElement>) => {
            e.preventDefault();

            const svg = svgRef.current;
            if (!svg) return;

            const rect = svg.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Calculate new scale
            const delta = -e.deltaY * ZOOM_SENSITIVITY;
            const newScale = Math.min(
                MAX_SCALE,
                Math.max(MIN_SCALE, transform.scale * (1 + delta)),
            );

            // Zoom toward mouse position
            const scaleRatio = newScale / transform.scale;
            const newX = mouseX - (mouseX - transform.x) * scaleRatio;
            const newY = mouseY - (mouseY - transform.y) * scaleRatio;

            setTransform({
                x: newX,
                y: newY,
                scale: newScale,
            });
        },
        [transform],
    );

    // Handle pan start
    const handleMouseDown = useCallback(
        (e: MouseEvent<SVGSVGElement>) => {
            // Only pan on middle mouse button or left button with no target
            if (
                e.button === 1 ||
                (e.button === 0 && e.target === svgRef.current)
            ) {
                e.preventDefault();
                setIsPanning(true);
                setPanStart({
                    x: e.clientX - transform.x,
                    y: e.clientY - transform.y,
                });
            }
        },
        [transform],
    );

    // Handle pan move
    const handleMouseMove = useCallback(
        (e: MouseEvent<SVGSVGElement>) => {
            if (!isPanning) return;

            setTransform((prev) => ({
                ...prev,
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y,
            }));
        },
        [isPanning, panStart],
    );

    // Handle pan end
    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsPanning(false);
    }, []);

    // Reset view
    const resetView = useCallback(() => {
        setTransform({ x: 20, y: 20, scale: 1 });
    }, []);

    return (
        <div className="relative w-full h-full overflow-hidden bg-gray-50">
            {/* Controls */}
            <div className="absolute top-2 left-2 z-10 flex gap-1">
                <button
                    type="button"
                    onClick={() =>
                        setTransform((t) => ({
                            ...t,
                            scale: Math.min(MAX_SCALE, t.scale * 1.25),
                        }))
                    }
                    className="w-8 h-8 bg-white border border-gray-300 rounded
                               hover:bg-gray-100 text-gray-600 font-bold"
                    aria-label="Zoom in"
                >
                    +
                </button>
                <button
                    type="button"
                    onClick={() =>
                        setTransform((t) => ({
                            ...t,
                            scale: Math.max(MIN_SCALE, t.scale / 1.25),
                        }))
                    }
                    className="w-8 h-8 bg-white border border-gray-300 rounded
                               hover:bg-gray-100 text-gray-600 font-bold"
                    aria-label="Zoom out"
                >
                    −
                </button>
                <button
                    type="button"
                    onClick={resetView}
                    className="px-2 h-8 bg-white border border-gray-300 rounded
                               hover:bg-gray-100 text-gray-600 text-sm"
                    aria-label="Reset view"
                >
                    Reset
                </button>
            </div>

            {/* Scale indicator */}
            <div className="absolute bottom-2 right-2 z-10 text-xs text-gray-500 bg-white/80 px-2 py-1 rounded">
                {Math.round(transform.scale * 100)}%
            </div>

            {/* SVG Canvas */}
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                className={isPanning ? 'cursor-grabbing' : 'cursor-grab'}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                role="img"
                aria-label="Conversation tree visualization"
            >
                <g
                    transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}
                >
                    {children}
                </g>
            </svg>
        </div>
    );
}
