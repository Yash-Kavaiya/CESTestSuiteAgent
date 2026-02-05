import { useState, useCallback } from 'react';
import { Calendar, X } from 'lucide-react';
import clsx from 'clsx';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export interface DateRange {
    startDate: Date | null;
    endDate: Date | null;
}

interface DateRangePickerProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
    className?: string;
}

const presets = [
    { label: 'Today', days: 0 },
    { label: 'Last 7 days', days: 7 },
    { label: 'Last 30 days', days: 30 },
    { label: 'Last 90 days', days: 90 },
];

export default function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handlePresetClick = useCallback((days: number) => {
        const endDate = endOfDay(new Date());
        const startDate = days === 0 ? startOfDay(new Date()) : startOfDay(subDays(new Date(), days));
        onChange({ startDate, endDate });
        setIsOpen(false);
    }, [onChange]);

    const handleClear = useCallback(() => {
        onChange({ startDate: null, endDate: null });
        setIsOpen(false);
    }, [onChange]);

    const handleStartDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const date = e.target.value ? startOfDay(new Date(e.target.value)) : null;
        onChange({ ...value, startDate: date });
    }, [value, onChange]);

    const handleEndDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const date = e.target.value ? endOfDay(new Date(e.target.value)) : null;
        onChange({ ...value, endDate: date });
    }, [value, onChange]);

    const formatDateDisplay = () => {
        if (!value.startDate && !value.endDate) {
            return 'All time';
        }
        if (value.startDate && value.endDate) {
            return `${format(value.startDate, 'MMM d, yyyy')} - ${format(value.endDate, 'MMM d, yyyy')}`;
        }
        if (value.startDate) {
            return `From ${format(value.startDate, 'MMM d, yyyy')}`;
        }
        if (value.endDate) {
            return `Until ${format(value.endDate, 'MMM d, yyyy')}`;
        }
        return 'All time';
    };

    const hasFilter = value.startDate || value.endDate;

    return (
        <div className={clsx('relative', className)}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                    'bg-dark-700 border border-dark-600 text-dark-200 hover:bg-dark-600 hover:text-dark-50',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-900',
                    hasFilter && 'border-primary-500/50 bg-primary-500/10'
                )}
            >
                <Calendar className="w-4 h-4" />
                <span>{formatDateDisplay()}</span>
                {hasFilter && (
                    <X
                        className="w-4 h-4 hover:text-danger-400"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClear();
                        }}
                    />
                )}
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 z-50 w-72 bg-dark-800 border border-dark-600 rounded-lg shadow-xl p-4">
                        <div className="space-y-4">
                            {/* Quick presets */}
                            <div>
                                <p className="text-xs text-dark-400 mb-2">Quick select</p>
                                <div className="flex flex-wrap gap-2">
                                    {presets.map((preset) => (
                                        <button
                                            key={preset.label}
                                            type="button"
                                            onClick={() => handlePresetClick(preset.days)}
                                            className="px-2.5 py-1 text-xs rounded-md bg-dark-700 text-dark-200 hover:bg-dark-600 hover:text-dark-50 transition-colors"
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Custom date inputs */}
                            <div className="border-t border-dark-600 pt-4">
                                <p className="text-xs text-dark-400 mb-2">Custom range</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-dark-500 mb-1">Start date</label>
                                        <input
                                            type="date"
                                            value={value.startDate ? format(value.startDate, 'yyyy-MM-dd') : ''}
                                            onChange={handleStartDateChange}
                                            className="w-full px-2 py-1.5 text-sm bg-dark-700 border border-dark-600 rounded-md text-dark-200 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-dark-500 mb-1">End date</label>
                                        <input
                                            type="date"
                                            value={value.endDate ? format(value.endDate, 'yyyy-MM-dd') : ''}
                                            onChange={handleEndDateChange}
                                            className="w-full px-2 py-1.5 text-sm bg-dark-700 border border-dark-600 rounded-md text-dark-200 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-between items-center border-t border-dark-600 pt-3">
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="text-xs text-dark-400 hover:text-dark-200 transition-colors"
                                >
                                    Clear filter
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-3 py-1.5 text-xs rounded-md bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
