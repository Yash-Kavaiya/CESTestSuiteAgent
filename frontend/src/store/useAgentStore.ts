import { create } from 'zustand';
import { Agent } from '../types';
import {
    testAgentConnection,
    saveAgentsToLocalStorage,
    loadAgentsFromLocalStorage,
    saveSelectedAgentId,
    loadSelectedAgentId,
    getLocalStorageAgentConfig,
} from '../api/agents';

export type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'failed';

interface AgentState {
    agents: Agent[];
    selectedAgent: Agent | null;
    isLoading: boolean;
    error: string | null;
    connectionStatus: ConnectionStatus;
    connectionError: string | null;
    isInitialized: boolean;

    // Actions
    setAgents: (agents: Agent[]) => void;
    setSelectedAgent: (agent: Agent | null) => void;
    addAgent: (agent: Agent) => void;
    removeAgent: (agentId: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    testConnection: (agent: Agent) => Promise<boolean>;
    initializeFromLocalStorage: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
    agents: [],
    selectedAgent: null,
    isLoading: false,
    error: null,
    connectionStatus: 'idle',
    connectionError: null,
    isInitialized: false,

    setAgents: (agents) => {
        set({ agents });
        saveAgentsToLocalStorage(agents);
    },

    setSelectedAgent: (agent) => {
        set({ selectedAgent: agent, connectionStatus: agent ? 'idle' : 'idle', connectionError: null });
        saveSelectedAgentId(agent?.id || null);
    },

    addAgent: (agent) => {
        const newAgents = [...get().agents, agent];
        set({ agents: newAgents });
        saveAgentsToLocalStorage(newAgents);
    },

    removeAgent: (agentId) => {
        const state = get();
        const newAgents = state.agents.filter((a) => a.id !== agentId);
        const newSelectedAgent = state.selectedAgent?.id === agentId ? null : state.selectedAgent;
        set({
            agents: newAgents,
            selectedAgent: newSelectedAgent,
        });
        saveAgentsToLocalStorage(newAgents);
        if (newSelectedAgent === null) {
            saveSelectedAgentId(null);
        }
    },

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    testConnection: async (agent) => {
        set({ connectionStatus: 'testing', connectionError: null });

        const result = await testAgentConnection(agent);

        if (result.success && result.connected) {
            set({ connectionStatus: 'connected', connectionError: null });
            return true;
        } else {
            set({
                connectionStatus: 'failed',
                connectionError: result.error || 'Connection failed',
            });
            return false;
        }
    },

    initializeFromLocalStorage: () => {
        if (get().isInitialized) return;

        // Load agents from localStorage
        let agents = loadAgentsFromLocalStorage();

        // Migrate old simulator config if no agents exist
        if (agents.length === 0) {
            const oldConfig = getLocalStorageAgentConfig();
            if (oldConfig) {
                agents = [oldConfig];
                saveAgentsToLocalStorage(agents);
            }
        }

        // Load selected agent
        const selectedAgentId = loadSelectedAgentId();
        const selectedAgent = agents.find((a) => a.id === selectedAgentId) || (agents.length > 0 ? agents[0] : null);

        set({
            agents,
            selectedAgent,
            isInitialized: true,
        });

        // Save the selected agent if we auto-selected one
        if (selectedAgent && !selectedAgentId) {
            saveSelectedAgentId(selectedAgent.id);
        }
    },
}));
