/**
 * React hooks for rules API integration
 */

import { useState, useCallback } from 'react';
import { rulesApi } from './rulesApi';
import type { BusinessRule, EvaluationResult, CreateRuleRequest, UpdateRuleRequest } from './rulesApi';

interface ApiState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

/**
 * Hook for managing rules list
 */
export function useRulesList() {
    const [state, setState] = useState<ApiState<BusinessRule[]>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetchRules = useCallback(async (params?: {
        category?: string;
        type?: string;
        activeOnly?: boolean;
    }) => {
        setState(s => ({ ...s, loading: true, error: null }));
        try {
            const rules = await rulesApi.listRules(params);
            setState({ data: rules, loading: false, error: null });
            return rules;
        } catch (err: any) {
            setState(s => ({ ...s, loading: false, error: err.message }));
            throw err;
        }
    }, []);

    return { ...state, fetchRules };
}

/**
 * Hook for managing a single rule
 */
export function useRule() {
    const [state, setState] = useState<ApiState<BusinessRule>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetchRule = useCallback(async (id: string) => {
        setState(s => ({ ...s, loading: true, error: null }));
        try {
            const rule = await rulesApi.getRule(id);
            setState({ data: rule, loading: false, error: null });
            return rule;
        } catch (err: any) {
            setState(s => ({ ...s, loading: false, error: err.message }));
            throw err;
        }
    }, []);

    const createRule = useCallback(async (rule: CreateRuleRequest) => {
        setState(s => ({ ...s, loading: true, error: null }));
        try {
            const created = await rulesApi.createRule(rule);
            setState({ data: created, loading: false, error: null });
            return created;
        } catch (err: any) {
            setState(s => ({ ...s, loading: false, error: err.message }));
            throw err;
        }
    }, []);

    const updateRule = useCallback(async (id: string, rule: UpdateRuleRequest) => {
        setState(s => ({ ...s, loading: true, error: null }));
        try {
            const updated = await rulesApi.updateRule(id, rule);
            setState({ data: updated, loading: false, error: null });
            return updated;
        } catch (err: any) {
            setState(s => ({ ...s, loading: false, error: err.message }));
            throw err;
        }
    }, []);

    const deleteRule = useCallback(async (id: string) => {
        setState(s => ({ ...s, loading: true, error: null }));
        try {
            await rulesApi.deleteRule(id);
            setState({ data: null, loading: false, error: null });
        } catch (err: any) {
            setState(s => ({ ...s, loading: false, error: err.message }));
            throw err;
        }
    }, []);

    return { ...state, fetchRule, createRule, updateRule, deleteRule };
}

/**
 * Hook for rule evaluation
 */
export function useEvaluate() {
    const [state, setState] = useState<ApiState<EvaluationResult>>({
        data: null,
        loading: false,
        error: null,
    });

    const evaluate = useCallback(async (request: { ruleId?: string; jsonLogic?: any; data: any }) => {
        setState(s => ({ ...s, loading: true, error: null }));
        try {
            const result = await rulesApi.evaluate(request);
            setState({ data: result, loading: false, error: null });
            return result;
        } catch (err: any) {
            setState(s => ({ ...s, loading: false, error: err.message }));
            throw err;
        }
    }, []);

    const reset = useCallback(() => {
        setState({ data: null, loading: false, error: null });
    }, []);

    return { ...state, evaluate, reset };
}

/**
 * Hook for API health check
 */
export function useApiHealth() {
    const [state, setState] = useState<{
        healthy: boolean | null;
        checking: boolean;
        error: string | null;
    }>({
        healthy: null,
        checking: false,
        error: null,
    });

    const checkHealth = useCallback(async () => {
        setState(s => ({ ...s, checking: true, error: null }));
        try {
            await rulesApi.healthCheck();
            setState({ healthy: true, checking: false, error: null });
            return true;
        } catch (err: any) {
            setState({ healthy: false, checking: false, error: err.message });
            return false;
        }
    }, []);

    return { ...state, checkHealth };
}
