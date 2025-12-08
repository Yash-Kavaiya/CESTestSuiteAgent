import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            className,
            disabled,
            ...props
        },
        ref
    ) => {
        const baseStyles =
            'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-900 disabled:opacity-50 disabled:cursor-not-allowed';

        const variants = {
            primary:
                'bg-primary-600 text-white hover:bg-primary-500 focus:ring-primary-500 shadow-lg shadow-primary-600/25',
            secondary:
                'bg-dark-700 text-dark-200 hover:bg-dark-600 focus:ring-dark-500 border border-dark-600',
            success:
                'bg-success-600 text-white hover:bg-success-500 focus:ring-success-500',
            danger:
                'bg-danger-600 text-white hover:bg-danger-500 focus:ring-danger-500',
            ghost:
                'bg-transparent text-dark-300 hover:text-white hover:bg-dark-800 focus:ring-dark-500',
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-base',
        };

        return (
            <button
                ref={ref}
                className={clsx(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    leftIcon
                )}
                {children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
