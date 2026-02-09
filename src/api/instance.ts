import { requireUser } from '@/auth/hook';
import { CONFIG } from '@/config';
import { modelFeatures } from '@/llm/feature';
import { router } from './router';

export const instanceRoutes = router({
    // Allow user to get list of admin-specified personas (for display purposes)
    '/api/instance/personas': async (req) => {
        await requireUser(req);
        // TODO allow instance admin to disable exposing system prompt, exact tool configurations, etc?
        return Response.json(CONFIG.personas);
    },

    '/api/instance/models': async (req) => {
        await requireUser(req);
        return Response.json(
            CONFIG.models.map((model) => ({
                id: model.id,
                displayName: model.displayName,
                features: modelFeatures(model),
            })),
        );
    },
});
