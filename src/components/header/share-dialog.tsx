import { any, type Row, remove, upsert } from '@bensku/y-query';
import { useQuery } from '@bensku/y-query-react';
import { Check, Copy, Link, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { useSpace } from '@/context/space';
import { useUser } from '@/context/user';
import { ShareTokenTable } from '@/tables/space';

interface ShareDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ShareDialog({ isOpen, onClose }: ShareDialogProps) {
    const { spaceId, spaceDoc } = useSpace();
    const { userId } = useUser();

    if (!spaceDoc || !spaceId) {
        return null;
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Share this space"
            size="md"
        >
            <div className="p-6 overflow-y-auto h-full">
                <ShareDialogContent spaceId={spaceId} userId={userId} />
            </div>
        </Modal>
    );
}

function ShareDialogContent({
    spaceId,
    userId,
}: {
    spaceId: string;
    userId: string;
}) {
    const { spaceDoc } = useSpace();
    const tokens = useQuery(
        // biome-ignore lint/style/noNonNullAssertion: spaceDoc is checked by parent
        spaceDoc!,
        ShareTokenTable,
        () => any(),
        [],
        'content',
    );
    const activeTokens = tokens.filter((t) => t.active);

    const handleCreateToken = () => {
        if (!spaceDoc) return;
        const token = crypto.randomUUID();
        upsert(spaceDoc, ShareTokenTable, {
            key: token,
            active: true,
            allowWrites: false,
        });
    };

    const handleRevokeToken = (tokenKey: string) => {
        if (!spaceDoc) return;
        remove(spaceDoc, ShareTokenTable, tokenKey);
    };

    return (
        <div className="space-y-6">
            <div>
                <p className="text-sm text-gray-600 mb-4">
                    Create a share link to let others view this space. Anyone
                    with the link can view the conversation in read-only mode.
                </p>
                <button
                    type="button"
                    onClick={handleCreateToken}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                    <Link className="w-4 h-4" />
                    Create share link
                </button>
            </div>

            {activeTokens.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                        Active share links
                    </h3>
                    <div className="space-y-2">
                        {activeTokens.map((token) => (
                            <ShareTokenRow
                                key={token.key}
                                token={token}
                                userId={userId}
                                spaceId={spaceId}
                                onRevoke={handleRevokeToken}
                            />
                        ))}
                    </div>
                </div>
            )}

            {activeTokens.length === 0 && (
                <p className="text-sm text-gray-400 italic">
                    No active share links. Create one to share this space.
                </p>
            )}
        </div>
    );
}

function ShareTokenRow({
    token,
    userId,
    spaceId,
    onRevoke,
}: {
    token: Row<typeof ShareTokenTable>;
    userId: string;
    spaceId: string;
    onRevoke: (tokenKey: string) => void;
}) {
    const [copied, setCopied] = useState(false);

    const shareUrl = `${window.location.origin}/shared/${userId}/${spaceId}?token=${encodeURIComponent(token.key)}`;

    const handleCopy = async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-gray-500 truncate">
                    {shareUrl}
                </div>
                <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                        Read-only
                    </span>
                </div>
            </div>
            <button
                type="button"
                onClick={handleCopy}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
                title={copied ? 'Copied!' : 'Copy link'}
            >
                {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                ) : (
                    <Copy className="w-4 h-4" />
                )}
            </button>
            <button
                type="button"
                onClick={() => onRevoke(token.key)}
                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Revoke link"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
}
