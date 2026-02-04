import { requireUser } from '@/auth/hook';
import {
    isSafeMimeType,
    loadAttachment,
    saveAttachment,
} from '@/llm/attachment';
import { router } from './router';

export const attachmentRoutes = router({
    // Serve uploaded attachments
    '/api/attachment/:id': async (req) => {
        const user = requireUser(req);
        const url = new URL(req.url);

        // y-query data describes what type this is
        const mimeType = url.searchParams.get('type');
        if (!isSafeMimeType(mimeType)) {
            // But permit only safe types to prevent users from XSSing themself
            // in case they're somehow convinced to upload dangerous attachments
            // (plus this is very important if sharing is ever implemented!)
            return new Response('type not allowed', { status: 400 });
        }
        const content = await loadAttachment(user.id, req.params.id, mimeType);
        if (content === null) {
            return new Response('not found', { status: 404 });
        }

        return new Response(content, {
            headers: { 'Content-Type': mimeType },
        });
    },

    // Allow attachment uploads!
    '/api/attachment/upload': async (req) => {
        const user = requireUser(req);
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

        const id = await saveAttachment(user.id, mimeType, file);
        return Response.json({ id });
    },
});
