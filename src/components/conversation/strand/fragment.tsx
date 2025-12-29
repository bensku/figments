import type { Row } from '@bensku/y-query';
import { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import type { FragmentTable } from '@/tables/node';

type Fragment = Row<typeof FragmentTable>;
type FragmentData = Fragment['data'];

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
                <svg
                    className={`w-3 h-3 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                >
                    <path
                        fillRule="evenodd"
                        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                        clipRule="evenodd"
                    />
                </svg>
                <span>Thinking</span>
            </button>
            {expanded && (
                <div className="mt-2 pl-4 border-l-2 border-gray-200 text-gray-500">
                    <div className="prose prose-sm prose-gray max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-code:before:content-none prose-code:after:content-none">
                        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{content}</Markdown>
                    </div>
                </div>
            )}
        </div>
    );
}

function TextFragment({ fragment }: FragmentProps<'text'>) {
    const [content, setContent] = useState(fragment.data.text.toString());

    useEffect(() => {
        const observer = () => {
            setContent(fragment.data.text.toString());
        };
        fragment.data.text.observe(observer);
        return () => fragment.data.text.unobserve(observer);
    }, [fragment.data.text]);

    return (
        <div className="prose prose-gray max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-headings:text-lg prose-headings:font-semibold prose-h1:text-xl prose-li:marker:text-gray-500 prose-code:before:content-none prose-code:after:content-none">
            <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{content}</Markdown>
        </div>
    );
}

function ToolCallFragment(_props: FragmentProps<'toolCall'>) {
    return (
        <div className="border border-amber-200 bg-amber-50 rounded px-3 py-2 text-base text-amber-700">
            <span className="font-medium">Tool Call</span>
            <span className="text-gray-400 ml-2">(details coming soon)</span>
        </div>
    );
}

function ToolResultFragment(_props: FragmentProps<'toolResult'>) {
    return (
        <div className="border border-green-200 bg-green-50 rounded px-3 py-2 text-base text-green-700">
            <span className="font-medium">Tool Result</span>
            <span className="text-gray-400 ml-2">(details coming soon)</span>
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

type FragmentComponent = (props: { fragment: Fragment }) => React.ReactNode;

const fragmentRenderers: Record<FragmentData['type'], FragmentComponent> = {
    thinking: ThinkingFragment as FragmentComponent,
    text: TextFragment as FragmentComponent,
    toolCall: ToolCallFragment as FragmentComponent,
    toolResult: ToolResultFragment as FragmentComponent,
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
