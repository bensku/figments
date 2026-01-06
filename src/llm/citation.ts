import type z from 'zod';
import type { ModelProvider } from '@/config/schema';

type Provider = z.output<typeof ModelProvider>;

/**
 * Citation extracted from LLM response.
 */
export interface Citation {
    type: 'web_search_result_location' | 'char_location' | 'page_location';
    url?: string;
    title?: string;
    citedText?: string;
    // PDF citations (page_location)
    startPageNumber?: number;
    endPageNumber?: number;
    // Plain text citations (char_location)
    startCharIndex?: number;
    endCharIndex?: number;
}

/**
 * AI SDK source event structure (subset of fields we use).
 */
interface SourceEvent {
    sourceType: 'url' | 'document';
    url?: string;
    title?: string;
    providerMetadata?: Record<string, unknown>;
}

/**
 * Raw Anthropic streaming event structure for citations.
 */
interface AnthropicRawCitationEvent {
    type?: string;
    delta?: {
        type?: string;
        citation?: {
            type: string;
            cited_text?: string;
            url?: string;
            title?: string;
            // PDF citations
            start_page_number?: number;
            end_page_number?: number;
            // Plain text citations
            start_char_index?: number;
            end_char_index?: number;
        };
    };
}

/**
 * Extracts citation from raw streaming event.
 * Currently only Anthropic is supported - the AI SDK filters out
 * citation events, so we process raw events manually.
 *
 * @param provider The model provider
 * @param rawValue Raw event value from the stream
 * @returns Citation if found, null otherwise
 */
export function extractRawCitation(
    provider: Provider,
    rawValue: unknown,
): Citation | null {
    if (provider !== 'anthropic') {
        return null;
    }

    const raw = rawValue as AnthropicRawCitationEvent;

    if (
        raw?.type === 'content_block_delta' &&
        raw?.delta?.type === 'citations_delta' &&
        raw?.delta?.citation
    ) {
        const citation = raw.delta.citation;
        const citationType = citation.type as Citation['type'];

        // Handle all citation types from raw events
        if (
            citationType === 'web_search_result_location' ||
            citationType === 'page_location' ||
            citationType === 'char_location'
        ) {
            return {
                type: citationType,
                url: citation.url,
                title: citation.title,
                citedText: citation.cited_text,
                // Include page/char indices
                startPageNumber: citation.start_page_number,
                endPageNumber: citation.end_page_number,
                startCharIndex: citation.start_char_index,
                endCharIndex: citation.end_char_index,
            };
        }
    }

    return null;
}

/**
 * Extracts document citation from AI SDK source event.
 * Document citations (page_location, char_location) come through the
 * standard source events with citedText in provider metadata.
 *
 * @param provider The model provider
 * @param source Source event from the stream
 * @returns Citation if valid document citation, null otherwise
 */
export function extractDocumentCitation(
    provider: Provider,
    source: SourceEvent,
): Citation | null {
    if (provider !== 'anthropic') {
        return null;
    }

    // AI SDK converts Anthropic citations to this structure
    const anthropicMeta = source.providerMetadata?.anthropic as
        | {
              citedText?: string;
              // PDF citations (page_location)
              startPageNumber?: number;
              endPageNumber?: number;
              // Plain text citations (char_location)
              startCharIndex?: number;
              endCharIndex?: number;
          }
        | undefined;

    // Only process if it has citedText (actual citation)
    if (!anthropicMeta?.citedText) {
        return null;
    }

    // Determine citation type based on which indices are present
    const citationType: Citation['type'] =
        anthropicMeta.startPageNumber !== undefined
            ? 'page_location'
            : 'char_location';

    return {
        type: citationType,
        url: source.sourceType === 'url' ? source.url : undefined,
        title: source.title,
        citedText: anthropicMeta.citedText,
        // Include page/char indices
        startPageNumber: anthropicMeta.startPageNumber,
        endPageNumber: anthropicMeta.endPageNumber,
        startCharIndex: anthropicMeta.startCharIndex,
        endCharIndex: anthropicMeta.endCharIndex,
    };
}
