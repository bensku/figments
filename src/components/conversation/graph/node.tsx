import { hashStringToHue } from '@/utils/colors';
import type { ConversationNode } from '../types';

interface TreeNodeProps {
    node: ConversationNode;
    personaTitle: string | undefined;
    x: number;
    y: number;
    width: number;
    height: number;
    isOnPath: boolean;
    isSelected: boolean;
    onClick: () => void;
    onDoubleClick: () => void;
    onGoTo: () => void;
}

/**
 * Renders a single node in the graph view.
 */
export function TreeNode({
    node,
    personaTitle,
    x,
    y,
    width,
    height,
    isOnPath,
    isSelected,
    onClick,
    onDoubleClick,
    onGoTo,
}: TreeNodeProps) {
    const isUser = node.role === 'user';

    // Generate color from author/persona name for LLM nodes
    const colors = isUser
        ? getUserColors(isSelected, isOnPath)
        : getLlmColors(node.author, isSelected, isOnPath);

    return (
        // biome-ignore lint/a11y/useSemanticElements: SVG <g> elements cannot be replaced with <button>
        <g
            className="cursor-pointer"
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    if (isSelected) {
                        onGoTo();
                    } else {
                        onClick();
                    }
                }
            }}
            aria-label={`${node.role} message: ${node.summary || 'No summary'}`}
            aria-pressed={isSelected}
        >
            {/* Tooltip with full summary */}
            <title>{node.summary || 'No summary'}</title>

            {/* Main rectangle */}
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                rx={8}
                fill={colors.fill}
                stroke={colors.stroke}
                strokeWidth={isSelected ? 3 : 2}
                className="transition-all duration-150"
            />

            {/* Role label */}
            <text
                x={x + 8}
                y={y + 16}
                fontSize={10}
                fill={colors.text}
                className="font-semibold uppercase tracking-wide select-none"
                style={{ pointerEvents: 'none' }}
            >
                {isUser ? 'YOU' : personaTitle || 'Assistant'}
            </text>

            {/* Summary text (2 lines, truncated) */}
            {wrapText(node.summary || 'No summary', 24).map((line, i) => (
                <text
                    // biome-ignore lint/suspicious/noArrayIndexKey: Indices are stable within a single render
                    key={i}
                    x={x + 8}
                    y={y + 34 + i * 14}
                    fontSize={11}
                    fill={colors.text}
                    className="select-none"
                    style={{ pointerEvents: 'none' }}
                >
                    {line}
                </text>
            ))}

            {/* "Go to" button - small corner overlay */}
            {/* biome-ignore lint/a11y/useSemanticElements: SVG <g> elements cannot be replaced with <button> */}
            <g
                onClick={(e) => {
                    e.stopPropagation();
                    onGoTo();
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        e.preventDefault();
                        onGoTo();
                    }
                }}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label="Go to this message in conversation view"
            >
                <circle
                    cx={x + width - 6}
                    cy={y + height - 6}
                    r={10}
                    fill={colors.buttonBg}
                    className="hover:opacity-80 transition-opacity"
                />
                <text
                    x={x + width - 6}
                    y={y + height - 2}
                    fontSize={10}
                    fill={colors.buttonText}
                    textAnchor="middle"
                    className="select-none"
                    style={{ pointerEvents: 'none' }}
                >
                    →
                </text>
            </g>
        </g>
    );
}

/**
 * Wraps text into multiple lines, with the last line truncated if needed.
 */
function wrapText(text: string, lineLength: number, maxLines = 2): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length <= lineLength) {
            currentLine = testLine;
        } else {
            if (currentLine) {
                lines.push(currentLine);
                if (lines.length >= maxLines) break;
            }
            currentLine =
                word.length > lineLength ? word.slice(0, lineLength) : word;
        }
    }

    if (currentLine && lines.length < maxLines) {
        lines.push(currentLine);
    }

    // Truncate last line if there's more content
    const lastLine = lines[lines.length - 1];
    if (
        lines.length === maxLines &&
        lastLine &&
        words.join(' ').length > lines.join(' ').length
    ) {
        if (lastLine.length >= lineLength - 1) {
            lines[lines.length - 1] = `${lastLine.slice(0, lineLength - 1)}…`;
        } else {
            lines[lines.length - 1] = `${lastLine}…`;
        }
    }

    return lines.length > 0 ? lines : ['No summary'];
}

interface NodeColors {
    fill: string;
    stroke: string;
    text: string;
    buttonBg: string;
    buttonText: string;
}

function getUserColors(isSelected: boolean, isOnPath: boolean): NodeColors {
    if (isSelected) {
        return {
            fill: '#3b82f6', // blue-500
            stroke: '#1d4ed8', // blue-700
            text: '#ffffff',
            buttonBg: '#1d4ed8',
            buttonText: '#ffffff',
        };
    }
    if (isOnPath) {
        return {
            fill: '#93c5fd', // blue-300
            stroke: '#3b82f6', // blue-500
            text: '#1e3a5f',
            buttonBg: '#3b82f6',
            buttonText: '#ffffff',
        };
    }
    return {
        fill: '#dbeafe', // blue-100
        stroke: '#93c5fd', // blue-300
        text: '#1e40af',
        buttonBg: '#93c5fd',
        buttonText: '#1e40af',
    };
}

function getLlmColors(
    persona: string,
    isSelected: boolean,
    isOnPath: boolean,
): NodeColors {
    // Generate hue from persona name hash
    const hue = hashStringToHue(persona || 'default');

    if (isSelected) {
        return {
            fill: `hsl(${hue}, 70%, 50%)`,
            stroke: `hsl(${hue}, 70%, 35%)`,
            text: '#ffffff',
            buttonBg: `hsl(${hue}, 70%, 35%)`,
            buttonText: '#ffffff',
        };
    }
    if (isOnPath) {
        return {
            fill: `hsl(${hue}, 60%, 75%)`,
            stroke: `hsl(${hue}, 70%, 50%)`,
            text: `hsl(${hue}, 70%, 20%)`,
            buttonBg: `hsl(${hue}, 70%, 50%)`,
            buttonText: '#ffffff',
        };
    }
    return {
        fill: `hsl(${hue}, 50%, 90%)`,
        stroke: `hsl(${hue}, 50%, 75%)`,
        text: `hsl(${hue}, 70%, 30%)`,
        buttonBg: `hsl(${hue}, 50%, 75%)`,
        buttonText: `hsl(${hue}, 70%, 25%)`,
    };
}
