import {
    LineChart as RechartsLineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

interface LineChartProps {
    data: Array<Record<string, unknown>>;
    lines: Array<{
        dataKey: string;
        name: string;
        color: string;
        strokeWidth?: number;
    }>;
    xAxisKey: string;
    height?: number;
    showGrid?: boolean;
    showLegend?: boolean;
}

export default function LineChart({
    data,
    lines,
    xAxisKey,
    height = 300,
    showGrid = true,
    showLegend = true,
}: LineChartProps) {
    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <RechartsLineChart
                    data={data}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                    {showGrid && (
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#334155"
                            vertical={false}
                        />
                    )}
                    <XAxis
                        dataKey={xAxisKey}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        axisLine={{ stroke: '#334155' }}
                        tickLine={{ stroke: '#334155' }}
                    />
                    <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        axisLine={{ stroke: '#334155' }}
                        tickLine={{ stroke: '#334155' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            color: '#f1f5f9',
                        }}
                    />
                    {showLegend && (
                        <Legend
                            verticalAlign="top"
                            height={36}
                            formatter={(value) => (
                                <span className="text-dark-300 text-sm">{value}</span>
                            )}
                        />
                    )}
                    {lines.map((line) => (
                        <Line
                            key={line.dataKey}
                            type="monotone"
                            dataKey={line.dataKey}
                            name={line.name}
                            stroke={line.color}
                            strokeWidth={line.strokeWidth || 2}
                            dot={{ fill: line.color, strokeWidth: 0, r: 4 }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                    ))}
                </RechartsLineChart>
            </ResponsiveContainer>
        </div>
    );
}
