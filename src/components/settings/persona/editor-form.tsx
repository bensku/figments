import { useEffect, useMemo, useRef, useState } from 'react';
import { Select } from '@/components/ui/select';
import type { FeatureConfig } from '@/config/schema';
import type { Model } from '@/context/instance';
import { useAutoExpandingTextarea } from '@/hooks/useAutoExpandingTextarea';
import { useAutoFocus } from '@/hooks/useAutoFocus';
import type { Persona } from '@/tables/persona';
import { cn } from '@/utils/cn';
import { FeatureList } from './feature-list';
import { OptionalTextareaField } from './optional-textarea';
import { SPACING } from './styles';

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

    const titleInputRef = useRef<HTMLInputElement>(null);
    useAutoFocus(mode === 'create', titleInputRef);
    const { ref: systemPromptRef, adjustHeight: adjustSystemPromptHeight } =
        useAutoExpandingTextarea();
    const { ref: promptSuffixRef, adjustHeight: adjustPromptSuffixHeight } =
        useAutoExpandingTextarea();
    const { ref: prefillRef, adjustHeight: adjustPrefillHeight } =
        useAutoExpandingTextarea();

    // Track which optional fields are expanded
    const [showSystemPrompt, setShowSystemPrompt] = useState(
        !!(persona?.systemPrompt ?? ''),
    );
    const [showPromptSuffix, setShowPromptSuffix] = useState(
        !!(persona?.promptSuffix ?? ''),
    );
    const [showPrefill, setShowPrefill] = useState(!!(persona?.prefill ?? ''));

    // Reset visibility when persona changes
    // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - reset only on persona identity change
    useEffect(() => {
        setShowSystemPrompt(!!(persona?.systemPrompt ?? ''));
        setShowPromptSuffix(!!(persona?.promptSuffix ?? ''));
        setShowPrefill(!!(persona?.prefill ?? ''));
    }, [persona?.key]);

    // Adjust textarea heights when content changes or on initial load
    useEffect(() => {
        adjustSystemPromptHeight();
        adjustPromptSuffixHeight();
        adjustPrefillHeight();
    }, [
        adjustSystemPromptHeight,
        adjustPromptSuffixHeight,
        adjustPrefillHeight,
    ]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !model) {
            return;
        }

        const newPersona: Persona = {
            key: persona?.key ?? crypto.randomUUID(),
            title: title.trim(),
            model,
            systemPrompt: systemPrompt.trim() || null,
            promptSuffix: promptSuffix.trim() || null,
            prefill: prefill.trim() || null,
            importByDefault: showImportByDefault ? importByDefault : null,
            features,
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

                {/* Prompts section */}
                <div className={`${SPACING.SECTION_GAP} pt-2`}>
                    <OptionalTextareaField
                        id="systemPrompt"
                        label="System Prompt"
                        value={systemPrompt}
                        onChange={setSystemPrompt}
                        onAdjustHeight={adjustSystemPromptHeight}
                        isVisible={showSystemPrompt}
                        onShow={() => setShowSystemPrompt(true)}
                        onRemove={() => {
                            setSystemPrompt('');
                            setShowSystemPrompt(false);
                        }}
                        isReadOnly={isReadOnly}
                        placeholder="Enter system prompt"
                        textareaRef={systemPromptRef}
                    />

                    <OptionalTextareaField
                        id="promptSuffix"
                        label="Prompt Suffix"
                        value={promptSuffix}
                        onChange={setPromptSuffix}
                        onAdjustHeight={adjustPromptSuffixHeight}
                        isVisible={showPromptSuffix}
                        onShow={() => setShowPromptSuffix(true)}
                        onRemove={() => {
                            setPromptSuffix('');
                            setShowPromptSuffix(false);
                        }}
                        isReadOnly={isReadOnly}
                        placeholder="Appended to message"
                        textareaRef={promptSuffixRef}
                    />

                    <OptionalTextareaField
                        id="prefill"
                        label="Prefill"
                        value={prefill}
                        onChange={setPrefill}
                        onAdjustHeight={adjustPrefillHeight}
                        isVisible={showPrefill}
                        onShow={() => setShowPrefill(true)}
                        onRemove={() => {
                            setPrefill('');
                            setShowPrefill(false);
                        }}
                        isReadOnly={isReadOnly}
                        placeholder="Prefilled in responses"
                        textareaRef={prefillRef}
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
