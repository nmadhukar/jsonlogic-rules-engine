import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UnifiedRuleEditor } from '../UnifiedRuleEditor';
import { ruleFields } from '../../config/ruleFields';

describe('UnifiedRuleEditor', () => {
    it('renders visual builder by default', () => {
        const handleChange = vi.fn();
        render(
            <UnifiedRuleEditor
                fields={ruleFields}
                onChange={handleChange}
            />
        );
        // Button to add rule should be present in Visual mode
        expect(screen.getByText('+ Rule')).toBeDefined();
        expect(screen.queryByPlaceholderText(/e.g. age > 18/)).toBeNull();
    });

    it('switches to text mode', () => {
        const handleChange = vi.fn();
        render(
            <UnifiedRuleEditor
                fields={ruleFields}
                onChange={handleChange}
            />
        );

        const textBtn = screen.getByText('Advanced Text');
        fireEvent.click(textBtn);

        // Check input present
        expect(screen.getByPlaceholderText(/e.g. age > 18/)).toBeDefined();
    });

    // Note: Full round-trip testing is complex due to RQB internals, 
    // but we can verify mode switching preserves state if we had a value.
});
