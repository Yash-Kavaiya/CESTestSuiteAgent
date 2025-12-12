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
                'bg-white border border-dark-700 rounded-xl p-6 shadow-soft',
                hover && 'hover:shadow-google hover:border-dark-600 transition-all duration-200 cursor-pointer',
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
                <h3 className="text-lg font-semibold text-dark-50">{title}</h3>
                {subtitle && <p className="text-sm text-dark-300 mt-0.5">{subtitle}</p>}
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

