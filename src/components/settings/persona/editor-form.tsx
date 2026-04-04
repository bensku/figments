import { useEffect, useMemo, useRef, useState } from 'react';
import { Select } from '@/components/ui/select';
import type { FeatureConfig, ToolConfig } from '@/config/schema';
import type { Model } from '@/context/instance';
import { useAutoExpandingTextarea } from '@/hooks/useAutoExpandingTextarea';
import { useAutoFocus } from '@/hooks/useAutoFocus';
import type { ToolMeta } from '@/llm/tool/types';
import type { Persona } from '@/tables/persona';
import { cn } from '@/utils/cn';
import { AgentList } from './agent-list';
import { CollapsibleTextarea } from './collapsible-textarea';
import { FeatureList } from './feature-list';
import { SPACING } from './styles';
import { ToolList } from './tool-list';

type FormMode = 'view' | 'edit' | 'create';

interface PersonaFormProps {
    mode: FormMode;
    personaType: 'preset' | 'agent';
    persona?: Partial<Persona>;
    models: Model[];
    tools: ToolMeta[];
    availableAgents?: Persona[];
    onSave?: (persona: Persona) => void;
    onCancel?: () => void;
    showImportByDefault?: boolean;
}

export function PersonaForm({
    mode,
    personaType,
    persona,
    models,
    tools,
    availableAgents = [],
    onSave,
    onCancel,
    showImportByDefault = false,
}: PersonaFormProps) {
    const isReadOnly = mode === 'view';

    const [title, setTitle] = useState(persona?.title ?? '');
    const [model, setModel] = useState(persona?.model ?? '');
    const [systemPrompt, setSystemPrompt] = useState(
        persona?.systemPrompt ?? '',
    );
    const [promptSuffix, setPromptSuffix] = useState(
        persona?.promptSuffix ?? '',
    );
    const [importByDefault, setImportByDefault] = useState(
        persona?.importByDefault ?? false,
    );
    const [features, setFeatures] = useState<FeatureConfig[]>(
        persona?.features ?? [],
    );
    const [enabledTools, setEnabledTools] = useState<ToolConfig[]>(
        persona?.tools ?? [],
    );
    const [agents, setAgents] = useState<string[]>(persona?.agents ?? []);
    const [maxToolCalls, setMaxToolCalls] = useState(
        persona?.maxToolCalls ?? 10,
    );
    const [agentDescription, setAgentDescription] = useState(
        persona?.agentConfig?.description ?? '',
    );
    const [agentLoopType, setAgentLoopType] = useState(
        persona?.agentConfig?.loopType ?? 'interleavedThinking',
    );

    // Reset form state when persona changes (e.g., navigating between personas)
    // We intentionally only depend on persona?.key to reset when switching personas,
    // not when individual fields change (which would fight with user edits)
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - reset only on persona identity change
    useEffect(() => {
        setTitle(persona?.title ?? '');
        setModel(persona?.model ?? '');
        setSystemPrompt(persona?.systemPrompt ?? '');
        setPromptSuffix(persona?.promptSuffix ?? '');
        setImportByDefault(persona?.importByDefault ?? false);
        setFeatures(persona?.features ?? []);
        setEnabledTools(persona?.tools ?? []);
        setAgents(persona?.agents ?? []);
        setMaxToolCalls(persona?.maxToolCalls ?? 10);
        setAgentDescription(persona?.agentConfig?.description ?? '');
        setAgentLoopType(
            persona?.agentConfig?.loopType ?? 'interleavedThinking',
        );
    }, [persona?.key]);

    // Get available features for the selected model
    const selectedModel = useMemo(
        () => models.find((m) => m.id === model),
        [models, model],
    );
    const availableFeatures = selectedModel?.features ?? [];

    const updateFeature = (
        featureId: string,
        value: boolean | number | string,
    ) => {
        const existing = features.find((f) => f.feature === featureId);
        if (existing) {
            setFeatures(
                features.map((f) =>
                    f.feature === featureId ? { feature: featureId, value } : f,
                ),
            );
        } else {
            setFeatures([...features, { feature: featureId, value }]);
        }
    };

    const removeFeature = (featureId: string) => {
        setFeatures(features.filter((f) => f.feature !== featureId));
    };

    const enableTool = (toolId: string) => {
        setEnabledTools([...enabledTools, { tool: toolId, options: {} }]);
    };

    const disableTool = (toolId: string) => {
        setEnabledTools(enabledTools.filter((t) => t.tool !== toolId));
    };

    const updateToolOption = (toolId: string, key: string, value: unknown) => {
        setEnabledTools(
            enabledTools.map((t) =>
                t.tool === toolId
                    ? { ...t, options: { ...t.options, [key]: value } }
                    : t,
            ),
        );
    };

    const resetToolOption = (toolId: string, key: string) => {
        setEnabledTools(
            enabledTools.map((t) => {
                if (t.tool !== toolId) return t;
                const { [key]: _, ...rest } = t.options;
                return { ...t, options: rest };
            }),
        );
    };

    const titleInputRef = useRef<HTMLInputElement>(null);
    useAutoFocus(mode === 'create', titleInputRef);
    const { ref: systemPromptRef, adjustHeight: adjustSystemPromptHeight } =
        useAutoExpandingTextarea();
    const { ref: promptSuffixRef, adjustHeight: adjustPromptSuffixHeight } =
        useAutoExpandingTextarea();
    const {
        ref: agentDescriptionRef,
        adjustHeight: adjustAgentDescriptionHeight,
    } = useAutoExpandingTextarea();

    // Track which optional fields are expanded
    const [showSystemPrompt, setShowSystemPrompt] = useState(
        !!(persona?.systemPrompt ?? ''),
    );
    const [showPromptSuffix, setShowPromptSuffix] = useState(
        !!(persona?.promptSuffix ?? ''),
    );

    // Reset visibility when persona changes
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - reset only on persona identity change
    useEffect(() => {
        setShowSystemPrompt(!!(persona?.systemPrompt ?? ''));
        setShowPromptSuffix(!!(persona?.promptSuffix ?? ''));
    }, [persona?.key]);

    // Adjust textarea heights when content changes or on initial load
    useEffect(() => {
        adjustSystemPromptHeight();
        adjustPromptSuffixHeight();
        adjustAgentDescriptionHeight();
    }, [
        adjustSystemPromptHeight,
        adjustPromptSuffixHeight,
        adjustAgentDescriptionHeight,
    ]);

    const toggleAgent = (agentKey: string) => {
        setAgents((prev) =>
            prev.includes(agentKey)
                ? prev.filter((k) => k !== agentKey)
                : [...prev, agentKey],
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !model) {
            return;
        }
        if (personaType === 'agent' && !agentDescription.trim()) {
            return;
        }

        const newPersona: Persona = {
            key: persona?.key ?? crypto.randomUUID(),
            title: title.trim(),
            model,
            type: personaType,
            systemPrompt: systemPrompt.trim() || null,
            promptSuffix: promptSuffix.trim() || null,
            importByDefault: showImportByDefault ? importByDefault : null,
            features,
            tools: enabledTools,
            agents: personaType === 'preset' ? agents : [],
            maxToolCalls,
            agentCallMode: 'tool',
            agentConfig:
                personaType === 'agent'
                    ? {
                          description: agentDescription.trim(),
                          loopType: agentLoopType,
                      }
                    : undefined,
        };

        onSave?.(newPersona);
    };

    const modelOptions = models.map((m) => ({
        value: m.id,
        label: m.displayName,
    }));

    return (
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3">
                {/* Basic info section */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label
                            htmlFor="title"
                            className="block text-xs font-medium text-gray-700 mb-1"
                        >
                            Title
                        </label>
                        <input
                            ref={titleInputRef}
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            disabled={isReadOnly}
                            placeholder="Enter preset title"
                            className={cn(
                                'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md',
                                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                isReadOnly && 'bg-gray-100 text-gray-500',
                            )}
                            required
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="model"
                            className="block text-xs font-medium text-gray-700 mb-1"
                        >
                            Model
                        </label>
                        <Select
                            id="model"
                            options={modelOptions}
                            value={model}
                            onChange={setModel}
                            placeholder="Select a model"
                            disabled={isReadOnly}
                        />
                    </div>
                </div>

                {/* Agent config section (agent personas only) */}
                {personaType === 'agent' && (
                    <div
                        className={`${SPACING.SECTION_GAP} pt-2 border-t border-gray-100`}
                    >
                        <div>
                            <label
                                htmlFor="agentDescription"
                                className="block text-xs font-medium text-gray-700 mb-1"
                            >
                                Description
                            </label>
                            <textarea
                                ref={agentDescriptionRef}
                                id="agentDescription"
                                value={agentDescription}
                                onChange={(e) => {
                                    setAgentDescription(e.target.value);
                                    adjustAgentDescriptionHeight();
                                }}
                                disabled={isReadOnly}
                                placeholder="Describe the agent's purpose and when to use it"
                                rows={2}
                                className={cn(
                                    'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md',
                                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                    'resize-none overflow-hidden placeholder:text-gray-400',
                                    isReadOnly && 'bg-gray-100 text-gray-500',
                                )}
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Shown to models that call this agent
                            </p>
                        </div>
                        <div>
                            <label
                                htmlFor="agentLoopType"
                                className="block text-xs font-medium text-gray-700 mb-1"
                            >
                                Loop Type
                            </label>
                            <Select
                                id="agentLoopType"
                                options={[
                                    {
                                        value: 'interleavedThinking',
                                        label: 'Interleaved Thinking',
                                    },
                                ]}
                                value={agentLoopType}
                                onChange={(v) =>
                                    setAgentLoopType(v as typeof agentLoopType)
                                }
                                disabled={isReadOnly}
                            />
                        </div>
                    </div>
                )}

                {/* Prompts section */}
                <div className={`${SPACING.SECTION_GAP} pt-2`}>
                    <CollapsibleTextarea
                        id="systemPrompt"
                        label="System Prompt"
                        value={systemPrompt}
                        onChange={setSystemPrompt}
                        onAdjustHeight={adjustSystemPromptHeight}
                        isExpanded={showSystemPrompt}
                        onExpand={() => setShowSystemPrompt(true)}
                        onCollapse={() => {
                            setSystemPrompt('');
                            setShowSystemPrompt(false);
                        }}
                        disabled={isReadOnly}
                        placeholder="Enter system prompt"
                        textareaRef={systemPromptRef}
                    />

                    <CollapsibleTextarea
                        id="promptSuffix"
                        label="Prompt Suffix"
                        value={promptSuffix}
                        onChange={setPromptSuffix}
                        onAdjustHeight={adjustPromptSuffixHeight}
                        isExpanded={showPromptSuffix}
                        onExpand={() => setShowPromptSuffix(true)}
                        onCollapse={() => {
                            setPromptSuffix('');
                            setShowPromptSuffix(false);
                        }}
                        disabled={isReadOnly}
                        placeholder="Appended to message"
                        textareaRef={promptSuffixRef}
                    />
                </div>

                {showImportByDefault && (
                    <div className="flex items-center gap-2 pt-2">
                        <input
                            id="importByDefault"
                            type="checkbox"
                            checked={importByDefault}
                            onChange={(e) =>
                                setImportByDefault(e.target.checked)
                            }
                            disabled={isReadOnly}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label
                            htmlFor="importByDefault"
                            className="text-xs text-gray-700"
                        >
                            Auto-sync to new spaces
                        </label>
                    </div>
                )}

                {availableFeatures.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                        <span className="block text-xs font-medium text-gray-700 mb-2">
                            Features
                        </span>
                        <FeatureList
                            features={availableFeatures}
                            values={features}
                            onUpdate={updateFeature}
                            onRemove={removeFeature}
                            isReadOnly={isReadOnly}
                        />
                    </div>
                )}

                {tools.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                        <span className="block text-xs font-medium text-gray-700 mb-2">
                            Tools
                        </span>
                        <ToolList
                            tools={tools}
                            values={enabledTools}
                            onEnable={enableTool}
                            onDisable={disableTool}
                            onUpdateOption={updateToolOption}
                            onResetOption={resetToolOption}
                            isReadOnly={isReadOnly}
                        />
                    </div>
                )}

                {personaType === 'preset' && (
                    <div className="pt-2 border-t border-gray-100">
                        <span className="block text-xs font-medium text-gray-700 mb-2">
                            Agents
                        </span>
                        <AgentList
                            availableAgents={availableAgents}
                            selectedAgents={agents}
                            onToggle={toggleAgent}
                            isReadOnly={isReadOnly}
                        />
                    </div>
                )}

                <div className="pt-2 border-t border-gray-100">
                    <label
                        htmlFor="maxToolCalls"
                        className="block text-xs font-medium text-gray-700 mb-1"
                    >
                        Max Tool Calls
                    </label>
                    <input
                        id="maxToolCalls"
                        type="number"
                        min={1}
                        value={maxToolCalls}
                        onChange={(e) =>
                            setMaxToolCalls(
                                Math.max(
                                    1,
                                    Number.parseInt(e.target.value, 10) || 1,
                                ),
                            )
                        }
                        disabled={isReadOnly}
                        className={cn(
                            'w-20 px-2.5 py-1.5 text-sm border border-gray-300 rounded-md',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                            isReadOnly && 'bg-gray-100 text-gray-500',
                        )}
                    />
                </div>
            </div>

            {!isReadOnly && (
                <div
                    className={`flex justify-end gap-2 ${SPACING.FOOTER} border-t border-gray-200 bg-white`}
                >
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        {mode === 'create' ? 'Create' : 'Save'}
                    </button>
                </div>
            )}
        </form>
    );
}
