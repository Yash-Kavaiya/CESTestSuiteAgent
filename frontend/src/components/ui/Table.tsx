import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    getFilteredRowModel,
    flexRender,
    ColumnDef,
    SortingState,
} from '@tanstack/react-table';
import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface TableProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    pageSize?: number;
    onRowClick?: (row: T) => void;
    emptyMessage?: string;
}

export default function Table<T>({
    data,
    columns,
    pageSize = 10,
    onRowClick,
    emptyMessage = 'No data available',
}: TableProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        initialState: { pagination: { pageSize } },
    });

    return (
        <div className="w-full">
            <div className="overflow-x-auto rounded-xl border border-dark-700">
                <table className="w-full">
                    <thead className="bg-dark-800/80">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className={clsx(
                                            'px-4 py-3 text-left text-xs font-semibold text-dark-400 uppercase tracking-wider',
                                            header.column.getCanSort() && 'cursor-pointer select-none hover:text-dark-300'
                                        )}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <div className="flex items-center gap-2">
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                            {header.column.getIsSorted() && (
                                                <span>
                                                    {header.column.getIsSorted() === 'asc' ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody className="divide-y divide-dark-700">
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-4 py-12 text-center text-dark-500"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className={clsx(
                                        'bg-dark-800/30 hover:bg-dark-800/60 transition-colors',
                                        onRowClick && 'cursor-pointer'
                                    )}
                                    onClick={() => onRowClick?.(row.original)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className="px-4 py-3 text-sm text-dark-200"
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {table.getPageCount() > 1 && (
                <div className="flex items-center justify-between px-4 py-3 mt-4">
                    <p className="text-sm text-dark-400">
                        Showing{' '}
                        <span className="font-medium text-dark-300">
                            {table.getState().pagination.pageIndex * pageSize + 1}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium text-dark-300">
                            {Math.min(
                                (table.getState().pagination.pageIndex + 1) * pageSize,
                                data.length
                            )}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium text-dark-300">{data.length}</span>{' '}
                        results
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="p-2 rounded-lg text-dark-400 hover:text-primary-700 hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm text-dark-400">
                            Page {table.getState().pagination.pageIndex + 1} of{' '}
                            {table.getPageCount()}
                        </span>
                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="p-2 rounded-lg text-dark-400 hover:text-primary-700 hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
