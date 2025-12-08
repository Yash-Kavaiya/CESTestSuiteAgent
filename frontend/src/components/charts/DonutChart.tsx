import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DonutChartProps {
    data: Array<{
        name: string;
        value: number;
        color: string;
    }>;
    centerLabel?: string;
    centerValue?: string | number;
}

export default function DonutChart({ data, centerLabel, centerValue }: DonutChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="relative w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={0}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#f1f5f9',
                        }}
                        formatter={(value: number, name: string) => [
                            `${value} (${((value / total) * 100).toFixed(1)}%)`,
                            name,
                        ]}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => (
                            <span className="text-dark-300 text-sm">{value}</span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Center Label */}
            {(centerLabel || centerValue) && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none" style={{ marginTop: '-18px' }}>
                    {centerValue !== undefined && (
                        <p className="text-2xl font-bold text-primary-700">{centerValue}</p>
                    )}
                    {centerLabel && (
                        <p className="text-xs text-dark-400">{centerLabel}</p>
                    )}
                </div>
            )}
        </div>
    );
}
