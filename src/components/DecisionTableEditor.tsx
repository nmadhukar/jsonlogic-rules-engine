import { useState, useCallback, useMemo } from 'react';
import type { DecisionTable, DecisionTableRow } from '../types/decisionTable';
import { compileTable } from '../engine/tableCompiler';
import { validateCellExpression } from '../engine/cellCompiler';

interface DecisionTableEditorProps {
    /** The decision table to edit */
    table: DecisionTable;
    /** Callback when table changes */
    onChange: (table: DecisionTable) => void;
    /** Callback when compiled JSONLogic is available */
    onCompile?: (logic: any) => void;
    /** Read-only mode */
    disabled?: boolean;
}

export function DecisionTableEditor({
    table,
    onChange,
    onCompile,
    disabled = false,
}: DecisionTableEditorProps) {
    const [selectedCell, setSelectedCell] = useState<{ rowId: string; colId: string } | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Compile table when it changes
    const compiled = useMemo(() => {
        try {
            const result = compileTable(table);
            onCompile?.(result.logic);
            return result;
        } catch (err) {
            return null;
        }
    }, [table, onCompile]);

    // Get input and output columns
    const inputColumns = useMemo(() => table.columns.filter(c => c.type === 'input'), [table.columns]);
    const outputColumns = useMemo(() => table.columns.filter(c => c.type === 'output'), [table.columns]);

    // Cell click handler
    const handleCellClick = useCallback((rowId: string, colId: string, currentValue: string) => {
        if (disabled) return;
        setSelectedCell({ rowId, colId });
        setEditingValue(currentValue);
    }, [disabled]);

    // Cell value change
    const handleCellChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setEditingValue(e.target.value);
    }, []);

    // Cell blur - save changes
    const handleCellBlur = useCallback(() => {
        if (!selectedCell) return;

        const { rowId, colId } = selectedCell;
        const column = table.columns.find(c => c.id === colId);

        // Validate if input column
        if (column && column.type === 'input') {
            const error = validateCellExpression(editingValue, column);
            if (error) {
                setValidationErrors(prev => ({ ...prev, [`${rowId}-${colId}`]: error }));
            } else {
                setValidationErrors(prev => {
                    const next = { ...prev };
                    delete next[`${rowId}-${colId}`];
                    return next;
                });
            }
        }

        // Update table
        const newRows = table.rows.map(row => {
            if (row.id === rowId) {
                return {
                    ...row,
                    cells: { ...row.cells, [colId]: editingValue },
                };
            }
            return row;
        });

        onChange({ ...table, rows: newRows });
        setSelectedCell(null);
    }, [selectedCell, editingValue, table, onChange]);

    // Add row
    const addRow = useCallback(() => {
        const newRow: DecisionTableRow = {
            id: crypto.randomUUID(),
            cells: {},
        };
        // Initialize all cells with empty/wildcard
        table.columns.forEach(col => {
            newRow.cells[col.id] = col.type === 'input' ? '*' : '';
        });
        onChange({ ...table, rows: [...table.rows, newRow] });
    }, [table, onChange]);

    // Delete row
    const deleteRow = useCallback((rowId: string) => {
        onChange({ ...table, rows: table.rows.filter(r => r.id !== rowId) });
    }, [table, onChange]);

    // Move row up/down
    const moveRow = useCallback((rowId: string, direction: 'up' | 'down') => {
        const idx = table.rows.findIndex(r => r.id === rowId);
        if (idx === -1) return;
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === table.rows.length - 1) return;

        const newRows = [...table.rows];
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        [newRows[idx], newRows[swapIdx]] = [newRows[swapIdx], newRows[idx]];
        onChange({ ...table, rows: newRows });
    }, [table, onChange]);

    // Toggle hit policy
    const toggleHitPolicy = useCallback(() => {
        onChange({
            ...table,
            hitPolicy: table.hitPolicy === 'first' ? 'collect' : 'first',
        });
    }, [table, onChange]);

    return (
        <div className="decision-table-editor">
            {/* Header */}
            <div className="table-header" style={{ marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                <strong>{table.name}</strong>
                <span style={{ color: '#666' }}>|</span>
                <button onClick={toggleHitPolicy} disabled={disabled} style={{ fontSize: '0.85em' }}>
                    Hit Policy: {table.hitPolicy === 'first' ? 'First Match' : 'Collect All'}
                </button>
                <button onClick={addRow} disabled={disabled}>
                    + Add Row
                </button>
            </div>

            {/* Table */}
            <div className="table-container" style={{ overflowX: 'auto' }}>
                <table className="table table-bordered table-sm" style={{ minWidth: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ width: 60 }}>#</th>
                            {inputColumns.map(col => (
                                <th key={col.id} style={{ background: '#e3f2fd' }}>
                                    {col.label}
                                    <br />
                                    <small style={{ color: '#666' }}>{col.field}</small>
                                </th>
                            ))}
                            {outputColumns.map(col => (
                                <th key={col.id} style={{ background: '#e8f5e9' }}>
                                    {col.label}
                                    <br />
                                    <small style={{ color: '#666' }}>{col.field}</small>
                                </th>
                            ))}
                            <th style={{ width: 100 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {table.rows.map((row, idx) => (
                            <tr key={row.id}>
                                <td style={{ textAlign: 'center', color: '#666' }}>{idx + 1}</td>
                                {inputColumns.map(col => {
                                    const cellKey = `${row.id}-${col.id}`;
                                    const isEditing = selectedCell?.rowId === row.id && selectedCell?.colId === col.id;
                                    const hasError = validationErrors[cellKey];
                                    const cellValue = row.cells[col.id] || '';

                                    return (
                                        <td
                                            key={col.id}
                                            onClick={() => handleCellClick(row.id, col.id, cellValue)}
                                            style={{
                                                background: hasError ? '#ffebee' : '#e3f2fd',
                                                cursor: disabled ? 'default' : 'pointer',
                                            }}
                                        >
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editingValue}
                                                    onChange={handleCellChange}
                                                    onBlur={handleCellBlur}
                                                    onKeyDown={e => e.key === 'Enter' && handleCellBlur()}
                                                    autoFocus
                                                    style={{ width: '100%', border: 'none', background: 'transparent' }}
                                                />
                                            ) : (
                                                <span>{cellValue || <em style={{ color: '#999' }}>*</em>}</span>
                                            )}
                                            {hasError && <div style={{ color: 'red', fontSize: '0.75em' }}>{hasError}</div>}
                                        </td>
                                    );
                                })}
                                {outputColumns.map(col => {
                                    const isEditing = selectedCell?.rowId === row.id && selectedCell?.colId === col.id;
                                    const cellValue = row.cells[col.id] || '';

                                    return (
                                        <td
                                            key={col.id}
                                            onClick={() => handleCellClick(row.id, col.id, cellValue)}
                                            style={{ background: '#e8f5e9', cursor: disabled ? 'default' : 'pointer' }}
                                        >
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editingValue}
                                                    onChange={handleCellChange}
                                                    onBlur={handleCellBlur}
                                                    onKeyDown={e => e.key === 'Enter' && handleCellBlur()}
                                                    autoFocus
                                                    style={{ width: '100%', border: 'none', background: 'transparent' }}
                                                />
                                            ) : (
                                                <span>{cellValue || <em style={{ color: '#999' }}>-</em>}</span>
                                            )}
                                        </td>
                                    );
                                })}
                                <td style={{ textAlign: 'center' }}>
                                    <button
                                        onClick={() => moveRow(row.id, 'up')}
                                        disabled={disabled || idx === 0}
                                        style={{ marginRight: 4 }}
                                        title="Move up"
                                    >
                                        ↑
                                    </button>
                                    <button
                                        onClick={() => moveRow(row.id, 'down')}
                                        disabled={disabled || idx === table.rows.length - 1}
                                        style={{ marginRight: 4 }}
                                        title="Move down"
                                    >
                                        ↓
                                    </button>
                                    <button
                                        onClick={() => deleteRow(row.id)}
                                        disabled={disabled}
                                        style={{ color: 'red' }}
                                        title="Delete row"
                                    >
                                        ×
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {table.rows.length === 0 && (
                            <tr>
                                <td colSpan={table.columns.length + 2} style={{ textAlign: 'center', color: '#999' }}>
                                    No rows. Click "+ Add Row" to create a rule.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Syntax Help */}
            <div style={{ marginTop: 10, fontSize: '0.8em', color: '#666' }}>
                <strong>Cell Syntax:</strong>{' '}
                <code>*</code> = any |{' '}
                <code>&gt; 100</code> = greater than |{' '}
                <code>18..65</code> = between |{' '}
                <code>A, B, C</code> = one of |{' '}
                <code>!= blocked</code> = not equal
            </div>

            {/* Compiled output */}
            {compiled && (
                <div style={{ marginTop: 10, padding: 10, background: '#f5f5f5', fontSize: '0.75em' }}>
                    <strong>Compiled JSONLogic:</strong>
                    <pre style={{ maxHeight: 150, overflow: 'auto' }}>
                        {JSON.stringify(compiled.logic, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
