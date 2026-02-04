/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useEffect } from 'react';
import {
    QueryBuilder,
    formatQuery,
    type RuleGroupType,
    type Field,
} from 'react-querybuilder';
// ⚠️ CRITICAL: v7 import path for parsing logic
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';
import { allOperators } from '../config/customOperators';
import 'react-querybuilder/dist/query-builder.css';

interface RuleBuilderProps {
    /** Initial JSONLogic to load into the builder. Pass undefined for a blank builder. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialJsonLogic?: any;
    /** Field definitions — what users see in dropdowns */
    fields: Field[];
    /** Called whenever the rule changes with the compiled JSONLogic */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onJsonLogicChange: (jsonLogic: any) => void;
    /** Called with the react-querybuilder internal query object */
    onQueryChange?: (query: RuleGroupType) => void;
    /** Read-only mode */
    disabled?: boolean;
}

const defaultQuery: RuleGroupType = {
    combinator: 'and',
    rules: [],
};

export function RuleBuilder({
    initialJsonLogic,
    fields,
    onJsonLogicChange,
    onQueryChange,
    disabled = false,
}: RuleBuilderProps) {
    const [query, setQuery] = useState<RuleGroupType>(() => {
        if (initialJsonLogic) {
            try {
                return parseJsonLogic(initialJsonLogic) as RuleGroupType;
            } catch {
                console.warn('Failed to parse initial JSONLogic, starting with blank query');
                return defaultQuery;
            }
        }
        return defaultQuery;
    });

    const handleQueryChange = useCallback(
        (newQuery: RuleGroupType) => {
            setQuery(newQuery);
            onQueryChange?.(newQuery);

            // ⚠️ CRITICAL: parseNumbers: true — without this, numbers are strings
            const jsonLogic = formatQuery(newQuery, {
                format: 'jsonlogic',
                parseNumbers: true,
            });
            onJsonLogicChange(jsonLogic);
        },
        [onJsonLogicChange, onQueryChange]
    );

    // If initialJsonLogic changes externally, re-parse
    useEffect(() => {
        if (initialJsonLogic) {
            try {
                const parsed = parseJsonLogic(initialJsonLogic) as RuleGroupType;
                setQuery(parsed);
            } catch {
                // ignore parse errors on external changes
            }
        }
    }, [initialJsonLogic]);

    return (
        <QueryBuilder
            fields={fields}
            query={query}
            onQueryChange={handleQueryChange}
            operators={allOperators}
            controlClassnames={{ queryBuilder: 'rule-builder' }}
            disabled={disabled}
            // Show combinator (AND/OR) between rules
            showCombinatorsBetweenRules
            // Add group/rule buttons
            addRuleToNewGroups
            // Reset value when field or operator changes
            resetOnFieldChange
            resetOnOperatorChange
        />
    );
}
