import { useCallback, useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    accept?: string;
    maxSize?: number; // in MB
    className?: string;
}

export default function FileUpload({
    onFileSelect,
    accept = '.csv',
    maxSize = 10,
    className,
}: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    const validateFile = (file: File): boolean => {
        setError(null);

        // Check file type
        if (accept && !file.name.toLowerCase().endsWith(accept.replace('*', ''))) {
            setError(`Only ${accept} files are allowed`);
            return false;
        }

        // Check file size
        if (file.size > maxSize * 1024 * 1024) {
            setError(`File size must be less than ${maxSize}MB`);
            return false;
        }

        return true;
    };

    const handleFile = useCallback(
        (file: File) => {
            if (validateFile(file)) {
                setSelectedFile(file);
                onFileSelect(file);
            }
        },
        [onFileSelect, maxSize, accept]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            // Reset input value to allow re-selecting the same file if needed
            if (inputRef.current) {
                inputRef.current.value = '';
            }
        },
        [handleFile]
    );

    const clearFile = () => {
        setSelectedFile(null);
        setError(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className={className}>
            {!selectedFile ? (
                <label
                    className={clsx(
                        'flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200',
                        isDragging
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-dark-600 bg-dark-800/50 hover:border-dark-500 hover:bg-dark-800'
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div
                            className={clsx(
                                'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors',
                                isDragging ? 'bg-primary-500/20' : 'bg-dark-700'
                            )}
                        >
                            <Upload
                                className={clsx(
                                    'w-7 h-7 transition-colors',
                                    isDragging ? 'text-primary-400' : 'text-dark-400'
                                )}
                            />
                        </div>
                        <p className="mb-2 text-sm text-dark-300">
                            <span className="font-semibold text-primary-400">
                                Click to upload
                            </span>{' '}
                            or drag and drop
                        </p>
                        <p className="text-xs text-dark-500">
                            CSV files up to {maxSize}MB
                        </p>
                    </div>
                    <input
                        ref={inputRef}
                        type="file"
                        className="hidden"
                        accept={accept}
                        onChange={handleInputChange}
                    />
                </label>
            ) : (
                <div className="flex items-center gap-4 p-4 bg-dark-800 border border-dark-600 rounded-xl">
                    <div className="w-12 h-12 rounded-lg bg-success-500/20 flex items-center justify-center">
                        <FileSpreadsheet className="w-6 h-6 text-success-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark-200 truncate">
                            {selectedFile.name}
                        </p>
                        <p className="text-xs text-dark-500">
                            {formatFileSize(selectedFile.size)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-success-500" />
                        <button
                            onClick={clearFile}
                            className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-700 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 mt-3 text-danger-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                </div>
            )}
        </div>
    );
}
