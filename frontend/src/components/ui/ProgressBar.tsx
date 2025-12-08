import clsx from 'clsx';

interface ProgressBarProps {
    value: number;
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'primary' | 'success' | 'warning' | 'danger';
    showLabel?: boolean;
    animated?: boolean;
    className?: string;
}

export default function ProgressBar({
    value,
    max = 100,
    size = 'md',
    variant = 'primary',
    showLabel = false,
    animated = true,
    className,
}: ProgressBarProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizes = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4',
    };

    const variants = {
        primary: 'bg-primary-500',
        success: 'bg-success-500',
        warning: 'bg-warning-500',
        danger: 'bg-danger-500',
    };

    return (
        <div className={clsx('w-full', className)}>
            {showLabel && (
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-dark-400">Progress</span>
                    <span className="text-dark-300 font-medium">
                        {Math.round(percentage)}%
                    </span>
                </div>
            )}
            <div
                className={clsx(
                    'w-full bg-dark-700 rounded-full overflow-hidden',
                    sizes[size]
                )}
            >
                <div
                    className={clsx(
                        'h-full rounded-full transition-all duration-500',
                        variants[variant],
                        animated && 'relative overflow-hidden'
                    )}
                    style={{ width: `${percentage}%` }}
                >
                    {animated && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite] -translate-x-full" />
                    )}
                </div>
            </div>
        </div>
    );
}
