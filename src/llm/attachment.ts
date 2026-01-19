const TEXT_FILES = new Set([
    'text/plain',
    'text/markdown',
    'application/json',
    'application/x-shellscript',
]);

const WEB_SAFE_MIME_TYPES = new Set([
    ...TEXT_FILES.values(),
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
]);

/**
 * Checks if the given MIME type is safe (when it comes to XSS).
 * @param type MIME type.
 * @returns True if MIME type is "safe".
 */
export function isSafeMimeType(type: string | null): type is string {
    if (type === null) {
        return false;
    }
    return WEB_SAFE_MIME_TYPES.has(type);
}

/**
 * Saves user-provided attachment.
 * @param userId Owner of the attachment.
 * @param mimeType Media type of the data.
 * @param data The actual data from e.g. form upload.
 * @returns Id of the attachment once it has been saved.
 */
export async function saveAttachment(
    userId: string,
    mimeType: string,
    data: File,
) {
    if (!isSafeMimeType(mimeType)) {
        throw new Error();
    }
    const attachmentId = crypto.randomUUID();
    await Bun.s3.write(`uploads/${userId}/${attachmentId}.${mimeType}`, data);
    return attachmentId;
}

/**
 * Loads a previously saved attachment to memory.
 * @param userId Owner of the attachment.
 * @param attachmentId Attachment id returned by saveAttachment(...)
 * @param mimeType Media type of the data. This must match the media type
 * given to saveAttachment(...).
 * @returns Attachment content, or null if the attachment does not exist.
 */
export async function loadAttachment(
    userId: string,
    attachmentId: string,
    mimeType: string,
): Promise<ArrayBuffer | null> {
    if (!isSafeMimeType(mimeType)) {
        throw new Error();
    }
    const file = Bun.s3.file(`uploads/${userId}/${attachmentId}.${mimeType}`);
    if (!(await file.exists())) {
        return null;
    }
    return file.arrayBuffer();
}

export function tryConvertToText(
    data: ArrayBuffer,
    mimeType: string,
    name: string,
) {
    if (TEXT_FILES.has(mimeType)) {
        return wrap(new TextDecoder().decode(data), name);
    }
    // For unsupported file types, let the model know metadata and that it couldn't process the file
    return wrap(`Error! File is of unsupported type ${mimeType}.`, name);
}

function wrap(content: string, fileName: string): string {
    return `<file>
<name>${fileName}</name>
<content>
${content}
</content>
</file>`;
}
