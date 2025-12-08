import { create } from 'zustand';
import { Agent } from '../types';

interface AgentState {
    agents: Agent[];
    selectedAgent: Agent | null;
    isLoading: boolean;
    error: string | null;
    setAgents: (agents: Agent[]) => void;
    setSelectedAgent: (agent: Agent | null) => void;
    addAgent: (agent: Agent) => void;
    removeAgent: (agentId: string) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
    agents: [],
    selectedAgent: null,
    isLoading: false,
    error: null,

    setAgents: (agents) => set({ agents }),

    setSelectedAgent: (agent) => set({ selectedAgent: agent }),

    addAgent: (agent) =>
        set((state) => ({
            agents: [...state.agents, agent],
        })),

    removeAgent: (agentId) =>
        set((state) => ({
            agents: state.agents.filter((a) => a.id !== agentId),
            selectedAgent:
                state.selectedAgent?.id === agentId ? null : state.selectedAgent,
        })),

    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),
}));
