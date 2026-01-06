import { useEffect, useMemo, useRef, useState } from 'react';
import { Select } from '@/components/ui/select';
import type { FeatureConfig } from '@/config/schema';
import type { Model } from '@/context/instance';
import { useAutoExpandingTextarea } from '@/hooks/useAutoExpandingTextarea';
import { useAutoFocus } from '@/hooks/useAutoFocus';
import type { Persona } from '@/tables/persona';

type FormMode = 'view' | 'edit' | 'create';

interface PersonaFormProps {
    mode: FormMode;
    persona?: Partial<Persona>;
    models: Model[];
    onSave?: (persona: Persona) => void;
    onCancel?: () => void;
    showImportByDefault?: boolean;
}

export function PersonaForm({
    mode,
    persona,
    models,
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
    const [prefill, setPrefill] = useState(persona?.prefill ?? '');
    const [importByDefault, setImportByDefault] = useState(
        persona?.importByDefault ?? false,
    );
    const [features, setFeatures] = useState<FeatureConfig[]>(
        persona?.features ?? [],
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
        setPrefill(persona?.prefill ?? '');
        setImportByDefault(persona?.importByDefault ?? false);
        setFeatures(persona?.features ?? []);
    }, [persona?.key]);

    // Get available features for the selected model
    const selectedModel = useMemo(
        () => models.find((m) => m.id === model),
        [models, model],
    );
    const availableFeatures = selectedModel?.features ?? [];

    const isFeatureEnabled = (featureName: string) =>
        features.some((f) => f.feature === featureName);

    const getEffortLevel = () => {
        const effort = features.find((f) => f.feature === 'effort');
        return effort?.feature === 'effort' ? effort.level : 'medium';
    };

    const toggleFeature = (featureName: string) => {
        if (isFeatureEnabled(featureName)) {
            setFeatures(features.filter((f) => f.feature !== featureName));
        } else {
            if (featureName === 'thinking') {
                setFeatures([...features, { feature: 'thinking' }]);
            } else if (featureName === 'effort') {
                setFeatures([
                    ...features,
                    { feature: 'effort', level: 'medium' },
                ]);
            } else if (featureName === 'webSearch') {
                setFeatures([...features, { feature: 'webSearch' }]);
            } else if (featureName === 'webFetch') {
                setFeatures([...features, { feature: 'webFetch' }]);
            }
        }
    };

    const setEffortLevel = (level: 'low' | 'medium' | 'high' | 'xhigh') => {
        setFeatures(
            features.map((f) =>
                f.feature === 'effort' ? { feature: 'effort', level } : f,
            ),
        );
    };

    const titleInputRef = useRef<HTMLInputElement>(null);
    useAutoFocus(mode === 'create', titleInputRef);
    const { ref: systemPromptRef, adjustHeight } = useAutoExpandingTextarea();

    // Adjust textarea height when content changes or on initial load
    useEffect(() => {
        adjustHeight();
    }, [adjustHeight]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !model) {
            return;
        }

        const newPersona: Persona = {
            key: persona?.key ?? crypto.randomUUID(),
            title: title.trim(),
            model,
            systemPrompt: systemPrompt.trim() || undefined,
            promptSuffix: promptSuffix.trim() || undefined,
            prefill: prefill.trim() || undefined,
            importByDefault: showImportByDefault ? importByDefault : undefined,
            features,
        };

        onSave?.(newPersona);
    };

    const modelOptions = models.map((m) => ({
        value: m.id,
        label: m.displayName,
    }));

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
                <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700 mb-1"
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
                    placeholder="Enter persona title"
                    className={`
                        w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        ${isReadOnly ? 'bg-gray-100 text-gray-500' : ''}
                    `}
                    required
                />
            </div>

            <div>
                <label
                    htmlFor="model"
                    className="block text-sm font-medium text-gray-700 mb-1"
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

            <div>
                <label
                    htmlFor="systemPrompt"
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    System Prompt
                </label>
                <textarea
                    ref={systemPromptRef}
                    id="systemPrompt"
                    value={systemPrompt}
                    onChange={(e) => {
                        setSystemPrompt(e.target.value);
                        adjustHeight();
                    }}
                    disabled={isReadOnly}
                    placeholder="Enter system prompt (optional)"
                    rows={3}
                    className={`
                        w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        resize-none overflow-hidden
                        ${isReadOnly ? 'bg-gray-100 text-gray-500' : ''}
                    `}
                />
            </div>

            <div>
                <label
                    htmlFor="promptSuffix"
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    Prompt Suffix
                </label>
                <input
                    id="promptSuffix"
                    type="text"
                    value={promptSuffix}
                    onChange={(e) => setPromptSuffix(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="Appended to user message (optional)"
                    className={`
                        w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        ${isReadOnly ? 'bg-gray-100 text-gray-500' : ''}
                    `}
                />
            </div>

            <div>
                <label
                    htmlFor="prefill"
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    Prefill
                </label>
                <input
                    id="prefill"
                    type="text"
                    value={prefill}
                    onChange={(e) => setPrefill(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="Prefilled in LLM responses (optional)"
                    className={`
                        w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        ${isReadOnly ? 'bg-gray-100 text-gray-500' : ''}
                    `}
                />
            </div>

            {showImportByDefault && (
                <div className="flex items-center gap-2">
                    <input
                        id="importByDefault"
                        type="checkbox"
                        checked={importByDefault}
                        onChange={(e) => setImportByDefault(e.target.checked)}
                        disabled={isReadOnly}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                        htmlFor="importByDefault"
                        className="text-sm text-gray-700"
                    >
                        Auto-sync to new spaces
                    </label>
                </div>
            )}

            {availableFeatures.length > 0 && (
                <div>
                    <span className="block text-sm font-medium text-gray-700 mb-2">
                        Features
                    </span>
                    <div className="space-y-3">
                        {availableFeatures.includes('thinking') && (
                            <div className="flex items-center gap-2">
                                <input
                                    id="feature-thinking"
                                    type="checkbox"
                                    checked={isFeatureEnabled('thinking')}
                                    onChange={() => toggleFeature('thinking')}
                                    disabled={isReadOnly}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label
                                    htmlFor="feature-thinking"
                                    className="text-sm text-gray-700"
                                >
                                    Extended thinking
                                </label>
                            </div>
                        )}
                        {availableFeatures.includes('effort') && (
                            <div className="flex items-center gap-3">
                                <input
                                    id="feature-effort"
                                    type="checkbox"
                                    checked={isFeatureEnabled('effort')}
                                    onChange={() => toggleFeature('effort')}
                                    disabled={isReadOnly}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label
                                    htmlFor="feature-effort"
                                    className="text-sm text-gray-700"
                                >
                                    Effort
                                </label>
                                {isFeatureEnabled('effort') && (
                                    <Select
                                        id="effort-level"
                                        options={[
                                            { value: 'low', label: 'Low' },
                                            {
                                                value: 'medium',
                                                label: 'Medium',
                                            },
                                            { value: 'high', label: 'High' },
                                            {
                                                value: 'xhigh',
                                                label: 'Extra High',
                                            },
                                        ]}
                                        value={getEffortLevel()}
                                        onChange={(v) =>
                                            setEffortLevel(
                                                v as
                                                    | 'low'
                                                    | 'medium'
                                                    | 'high'
                                                    | 'xhigh',
                                            )
                                        }
                                        disabled={isReadOnly}
                                    />
                                )}
                            </div>
                        )}
                        {availableFeatures.includes('webSearch') && (
                            <div className="flex items-center gap-2">
                                <input
                                    id="feature-webSearch"
                                    type="checkbox"
                                    checked={isFeatureEnabled('webSearch')}
                                    onChange={() => toggleFeature('webSearch')}
                                    disabled={isReadOnly}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label
                                    htmlFor="feature-webSearch"
                                    className="text-sm text-gray-700"
                                >
                                    Web search
                                </label>
                            </div>
                        )}
                        {availableFeatures.includes('webFetch') && (
                            <div className="flex items-center gap-2">
                                <input
                                    id="feature-webFetch"
                                    type="checkbox"
                                    checked={isFeatureEnabled('webFetch')}
                                    onChange={() => toggleFeature('webFetch')}
                                    disabled={isReadOnly}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label
                                    htmlFor="feature-webFetch"
                                    className="text-sm text-gray-700"
                                >
                                    Web fetch
                                </label>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {!isReadOnly && (
                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        {mode === 'create' ? 'Create' : 'Save'}
                    </button>
                </div>
            )}
        </form>
    );
}
