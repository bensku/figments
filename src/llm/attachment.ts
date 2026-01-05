const TEXT_FILES = new Set(['text/plain', 'text/markdown', 'application/json', 'application/x-shellscript']);

export function tryConvertToText(
    data: ArrayBuffer,
    mediaType: string,
    name: string,
) {
    if (TEXT_FILES.has(mediaType)) {
        return wrap(new TextDecoder().decode(data), name);
    }
    // For unsupported file types, let the model know metadata and that it couldn't process the file
    return wrap(`Error! File is of unsupported type ${mediaType}.`, name);
}

function wrap(content: string, fileName: string): string {
    return `<file>
<name>${fileName}</name>
<content>
${content}
</content>
</file>`;
}
