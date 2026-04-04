import type { Persona } from '@/tables/persona';
import { SPACING } from './styles';

interface AgentListProps {
    availableAgents: Persona[];
    selectedAgents: string[];
    onToggle: (agentKey: string) => void;
    isReadOnly: boolean;
}

export function AgentList({
    availableAgents,
    selectedAgents,
    onToggle,
    isReadOnly,
}: AgentListProps) {
    if (availableAgents.length === 0) {
        return (
            <p className="text-xs text-gray-400">
                No agents available. Create agents in the Agents tab.
            </p>
        );
    }

    return (
        <div className={SPACING.SECTION_GAP}>
            {availableAgents.map((agent) => (
                <div key={agent.key} className="flex items-center gap-2">
                    <input
                        id={`agent-${agent.key}`}
                        type="checkbox"
                        checked={selectedAgents.includes(agent.key)}
                        onChange={() => onToggle(agent.key)}
                        disabled={isReadOnly}
                        className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                        htmlFor={`agent-${agent.key}`}
                        className="text-xs font-medium text-gray-700"
                    >
                        {agent.title}
                    </label>
                </div>
            ))}
        </div>
    );
}
