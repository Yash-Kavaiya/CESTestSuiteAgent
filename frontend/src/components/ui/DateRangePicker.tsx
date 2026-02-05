import { useState, useCallback } from 'react';
import { Calendar, X, Clock } from 'lucide-react';
import clsx from 'clsx';
import { format, subDays, startOfDay, endOfDay, setHours, setMinutes } from 'date-fns';

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

    // Local state for custom date/time inputs
    const [customStartDate, setCustomStartDate] = useState('');
    const [customStartTime, setCustomStartTime] = useState('00:00');
    const [customEndDate, setCustomEndDate] = useState('');
    const [customEndTime, setCustomEndTime] = useState('23:59');

    const handlePresetClick = useCallback((days: number) => {
        const endDate = endOfDay(new Date());
        const startDate = days === 0 ? startOfDay(new Date()) : startOfDay(subDays(new Date(), days));
        onChange({ startDate, endDate });
        setIsOpen(false);
    }, [onChange]);

    const handleClear = useCallback(() => {
        onChange({ startDate: null, endDate: null });
        setCustomStartDate('');
        setCustomStartTime('00:00');
        setCustomEndDate('');
        setCustomEndTime('23:59');
        setIsOpen(false);
    }, [onChange]);

    const handleApply = useCallback(() => {
        let startDate: Date | null = null;
        let endDate: Date | null = null;

        if (customStartDate) {
            const [hours, minutes] = customStartTime.split(':').map(Number);
            startDate = setMinutes(setHours(new Date(customStartDate), hours), minutes);
        }

        if (customEndDate) {
            const [hours, minutes] = customEndTime.split(':').map(Number);
            endDate = setMinutes(setHours(new Date(customEndDate), hours), minutes);
        }

        onChange({ startDate, endDate });
        setIsOpen(false);
    }, [customStartDate, customStartTime, customEndDate, customEndTime, onChange]);

    // Initialize custom inputs when opening and value exists
    const handleOpen = useCallback(() => {
        if (value.startDate) {
            setCustomStartDate(format(value.startDate, 'yyyy-MM-dd'));
            setCustomStartTime(format(value.startDate, 'HH:mm'));
        }
        if (value.endDate) {
            setCustomEndDate(format(value.endDate, 'yyyy-MM-dd'));
            setCustomEndTime(format(value.endDate, 'HH:mm'));
        }
        setIsOpen(true);
    }, [value]);

    const formatDateDisplay = () => {
        if (!value.startDate && !value.endDate) {
            return 'All time';
        }
        if (value.startDate && value.endDate) {
            const startStr = format(value.startDate, 'MMM d, yyyy HH:mm');
            const endStr = format(value.endDate, 'MMM d, yyyy HH:mm');
            return `${startStr} - ${endStr}`;
        }
        if (value.startDate) {
            return `From ${format(value.startDate, 'MMM d, yyyy HH:mm')}`;
        }
        if (value.endDate) {
            return `Until ${format(value.endDate, 'MMM d, yyyy HH:mm')}`;
        }
        return 'All time';
    };

    const hasFilter = value.startDate || value.endDate;

    return (
        <div className={clsx('relative', className)}>
            <button
                type="button"
                onClick={handleOpen}
                className={clsx(
                    'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                    'bg-dark-700 border border-dark-600 text-dark-200 hover:bg-dark-600 hover:text-dark-50',
                    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark-900',
                    hasFilter && 'border-primary-500/50 bg-primary-500/10'
                )}
            >
                <Calendar className="w-4 h-4" />
                <span className="max-w-[200px] truncate">{formatDateDisplay()}</span>
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
                    <div className="absolute right-0 mt-2 z-50 w-80 bg-dark-800 border border-dark-600 rounded-lg shadow-xl p-4">
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

                            {/* Custom date/time inputs */}
                            <div className="border-t border-dark-600 pt-4">
                                <p className="text-xs text-dark-400 mb-3">Custom range</p>

                                {/* Start Date & Time */}
                                <div className="mb-3">
                                    <label className="block text-xs text-dark-500 mb-1.5">Start date & time</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 relative">
                                            <input
                                                type="date"
                                                value={customStartDate}
                                                onChange={(e) => setCustomStartDate(e.target.value)}
                                                className="w-full px-2 py-1.5 text-sm bg-dark-700 border border-dark-600 rounded-md text-dark-200 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                            />
                                        </div>
                                        <div className="w-24 relative">
                                            <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-dark-500 pointer-events-none" />
                                            <input
                                                type="time"
                                                value={customStartTime}
                                                onChange={(e) => setCustomStartTime(e.target.value)}
                                                className="w-full pl-7 pr-2 py-1.5 text-sm bg-dark-700 border border-dark-600 rounded-md text-dark-200 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* End Date & Time */}
                                <div>
                                    <label className="block text-xs text-dark-500 mb-1.5">End date & time</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 relative">
                                            <input
                                                type="date"
                                                value={customEndDate}
                                                onChange={(e) => setCustomEndDate(e.target.value)}
                                                className="w-full px-2 py-1.5 text-sm bg-dark-700 border border-dark-600 rounded-md text-dark-200 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                            />
                                        </div>
                                        <div className="w-24 relative">
                                            <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-dark-500 pointer-events-none" />
                                            <input
                                                type="time"
                                                value={customEndTime}
                                                onChange={(e) => setCustomEndTime(e.target.value)}
                                                className="w-full pl-7 pr-2 py-1.5 text-sm bg-dark-700 border border-dark-600 rounded-md text-dark-200 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                                            />
                                        </div>
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
                                    onClick={handleApply}
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
