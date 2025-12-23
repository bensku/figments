import { ViewToggle } from './toggle';

export function SpaceHeader() {
    return (
        <div className="h-14 border-b border-gray-200 bg-white shrink-0">
            <div className="max-w-6xl mx-auto px-4 lg:px-8 h-full">
                <div className="flex h-full items-center justify-end">
                    <ViewToggle />
                </div>
            </div>
        </div>
    );
}
