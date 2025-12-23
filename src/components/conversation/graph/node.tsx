import { hashStringToHue } from '@/utils/colors';
import type { ConversationNode } from '../types';

interface TreeNodeProps {
    node: ConversationNode;
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
                if (e.key === 'Enter') onClick();
                if (e.key === ' ') {
                    e.preventDefault();
                    onGoTo();
                }
            }}
            aria-label={`${node.role} message: ${node.summary || 'No summary'}`}
            aria-pressed={isSelected}
        >
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
                {isUser ? 'YOU' : node.author || 'LLM'}
            </text>

            {/* Summary text (truncated) */}
            <text
                x={x + 8}
                y={y + 34}
                fontSize={11}
                fill={colors.text}
                className="select-none"
                style={{ pointerEvents: 'none' }}
            >
                {truncateText(node.summary || 'No summary', 16)}
            </text>

            {/* "Go to" button */}
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
                <rect
                    x={x + width - 28}
                    y={y + height - 24}
                    width={20}
                    height={16}
                    rx={4}
                    fill={colors.buttonBg}
                    className="hover:opacity-80 transition-opacity"
                />
                <text
                    x={x + width - 23}
                    y={y + height - 12}
                    fontSize={10}
                    fill={colors.buttonText}
                    className="select-none"
                    style={{ pointerEvents: 'none' }}
                >
                    →
                </text>
            </g>
        </g>
    );
}

function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1)}…`;
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
