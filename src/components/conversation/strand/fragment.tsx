import type { Row } from '@bensku/y-query';
import { ChevronRight, File as FileIcon } from 'lucide-react';
import {
    Children,
    cloneElement,
    isValidElement,
    type ReactNode,
    useEffect,
    useMemo,
    useState,
} from 'react';
import Markdown, { type Components } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { useSpace } from '@/context/space';
import type { Citation } from '@/llm/citation';
import type { FragmentTable } from '@/tables/node';

type Fragment = Row<typeof FragmentTable>;
type FragmentData = Fragment['data'];
type TextFragment = Fragment & {
    data: Extract<FragmentData, { type: 'text' }>;
};

interface FragmentProps<T extends FragmentData['type']> {
    fragment: Fragment & { data: Extract<FragmentData, { type: T }> };
}

function ThinkingFragment({ fragment }: FragmentProps<'thinking'>) {
    const [expanded, setExpanded] = useState(false);
    const [content, setContent] = useState(fragment.data.text.toString());

    useEffect(() => {
        const observer = () => {
            setContent(fragment.data.text.toString());
        };
        fragment.data.text.observe(observer);
        return () => fragment.data.text.unobserve(observer);
    }, [fragment.data.text]);

    return (
        <div className="text-sm">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                }}
                className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors hover:[text-shadow:_0_0_8px_rgb(156_163_175_/_0.5)]"
            >
                <ChevronRight
                    className={`w-3 h-3 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
                    fill="currentColor"
                    aria-hidden="true"
                />
                <span>Thinking</span>
            </button>
            {expanded && (
                <div className="mt-2 pl-4 border-l-2 border-gray-200 text-gray-500">
                    <div className="prose prose-sm prose-gray max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-code:before:content-none prose-code:after:content-none">
                        <Markdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                        >
                            {content}
                        </Markdown>
                    </div>
                </div>
            )}
        </div>
    );
}

// Marker for citation insertion points in Markdown (using Unicode private use area)
const CITE_MARKER = '\uE000';

function CitationBadge({ citation }: { citation: Citation }) {
    // Web citations with URL
    if (citation.url) {
        const domain = new URL(citation.url).hostname.replace(/^www\./, '');
        return (
            <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 rounded no-underline transition-colors"
                title={citation.citedText || citation.title}
            >
                <span className="max-w-[150px] truncate">{domain}</span>
                <span>↗</span>
            </a>
        );
    }

    // PDF/document citations (page_location or char_location)
    if (
        citation.type === 'page_location' ||
        citation.type === 'char_location'
    ) {
        const docName = citation.title || 'Document';
        const pageInfo =
            citation.type === 'page_location' && citation.startPageNumber
                ? `, p. ${citation.startPageNumber}`
                : '';
        return (
            <span
                className="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded cursor-help"
                title={citation.citedText || 'Document citation'}
            >
                <span className="max-w-[150px] truncate">{docName}</span>
                {pageInfo}
            </span>
        );
    }

    return null;
}

/**
 * Renders a group of consecutive text fragments as a single markdown block.
 * This is needed, because sometimes citations can cause e.g bullet point
 * bullets (the *'s) to be in different fragments than the list items' content.
 *
 * Citations are inserted inline using markers that get replaced in rendering.
 */
export function TextFragmentGroup({
    fragments,
}: {
    fragments: TextFragment[];
}) {
    // Build combined content with citation markers, and collect citations
    const { combinedContent, citations } = useMemo(() => {
        const allCitations: Citation[] = [];
        let content = '';

        for (const fragment of fragments) {
            content += fragment.data.text.toString();
            const fragCitations = fragment.data.citations;
            if (fragCitations && fragCitations.length > 0) {
                // Insert marker for each citation
                for (const citation of fragCitations) {
                    content += CITE_MARKER + allCitations.length;
                    allCitations.push(citation);
                }
            }
        }

        return { combinedContent: content, citations: allCitations };
    }, [fragments]);

    // Subscribe to newly added fragments
    const [content, setContent] = useState(combinedContent);
    useEffect(() => {
        const observers = fragments.map((fragment) => {
            const observer = () => {
                // Rebuild combined content
                let newContent = '';
                let citationIndex = 0;
                for (const f of fragments) {
                    newContent += f.data.text.toString();
                    const fragCitations = f.data.citations;
                    if (fragCitations && fragCitations.length > 0) {
                        for (const _ of fragCitations) {
                            newContent += CITE_MARKER + citationIndex;
                            citationIndex++;
                        }
                    }
                }
                setContent(newContent);
            };
            fragment.data.text.observe(observer);
            return { fragment, observer };
        });

        return () => {
            for (const { fragment, observer } of observers) {
                fragment.data.text.unobserve(observer);
            }
        };
    }, [fragments]);

    // Custom components that process citation markers in all text-containing elements
    const components: Components = useMemo(() => {
        const process = (children: ReactNode) =>
            processChildren(children, citations);

        // Only block-level elements need custom components - processChildren()
        // recursively handles inline elements (strong, em, a, etc.) via cloneElement
        return {
            p: ({ children, ...props }) => (
                <p {...props}>{process(children)}</p>
            ),
            li: ({ children, ...props }) => (
                <li {...props}>{process(children)}</li>
            ),
            td: ({ children, ...props }) => (
                <td {...props}>{process(children)}</td>
            ),
            th: ({ children, ...props }) => (
                <th {...props}>{process(children)}</th>
            ),
            blockquote: ({ children, ...props }) => (
                <blockquote {...props}>{process(children)}</blockquote>
            ),
            h1: ({ children, ...props }) => (
                <h1 {...props}>{process(children)}</h1>
            ),
            h2: ({ children, ...props }) => (
                <h2 {...props}>{process(children)}</h2>
            ),
            h3: ({ children, ...props }) => (
                <h3 {...props}>{process(children)}</h3>
            ),
            h4: ({ children, ...props }) => (
                <h4 {...props}>{process(children)}</h4>
            ),
            h5: ({ children, ...props }) => (
                <h5 {...props}>{process(children)}</h5>
            ),
            h6: ({ children, ...props }) => (
                <h6 {...props}>{process(children)}</h6>
            ),
        };
    }, [citations]);

    return (
        <div className="prose prose-gray max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-headings:text-lg prose-headings:font-semibold prose-h1:text-xl prose-li:marker:text-gray-500 prose-code:before:content-none prose-code:after:content-none">
            <Markdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={components}
            >
                {content}
            </Markdown>
        </div>
    );
}

/**
 * Process React children to replace citation markers with actual badges.
 */
function processChildren(
    children: ReactNode,
    citations: Citation[],
): ReactNode {
    if (!children) return children;

    return Children.map(children, (child) => {
        if (typeof child === 'string') {
            // Does this even have citations?
            if (!child.includes(CITE_MARKER)) return child;

            // Split and insert citation badges
            const parts: ReactNode[] = [];
            let lastIndex = 0;
            const markerRegex = new RegExp(`${CITE_MARKER}(\\d+)`, 'g');
            for (const match of child.matchAll(markerRegex)) {
                const matchIndex = match.index ?? 0;
                // Text before marker
                if (matchIndex > lastIndex) {
                    parts.push(child.slice(lastIndex, matchIndex));
                }
                // Citation badge
                const citationIndex = Number.parseInt(match[1] ?? '0', 10);
                const citation = citations[citationIndex];
                if (citation) {
                    parts.push(
                        <CitationBadge
                            key={`cite-${citationIndex}`}
                            citation={citation}
                        />,
                    );
                }
                lastIndex = matchIndex + match[0].length;
            }
            // Remaining text
            if (lastIndex < child.length) {
                parts.push(child.slice(lastIndex));
            }
            // Somehow no matches? Shouldn't happen since we also call includes(), but if it does...
            if (parts.length === 0) return child; // Just return original content
            return <>{parts}</>;
        }

        // For React elements, recursively process their child nodes
        if (
            isValidElement<{ children?: ReactNode }>(child) &&
            child.props.children
        ) {
            return cloneElement(
                child,
                {},
                processChildren(child.props.children, citations),
            );
        }

        return child;
    });
}

function TextFragment({ fragment }: FragmentProps<'text'>) {
    // Single text fragment - delegate to TextFragmentGroup
    return <TextFragmentGroup fragments={[fragment]} />;
}

// Special tool call renderers
type ToolCallRenderer = (props: {
    input: unknown;
    result?: unknown;
}) => React.ReactNode;

function WebSearchCallRenderer({
    input,
    result,
}: {
    input: unknown;
    result?: unknown;
}) {
    const [expanded, setExpanded] = useState(false);
    const query =
        input && typeof input === 'object' && 'query' in input
            ? String((input as { query: unknown }).query)
            : null;

    const results = Array.isArray(result)
        ? (result as WebSearchResult[])
        : null;

    return (
        <div className="text-sm">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    if (results && results.length > 0) {
                        setExpanded(!expanded);
                    }
                }}
                className={`inline-flex items-center gap-1 text-amber-700 ${results && results.length > 0 ? 'hover:text-amber-800 transition-colors hover:[text-shadow:_0_0_8px_rgb(217_119_6_/_0.4)]' : ''}`}
            >
                {results && results.length > 0 && (
                    <ChevronRight
                        className={`w-3 h-3 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
                        fill="currentColor"
                        aria-hidden="true"
                    />
                )}
                <span>Web search</span>
                {query && <span className="ml-1">&ldquo;{query}&rdquo;</span>}
                {results && results.length > 0 && (
                    <span className="ml-1 text-gray-500">
                        · {results.length} result{results.length !== 1 && 's'}
                    </span>
                )}
            </button>
            {expanded && results && results.length > 0 && (
                <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-1">
                    {results.map((r) => (
                        <div
                            key={r.url}
                            className="text-xs flex items-baseline gap-2"
                        >
                            <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-700 hover:text-gray-900 hover:underline truncate flex-1 min-w-0"
                                title={r.title}
                            >
                                {r.title}
                            </a>
                            {r.pageAge && (
                                <span className="text-gray-400 whitespace-nowrap flex-shrink-0">
                                    {r.pageAge}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const toolCallRenderers: Record<string, ToolCallRenderer> = {
    web_search: WebSearchCallRenderer,
};

interface ToolCallFragmentProps extends FragmentProps<'toolCall'> {
    result?: unknown;
}

export function ToolCallFragment({ fragment, result }: ToolCallFragmentProps) {
    const { toolName, input } = fragment.data;
    const SpecialRenderer = toolCallRenderers[toolName];

    if (SpecialRenderer) {
        return <SpecialRenderer input={input} result={result} />;
    }

    return (
        <div className="border border-amber-200 bg-amber-50 rounded px-3 py-2 text-sm">
            <span className="text-amber-700">
                <span className="font-medium">Tool Call </span>
                <span className="text-amber-600 font-mono">{toolName}</span>
            </span>
        </div>
    );
}

// Special tool result renderers
type ToolResultRenderer = (props: { output: unknown }) => React.ReactNode;

interface WebSearchResult {
    url: string;
    title: string;
    pageAge?: string;
}

function WebSearchResultRenderer({ output }: { output: unknown }) {
    const [expanded, setExpanded] = useState(false);

    if (!Array.isArray(output)) return null;

    const results = output as WebSearchResult[];
    if (results.length === 0) return null;

    return (
        <div className="text-sm">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                }}
                className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 transition-colors hover:[text-shadow:_0_0_8px_rgb(217_119_6_/_0.4)]"
            >
                <ChevronRight
                    className={`w-3 h-3 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
                    fill="currentColor"
                    aria-hidden="true"
                />
                <span>
                    {results.length} result{results.length !== 1 && 's'}
                </span>
            </button>
            {expanded && (
                <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-1">
                    {results.map((result) => (
                        <div key={result.url} className="text-xs">
                            <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-700 hover:text-gray-900 hover:underline"
                            >
                                {result.title}
                            </a>
                            {result.pageAge && (
                                <span className="text-gray-400 ml-2">
                                    {result.pageAge}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const toolResultRenderers: Record<string, ToolResultRenderer> = {
    web_search: WebSearchResultRenderer,
};

function ToolResultFragment({ fragment }: FragmentProps<'toolResult'>) {
    const { toolName, output } = fragment.data;

    // Some tool call types have their own renderers
    // This enables e.g. displaying of source URLs for web searches
    const SpecialRenderer = toolResultRenderers[toolName];
    if (SpecialRenderer) {
        return <SpecialRenderer output={output} />;
    }

    return (
        <div className="border border-green-200 bg-green-50 rounded px-3 py-2 text-sm">
            <span className="text-green-700">
                <span className="font-medium">Tool Result </span>
                <span className="text-green-600 font-mono">{toolName}</span>
            </span>
        </div>
    );
}

function ErrorFragment({ fragment }: FragmentProps<'error'>) {
    return (
        <div className="border border-red-200 bg-red-50 rounded px-3 py-2 text-base text-red-700">
            <span className="font-medium">Error</span>
            <span className="ml-2">{fragment.data.message}</span>
        </div>
    );
}

function WarningFragment({ fragment }: FragmentProps<'warning'>) {
    return (
        <div className="border border-yellow-200 bg-yellow-50 rounded px-3 py-2 text-base text-yellow-700">
            <span className="font-medium">Warning</span>
            <span className="ml-2">{fragment.data.message}</span>
        </div>
    );
}

function FileFragment({ fragment }: FragmentProps<'file'>) {
    const { spaceId } = useSpace();
    const isImage = fragment.data.mediaType.startsWith('image/');
    const src = `/api/attachment/${spaceId}/${fragment.data.attachmentId}?type=${encodeURIComponent(fragment.data.mediaType)}`;

    if (isImage) {
        return (
            <div className="my-2">
                <img
                    src={src}
                    alt={fragment.data.filename}
                    className="max-w-full max-h-96 rounded-lg border border-gray-200"
                />
                <div className="mt-1 text-xs text-gray-500">
                    {fragment.data.filename}
                </div>
            </div>
        );
    }

    return (
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm">
            <FileIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
            <span
                className="max-w-[200px] truncate"
                title={fragment.data.filename}
            >
                {fragment.data.filename}
            </span>
            <a
                href={src}
                download={fragment.data.filename}
                className="text-blue-500 hover:text-blue-700 hover:underline"
            >
                Download
            </a>
        </div>
    );
}

type FragmentComponent = (props: { fragment: Fragment }) => React.ReactNode;

const fragmentRenderers: Record<
    FragmentData['type'],
    FragmentComponent | null
> = {
    thinking: ThinkingFragment as FragmentComponent,
    text: TextFragment as FragmentComponent,
    toolCall: ToolCallFragment as FragmentComponent,
    toolResult: ToolResultFragment as FragmentComponent,
    file: FileFragment as FragmentComponent,
    turn_end: null, // Invisible on client
    error: ErrorFragment as FragmentComponent,
    warning: WarningFragment as FragmentComponent,
};

export function FragmentRenderer({ fragment }: { fragment: Fragment }) {
    const Renderer = fragmentRenderers[fragment.data.type];
    if (!Renderer) {
        return null;
    }
    return <Renderer fragment={fragment} />;
}
