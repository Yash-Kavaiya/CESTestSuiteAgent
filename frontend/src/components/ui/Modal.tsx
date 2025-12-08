import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    showCloseButton?: boolean;
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showCloseButton = true,
}: ModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[90vw] max-h-[90vh]',
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={clsx(
                    'relative w-full bg-dark-800 border border-dark-700 rounded-xl shadow-2xl animate-slide-up',
                    sizes[size]
                )}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
                        {title && (
                            <h2 className="text-lg font-semibold text-primary-700">{title}</h2>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors ml-auto"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}
