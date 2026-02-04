/**
 * API module exports
 *
 * This module provides the API client for communicating with the .NET Rules Engine backend.
 */

// Main API client
export { rulesApi, default } from './rulesApi';

// Types
export type {
    BusinessRule,
    EvaluationResult,
    EvaluateRuleRequest,
    CreateRuleRequest,
    UpdateRuleRequest,
} from './rulesApi';

// React hooks
export {
    useRulesList,
    useRule,
    useEvaluate,
    useApiHealth,
} from './useRulesApi';
