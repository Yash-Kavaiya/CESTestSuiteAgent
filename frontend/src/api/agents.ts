import axios from 'axios';
import { Agent } from '../types';

const API_BASE = '/api/v1';

export interface TestConnectionResult {
    success: boolean;
    connected?: boolean;
    agentName?: string;
    startPage?: string;
    error?: string;
}

/**
 * Test connection to a Dialogflow CX agent
 */
export async function testAgentConnection(agent: Agent): Promise<TestConnectionResult> {
    try {
        const response = await axios.post(`${API_BASE}/simulator/test-connection`, {
            projectId: agent.projectId,
            location: agent.location,
            agentId: agent.id,
        });

        return {
            success: true,
            connected: response.data.data?.connected ?? false,
            agentName: response.data.data?.agentName,
            startPage: response.data.data?.startPage,
        };
    } catch (error: any) {
        return {
            success: false,
            connected: false,
            error: error.response?.data?.error || error.message || 'Connection failed',
        };
    }
}

/**
 * Get agent config from localStorage (for migration from old simulator config)
 */
export function getLocalStorageAgentConfig(): Agent | null {
    try {
        const saved = localStorage.getItem('dialogflow-agent-config');
        if (saved) {
            const config = JSON.parse(saved);
            if (config.projectId && config.agentId) {
                return {
                    id: config.agentId,
                    displayName: config.displayName || `${config.projectId} Agent`,
                    projectId: config.projectId,
                    location: config.location || 'global',
                    defaultLanguageCode: 'en',
                };
            }
        }
    } catch (e) {
        console.error('Failed to parse old agent config:', e);
    }
    return null;
}

/**
 * Save agents to localStorage
 */
export function saveAgentsToLocalStorage(agents: Agent[]): void {
    localStorage.setItem('agents-list', JSON.stringify(agents));
}

/**
 * Load agents from localStorage
 */
export function loadAgentsFromLocalStorage(): Agent[] {
    try {
        const saved = localStorage.getItem('agents-list');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load agents from localStorage:', e);
    }
    return [];
}

/**
 * Save selected agent ID to localStorage
 */
export function saveSelectedAgentId(agentId: string | null): void {
    if (agentId) {
        localStorage.setItem('selected-agent-id', agentId);
    } else {
        localStorage.removeItem('selected-agent-id');
    }
}

/**
 * Load selected agent ID from localStorage
 */
export function loadSelectedAgentId(): string | null {
    return localStorage.getItem('selected-agent-id');
}
