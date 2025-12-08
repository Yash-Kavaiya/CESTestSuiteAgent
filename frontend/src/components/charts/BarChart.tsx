import {
    BarChart as RechartsBarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

interface BarChartProps {
    data: Array<{
        name: string;
        value: number;
        color?: string;
    }>;
    xAxisKey?: string;
    yAxisKey?: string;
    color?: string;
    height?: number;
    showGrid?: boolean;
}

export default function BarChart({
    data,
    xAxisKey = 'name',
    yAxisKey = 'value',
    color = '#3b82f6',
    height = 300,
    showGrid = true,
}: BarChartProps) {
    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <RechartsBarChart
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
                        cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                    />
                    <Bar
                        dataKey={yAxisKey}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={50}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || color} />
                        ))}
                    </Bar>
                </RechartsBarChart>
            </ResponsiveContainer>
        </div>
    );
}
