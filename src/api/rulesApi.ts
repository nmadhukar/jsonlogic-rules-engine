/**
 * API client for the NestJS Backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

import type { Domain, Rule } from '../types/domain';

export class RulesApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.name = 'RulesApiError';
        this.status = status;
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorText = await response.text();
        throw new RulesApiError(response.status, errorText || `HTTP ${response.status}`);
    }
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    if (!text) return undefined as T;
    try {
        return JSON.parse(text) as T;
    } catch {
        throw new RulesApiError(response.status, `Invalid JSON: ${text.substring(0, 100)}`);
    }
}

export const rulesApi = {
    // ── Domains ──
    getDomains: async (): Promise<Domain[]> => {
        const response = await fetch(`${API_BASE_URL}/domains`);
        return handleResponse<Domain[]>(response);
    },

    getDomain: async (id: string): Promise<Domain> => {
        const response = await fetch(`${API_BASE_URL}/domains/${id}`);
        return handleResponse<Domain>(response);
    },

    createDomain: async (data: any): Promise<Domain> => {
        const response = await fetch(`${API_BASE_URL}/domains`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse<Domain>(response);
    },

    updateDomain: async (id: string, data: any): Promise<Domain> => {
        const response = await fetch(`${API_BASE_URL}/domains/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse<Domain>(response);
    },

    deleteDomain: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/domains/${id}`, {
            method: 'DELETE',
        });
        return handleResponse<void>(response);
    },

    // ── Rules ──
    getRules: async (domainId?: string): Promise<Rule[]> => {
        const url = domainId
            ? `${API_BASE_URL}/rules?domainId=${domainId}`
            : `${API_BASE_URL}/rules`;
        const response = await fetch(url);
        return handleResponse<Rule[]>(response);
    },

    createRule: async (rule: Partial<Rule>): Promise<Rule> => {
        const response = await fetch(`${API_BASE_URL}/rules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rule),
        });
        return handleResponse<Rule>(response);
    },

    updateRule: async (id: string, rule: Partial<Rule>): Promise<Rule> => {
        const response = await fetch(`${API_BASE_URL}/rules/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rule),
        });
        return handleResponse<Rule>(response);
    },

    deleteRule: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/rules/${id}`, {
            method: 'DELETE',
        });
        return handleResponse<void>(response);
    },
};
