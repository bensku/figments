interface ResetButtonProps {
    onClick: () => void;
    visible: boolean;
}

export function ResetButton({ onClick, visible }: ResetButtonProps) {
    if (!visible) {
        return null;
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className="text-xs text-gray-500 hover:text-gray-700 flex-shrink-0"
        >
            Reset
        </button>
    );
}
