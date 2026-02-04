import { useState, useEffect } from 'react';
import { parseExpression } from '../engine/expressionParser';
import { decompileExpression } from '../engine/expressionDecompiler';
import type { Field } from 'react-querybuilder';

interface ExpressionInputProps {
    /** The current JSONLogic rule (controlled) */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
    /** Callback when valid JSONLogic is parsed */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: (jsonLogic: any) => void;
    /** List of valid fields for autocomplete/validation (optional) */
    fields?: Field[];
    /** Disable input */
    disabled?: boolean;
}

export function ExpressionInput({ value, onChange, fields = [], disabled }: ExpressionInputProps) {
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [touched, setTouched] = useState(false);

    // Sync external JSONLogic value to text
    useEffect(() => {
        // Only update text from props if we aren't currently editing (or it's a completely new value)
        // Simple heuristic: if the compiled version of current text != value, update.
        try {
            const currentLogic = parseExpression(text);
            if (JSON.stringify(currentLogic) !== JSON.stringify(value)) {
                setText(decompileExpression(value));
            }
        } catch {
            // value changed externally to something valid, but our current text is invalid?
            // Force update.
            setText(decompileExpression(value));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newText = e.target.value;
        setText(newText);
        setTouched(true);
        setError(null);

        // Debounce parsing logic could go here, or just parse immediately for basic usage
        try {
            const logic = parseExpression(newText, { knownFields: fields.map(f => f.name) });
            onChange(logic);
        } catch (err: unknown) {
            // Don't propagate change if invalid? Or propagate null?
            // For now, we prefer to let the user type incomplete stuff without wiping the rule state upstream?
            // No, upstream needs valid JSONLogic.
            // We set local error state.
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Invalid syntax');
            }
        }
    };

    return (
        <div className="expression-editor">
            <div className="input-group">
                <span className="input-prefix">Expr:</span>
                <input
                    type="text"
                    value={text}
                    onChange={handleChange}
                    disabled={disabled}
                    placeholder='e.g. age > 18 and status == "active"'
                    className={error ? 'invalid' : 'valid'}
                />
            </div>
            {error && touched && <div className="error-message">{error}</div>}
        </div>
    );
}
