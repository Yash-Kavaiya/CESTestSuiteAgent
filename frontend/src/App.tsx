import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import BulkTest from './pages/BulkTest';
import Results from './pages/Results';
import Coverage from './pages/Coverage';
import History from './pages/History';
import Settings from './pages/Settings';
import Simulator from './pages/Simulator';
import AgentUrlTest from './pages/AgentUrlTest';
import AIAnalysis from './pages/AIAnalysis';
import ResponsibleAI from './pages/ResponsibleAI';

function App() {
    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/bulk-test" element={<BulkTest />} />
                <Route path="/results" element={<Results />} />
                <Route path="/coverage" element={<Coverage />} />
                <Route path="/history" element={<History />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/simulator" element={<Simulator />} />
                <Route path="/agent-url-test" element={<AgentUrlTest />} />
                <Route path="/ai-analysis" element={<AIAnalysis />} />
                <Route path="/responsible-ai" element={<ResponsibleAI />} />
            </Routes>
        </Layout>
    );
}

export default App;
