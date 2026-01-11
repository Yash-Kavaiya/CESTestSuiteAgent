import { useState, useEffect } from 'react';
import { FileText, Check, AlertCircle, Play, Download, Loader2 } from 'lucide-react';
import Card, { CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ProgressBar from '../components/ui/ProgressBar';
import FileUpload from '../components/ui/FileUpload';

interface SimulationJob {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    total: number;
    results: any[];
    error?: string;
    startTime: string;
    endTime?: string;
}

export default function BulkTest() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [job, setJob] = useState<SimulationJob | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [debugLog, setDebugLog] = useState<string[]>([]);

    const addLog = (msg: string) => setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    // Poll for job status
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (jobId && job?.status !== 'completed' && job?.status !== 'failed') {
            interval = setInterval(async () => {
                try {
                    const response = await fetch(`${(import.meta as any).env.VITE_API_URL || 'http://localhost:3001'}/api/v1/simulation/${jobId}`);
                    const data = await response.json();
                    if (data.success) {
                        setJob(data.data);
                        if (data.data.status === 'completed' || data.data.status === 'failed') {
                            clearInterval(interval);
                        }
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                }
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [jobId, job?.status]);

    const handleFileSelect = (selectedFile: File) => {
        setFile(selectedFile);
        setError(null);
        addLog(`File selected: ${selectedFile.name} (${selectedFile.size} bytes)`);
    };

    const startSimulation = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(null);
        addLog('Starting upload...');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${(import.meta as any).env.VITE_API_URL || 'http://localhost:3001'}/api/v1/simulation/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                addLog(`Upload success! Job ID: ${data.data.jobId}`);
                setJobId(data.data.jobId);
                setJob({
                    id: data.data.jobId,
                    status: 'pending',
                    progress: 0,
                    total: 0,
                    results: [],
                    startTime: new Date().toISOString()
                });
            } else {
                addLog(`Upload failed: ${data.error}`);
                throw new Error(data.error || 'Upload failed');
            }
        } catch (err: any) {
            addLog(`Error: ${err.message}`);
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const downloadReport = async () => {
        if (!jobId) return;

        try {
            // Use relative path to go through Vite proxy
            const response = await fetch(`/api/v1/simulation/${jobId}/download`);

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `simulation_report_${jobId}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error('Download error:', err);
            setError('Failed to download report');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-dark-100">Bulk Simulation</h1>
                <p className="text-dark-400 mt-1">
                    Upload a CSV file with user conversations to simulate them against the agent.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload Card */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader
                            title="Upload CSV"
                            subtitle="Required columns: conversation_id (optional), user_input"
                        />
                        <CardContent className="space-y-4">
                            <FileUpload
                                onFileSelect={handleFileSelect}
                                accept=".csv"
                            />

                            {file && (
                                <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg border border-dark-600">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                                            <FileText className="w-4 h-4 text-primary-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-dark-200">{file.name}</p>
                                            <p className="text-xs text-dark-400">{(file.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setFile(null);
                                            setJobId(null);
                                            setJob(null);
                                        }}
                                    >
                                        Remove
                                    </Button>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-lg flex items-center gap-2 text-danger-200 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <Button
                                    onClick={startSimulation}
                                    disabled={!file || isUploading || (!!jobId && job?.status !== 'completed' && job?.status !== 'failed')}
                                    isLoading={isUploading}
                                >
                                    <Play className="w-4 h-4 mr-2" />
                                    Start Simulation
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Results Preview */}
                    {job && job.results.length > 0 && (
                        <Card>
                            <CardHeader title="Live Results Preview" subtitle={`Showing recent turns`} />
                            <div className="max-h-96 overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-dark-700 text-dark-400 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2">Conv ID</th>
                                            <th className="px-4 py-2">Turn</th>
                                            <th className="px-4 py-2">Input</th>
                                            <th className="px-4 py-2">Response</th>
                                            <th className="px-4 py-2">Intent</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-dark-700">
                                        {job.results.slice().reverse().slice(0, 50).map((res, i) => (
                                            <tr key={i} className="hover:bg-dark-700/50">
                                                <td className="px-4 py-2 text-dark-300 font-mono text-xs">{res.conversationId}</td>
                                                <td className="px-4 py-2 text-dark-400">{res.turnNumber}</td>
                                                <td className="px-4 py-2 text-dark-200 max-w-xs truncate" title={res.userInput}>{res.userInput}</td>
                                                <td className="px-4 py-2 text-primary-300 max-w-xs truncate" title={res.agentResponse}>{res.agentResponse}</td>
                                                <td className="px-4 py-2 text-purple-300">{res.intent || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Progress Card */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader title="Progress" />
                        <CardContent>
                            {!jobId ? (
                                <div className="text-center py-8 text-dark-500">
                                    <Play className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>Start a simulation to see progress</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dark-700 mb-4">
                                            {job?.status === 'processing' ? (
                                                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                                            ) : job?.status === 'completed' ? (
                                                <Check className="w-8 h-8 text-success-400" />
                                            ) : (
                                                <AlertCircle className="w-8 h-8 text-danger-400" />
                                            )}
                                        </div>
                                        <h3 className="text-lg font-medium text-dark-100 capitalize">
                                            {job?.status || 'Pending'}
                                        </h3>
                                        <p className="text-sm text-dark-400">
                                            {job?.progress} / {job?.total} Conversations
                                        </p>
                                    </div>

                                    <ProgressBar
                                        value={job?.total ? (job.progress / job.total) * 100 : 0}
                                        variant={job?.status === 'failed' ? 'danger' : 'primary'}
                                        showLabel
                                    />

                                    {job?.status === 'completed' && (
                                        <Button className="w-full" onClick={downloadReport}>
                                            <Download className="w-4 h-4 mr-2" />
                                            Download Report
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* CSV Format Guide */}
                    <Card>
                        <CardHeader title="CSV Format Guide" subtitle="Supported input formats" />
                        <CardContent className="space-y-4 text-sm text-dark-300">
                            <div>
                                <p className="font-medium text-dark-200 mb-2">Option 1: Multi-Column (Recommended)</p>
                                <p className="mb-2 text-xs">Each row is one conversation. Columns after ID are turns.</p>
                                <div className="bg-dark-900 p-3 rounded-lg font-mono text-xs overflow-x-auto whitespace-nowrap">
                                    conversation_id, turn1, turn2, turn3<br />
                                    test_conv_1, Hello, I want to book, From NY<br />
                                    test_conv_2, Hi, Order status, ORDER-123
                                </div>
                            </div>

                            <div>
                                <p className="font-medium text-dark-200 mb-2">Option 2: Row-per-Turn</p>
                                <p className="mb-2 text-xs">One turn per row. Requires explicit ID to group.</p>
                                <div className="bg-dark-900 p-3 rounded-lg font-mono text-xs overflow-x-auto whitespace-nowrap">
                                    conversation_id, user_input<br />
                                    test_conv_1, Hello<br />
                                    test_conv_1, I want to book<br />
                                    test_conv_2, Hi
                                </div>
                            </div>

                            <div>
                                <p className="font-medium text-dark-200 mb-2">Output Report</p>
                                <p className="text-xs">
                                    The downloaded CSV will include: <br />
                                    <span className="font-mono text-primary-300">conversationId, turnNumber, userInput, agentResponse, intent, confidence</span>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Debug Log */}
            <Card>
                <CardHeader title="Debug Log" subtitle="Check this if upload fails" />
                <CardContent>
                    <div className="bg-dark-900 p-4 rounded-lg font-mono text-xs text-dark-300 h-40 overflow-y-auto">
                        {debugLog.length === 0 ? (
                            <div className="text-dark-600 italic">Logs will appear here...</div>
                        ) : (
                            debugLog.map((log, i) => (
                                <div key={i} className="border-b border-dark-800 last:border-0 py-1">
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
