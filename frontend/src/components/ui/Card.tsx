import { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    onClick?: () => void;
}

export default function Card({
    children,
    className,
    hover = false,
    onClick,
}: CardProps) {
    return (
        <div
            className={clsx(
                'bg-dark-800/50 border border-dark-700 rounded-xl p-6 backdrop-blur-sm',
                hover && 'hover:border-dark-600 hover:bg-dark-800/70 transition-all duration-200 cursor-pointer',
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    );
}

interface CardHeaderProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    className?: string;
}

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
    return (
        <div className={clsx('flex items-start justify-between mb-4', className)}>
            <div>
                <h3 className="text-lg font-semibold text-primary-700">{title}</h3>
                {subtitle && <p className="text-sm text-dark-400 mt-0.5">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}

interface CardContentProps {
    children: ReactNode;
    className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
    return <div className={clsx(className)}>{children}</div>;
}
