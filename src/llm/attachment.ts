import { validateId } from '@/auth/user';
import { BLOBS } from '@/utils/blob';

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
 * @param spaceId Space where the attachment is used.
 * @param userId Owner of the attachment.
 * @param mimeType Media type of the data.
 * @param data The actual data from e.g. form upload.
 * @returns Id of the attachment once it has been saved.
 */
export async function saveAttachment(
    userId: string,
    spaceId: string,
    mimeType: string,
    data: File,
) {
    validateId(userId, 'user id');
    validateId(spaceId, 'space id');
    if (!isSafeMimeType(mimeType)) {
        throw new Error();
    }
    const attachmentId = crypto.randomUUID();
    await BLOBS.write(
        `uploads/${userId}/${spaceId}/${attachmentId}.${mimeType}`,
        data,
    );
    return attachmentId;
}

/**
 * Loads a previously saved attachment to memory.
 * @param userId Owner of the attachment.
 * @param spaceId Space where the attachment is used.
 * @param attachmentId Attachment id returned by saveAttachment(...)
 * @param mimeType Media type of the data. This must match the media type
 * given to saveAttachment(...).
 * @returns Attachment content, or null if the attachment does not exist.
 */
export async function loadAttachment(
    userId: string,
    spaceId: string,
    attachmentId: string,
    mimeType: string,
): Promise<ArrayBuffer | null> {
    validateId(userId, 'user id');
    validateId(spaceId, 'space id');
    validateId(attachmentId, 'attachment id');
    if (!isSafeMimeType(mimeType)) {
        throw new Error();
    }
    return BLOBS.read(
        `uploads/${userId}/${spaceId}/${attachmentId}.${mimeType}`,
    );
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
