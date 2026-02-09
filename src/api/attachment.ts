import { checkAccess } from '@/auth/acl';
import { requireUser } from '@/auth/hook';
import { validateId } from '@/auth/user';
import {
    isSafeMimeType,
    loadAttachment,
    saveAttachment,
} from '@/llm/attachment';
import { router } from './router';

export const attachmentRoutes = router({
    // Serve uploaded attachments
    '/api/attachment/:spaceId/:id': async (req) => {
        const session = await requireUser(req);
        const spaceId = validateId(req.params.spaceId, 'space id');
        const attachmentId = validateId(req.params.id, 'attachment id');
        checkAccess(session, [
            {
                type: 'read-upload',
                resource: `${session.user.id}/${spaceId}/${attachmentId}`,
            },
        ]);

        const url = new URL(req.url);

        // y-query data describes what type this is
        const mimeType = url.searchParams.get('type');
        if (!isSafeMimeType(mimeType)) {
            // But permit only safe types to prevent users from XSSing themself
            // in case they're somehow convinced to upload dangerous attachments
            // (plus this is very important if sharing is ever implemented!)
            return new Response('type not allowed', { status: 400 });
        }
        const content = await loadAttachment(
            session.user.id,
            spaceId,
            attachmentId,
            mimeType,
        );
        if (content === null) {
            return new Response('not found', { status: 404 });
        }

        return new Response(content, {
            headers: { 'Content-Type': mimeType },
        });
    },

    // Allow attachment uploads!
    '/api/attachment/:spaceId/upload': async (req) => {
        const session = await requireUser(req);
        const spaceId = validateId(req.params.spaceId, 'space id');
        checkAccess(session, [
            {
                type: 'write-upload',
                resource: `${session.user.id}/${spaceId}`,
            },
        ]);

        const formData = await req.formData();
        const file = formData.get('file');
        if (!file || typeof file === 'string') {
            return Response.json(
                { error: 'missing file or type' },
                { status: 400 },
            );
        }
        const mimeType = file.type;
        if (!isSafeMimeType(mimeType)) {
            return Response.json(
                { error: 'disallowed mime type' },
                { status: 400 },
            );
        }

        const id = await saveAttachment(
            session.user.id,
            spaceId,
            mimeType,
            file,
        );
        return Response.json({ id });
    },
});
