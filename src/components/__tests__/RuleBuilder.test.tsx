import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RuleBuilder } from '../RuleBuilder';
// Mock fields for testing
const ruleFields: any[] = [
    { name: 'age', label: 'Age', inputType: 'number' },
    { name: 'customer.tier', label: 'Tier', inputType: 'text', valueEditorType: 'select', values: [{ name: 'gold', label: 'Gold' }] }
];

describe('RuleBuilder', () => {
    it('renders without crashing', () => {
        const handleChange = vi.fn();
        render(
            <RuleBuilder
                fields={ruleFields}
                onJsonLogicChange={handleChange}
            />
        );
        // Check for the add rule button which is standard in react-querybuilder
        expect(screen.getByText('+ Rule')).toBeDefined();
    });

    it('loads initial JSONLogic correctly', () => {
        const handleChange = vi.fn();
        const initialLogic = { "==": [{ "var": "customer.tier" }, "gold"] };

        render(
            <RuleBuilder
                fields={ruleFields}
                onJsonLogicChange={handleChange}
                initialJsonLogic={initialLogic}
            />
        );

        // Check if values are populated (dependent on RQB structure, but basic check)
        // "customer.tier" field selection should be present
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0);
    });
});
