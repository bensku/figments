import {
    Clock,
    Database,
    Gauge,
    Hash,
    MoreHorizontal,
    Wifi,
    Zap,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Dropdown } from '@/components/ui/dropdown';
import { type NodeMetrics, useNodeMetrics } from '@/hooks/useNodeMetrics';

function formatMs(ms: number): string {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokensPerSec(tps: number): string {
    return `${Math.round(tps)} tok/s`;
}

function formatTokens(n: number): string {
    if (n >= 1000) {
        return `${(n / 1000).toFixed(1)}k`;
    }
    return `${n}`;
}

interface ChipProps {
    icon: ReactNode;
    value: string;
    title: string;
}

function Chip({ icon, value, title }: ChipProps) {
    return (
        <span className="inline-flex items-center gap-1" title={title}>
            {icon}
            {value}
        </span>
    );
}

interface PopoverRowProps {
    icon: ReactNode;
    label: string;
    value: string;
}

function PopoverRow({ icon, label, value }: PopoverRowProps) {
    return (
        <div className="flex items-center gap-2 px-2 py-1">
            <span className="text-gray-400 inline-flex">{icon}</span>
            <span className="text-gray-500 flex-1">{label}</span>
            <span className="text-gray-700 font-medium tabular-nums">
                {value}
            </span>
        </div>
    );
}

function MetricsPopover({ metrics }: { metrics: NodeMetrics }) {
    const rows: PopoverRowProps[] = [];
    if (metrics.contextPrep !== undefined) {
        rows.push({
            icon: <Database className="w-3 h-3" aria-hidden="true" />,
            label: 'Context prep',
            value: formatMs(metrics.contextPrep),
        });
    }
    if (metrics.providerHandshake !== undefined) {
        rows.push({
            icon: <Wifi className="w-3 h-3" aria-hidden="true" />,
            label: 'Provider handshake',
            value: formatMs(metrics.providerHandshake),
        });
    }
    if (metrics.ttft !== undefined) {
        rows.push({
            icon: <Zap className="w-3 h-3" aria-hidden="true" />,
            label: 'Time to first token',
            value: formatMs(metrics.ttft),
        });
    }
    if (metrics.generation !== undefined) {
        rows.push({
            icon: <Clock className="w-3 h-3" aria-hidden="true" />,
            label: 'Generation time',
            value: formatMs(metrics.generation),
        });
    }
    if (metrics.tokensPerSecond !== undefined) {
        rows.push({
            icon: <Gauge className="w-3 h-3" aria-hidden="true" />,
            label: 'Tokens/sec',
            value: formatTokensPerSec(metrics.tokensPerSecond),
        });
    }
    if (
        metrics.inputTokens !== undefined ||
        metrics.outputTokens !== undefined
    ) {
        const inTok = metrics.inputTokens ?? 0;
        const outTok = metrics.outputTokens ?? 0;
        rows.push({
            icon: <Hash className="w-3 h-3" aria-hidden="true" />,
            label: 'Tokens',
            value: `${inTok} in / ${outTok} out`,
        });
    }

    if (rows.length === 0) {
        return (
            <div className="px-2 py-1 text-xs text-gray-500">
                No additional details
            </div>
        );
    }

    return (
        <div className="text-xs min-w-[240px]">
            {rows.map((row) => (
                <PopoverRow key={row.label} {...row} />
            ))}
        </div>
    );
}

interface NodeMetricsFooterProps {
    nodeId: string;
}

export function NodeMetricsFooter({ nodeId }: NodeMetricsFooterProps) {
    const metrics = useNodeMetrics(nodeId);

    if (metrics.ttft === undefined && metrics.generation === undefined) {
        return null;
    }

    const tokenSummary =
        metrics.inputTokens !== undefined || metrics.outputTokens !== undefined
            ? `${formatTokens(metrics.inputTokens ?? 0)}/${formatTokens(metrics.outputTokens ?? 0)}`
            : undefined;

    return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: Wrapper only stops click propagation
        // biome-ignore lint/a11y/noStaticElementInteractions: Wrapper only stops click propagation
        <div
            className="mt-2 inline-flex items-center gap-3 text-xs text-gray-400"
            onClick={(e) => e.stopPropagation()}
        >
            {metrics.ttft !== undefined && (
                <Chip
                    icon={<Zap className="w-3 h-3" aria-hidden="true" />}
                    value={formatMs(metrics.ttft)}
                    title="Time to first token"
                />
            )}
            {metrics.generation !== undefined && (
                <Chip
                    icon={<Clock className="w-3 h-3" aria-hidden="true" />}
                    value={formatMs(metrics.generation)}
                    title="Generation time"
                />
            )}
            {tokenSummary !== undefined && (
                <Chip
                    icon={<Hash className="w-3 h-3" aria-hidden="true" />}
                    value={tokenSummary}
                    title="Tokens (input / output)"
                />
            )}
            {metrics.tokensPerSecond !== undefined && (
                <Chip
                    icon={<Gauge className="w-3 h-3" aria-hidden="true" />}
                    value={formatTokensPerSec(metrics.tokensPerSecond)}
                    title="Tokens per second"
                />
            )}
            <Dropdown
                trigger={
                    <button
                        type="button"
                        className="inline-flex items-center hover:text-gray-600 transition-colors"
                        title="More details"
                    >
                        <MoreHorizontal
                            className="w-3.5 h-3.5"
                            aria-hidden="true"
                        />
                    </button>
                }
                position="top"
                align="left"
            >
                <MetricsPopover metrics={metrics} />
            </Dropdown>
        </div>
    );
}
