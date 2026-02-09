/**
 * React hooks for rules API integration
 */

import { useState, useCallback } from 'react';
import { rulesApi } from './rulesApi';
import type { Rule } from '../types/domain';

interface ApiState<T> {
    data: T | null;
    loading: boolean;
    error: string | null;
}

/**
 * Hook for managing rules list
 */
export function useRulesList() {
    const [state, setState] = useState<ApiState<Rule[]>>({
        data: null,
        loading: false,
        error: null,
    });

    const fetchRules = useCallback(async (domainId?: string) => {
        setState(s => ({ ...s, loading: true, error: null }));
        try {
            const rules = await rulesApi.getRules(domainId);
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
    const [state, setState] = useState<ApiState<Rule>>({
        data: null,
        loading: false,
        error: null,
    });

    const createRule = useCallback(async (rule: Partial<Rule>) => {
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

    const updateRule = useCallback(async (id: string, rule: Partial<Rule>) => {
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

    return { ...state, createRule, updateRule, deleteRule };
}
