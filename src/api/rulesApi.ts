/**
 * API client for communicating with the .NET Rules Engine backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Types matching .NET backend models
export interface BusinessRule {
    id: string;
    name: string;
    description?: string;
    type: 'Simple' | 'DecisionTable' | 'Pipeline';
    category?: string;
    jsonLogic?: any;
    tableDefinition?: any;
    pipelineDefinition?: any;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
    isActive: boolean;
    version: number;
}

export interface EvaluationResult {
    success: boolean;
    output: any;
    error?: string;
    stepOutputs?: Record<string, any>;
    executionTime: string;
}

export interface EvaluateRuleRequest {
    ruleId?: string;
    jsonLogic?: any;
    data: any;
}

export interface CreateRuleRequest {
    name: string;
    description?: string;
    type: 'Simple' | 'DecisionTable' | 'Pipeline';
    category?: string;
    jsonLogic?: any;
    tableDefinition?: any;
    pipelineDefinition?: any;
}

export interface UpdateRuleRequest extends CreateRuleRequest {
    isActive?: boolean;
}

class RulesApiError extends Error {
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

    const text = await response.text();
    if (!text) return undefined as T;

    try {
        return JSON.parse(text);
    } catch {
        return text as unknown as T;
    }
}

/**
 * Rules API client
 */
export const rulesApi = {
    /**
     * Get all rules with optional filters
     */
    async listRules(params?: {
        category?: string;
        type?: string;
        activeOnly?: boolean;
    }): Promise<BusinessRule[]> {
        const searchParams = new URLSearchParams();
        if (params?.category) searchParams.set('category', params.category);
        if (params?.type) searchParams.set('type', params.type);
        if (params?.activeOnly !== undefined) searchParams.set('activeOnly', String(params.activeOnly));

        const url = `${API_BASE_URL}/api/rules${searchParams.toString() ? '?' + searchParams : ''}`;
        const response = await fetch(url);
        return handleResponse<BusinessRule[]>(response);
    },

    /**
     * Get a single rule by ID
     */
    async getRule(id: string): Promise<BusinessRule> {
        const response = await fetch(`${API_BASE_URL}/api/rules/${id}`);
        return handleResponse<BusinessRule>(response);
    },

    /**
     * Create a new rule
     */
    async createRule(rule: CreateRuleRequest): Promise<BusinessRule> {
        const response = await fetch(`${API_BASE_URL}/api/rules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rule),
        });
        return handleResponse<BusinessRule>(response);
    },

    /**
     * Update an existing rule
     */
    async updateRule(id: string, rule: UpdateRuleRequest): Promise<BusinessRule> {
        const response = await fetch(`${API_BASE_URL}/api/rules/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rule),
        });
        return handleResponse<BusinessRule>(response);
    },

    /**
     * Delete a rule
     */
    async deleteRule(id: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/api/rules/${id}`, {
            method: 'DELETE',
        });
        await handleResponse<void>(response);
    },

    /**
     * Evaluate a rule against data
     * Can evaluate a stored rule by ID or inline JSONLogic
     */
    async evaluate(request: EvaluateRuleRequest): Promise<EvaluationResult> {
        const response = await fetch(`${API_BASE_URL}/api/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });
        return handleResponse<EvaluationResult>(response);
    },

    /**
     * Check API health
     */
    async healthCheck(): Promise<{ status: string; timestamp: string }> {
        const response = await fetch(`${API_BASE_URL}/health`);
        return handleResponse<{ status: string; timestamp: string }>(response);
    },
};

export default rulesApi;
