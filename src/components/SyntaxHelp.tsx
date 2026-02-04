import { useState } from 'react';

interface SyntaxHelpProps {
    /** Show as collapsible panel */
    collapsible?: boolean;
    /** Initial collapsed state */
    defaultCollapsed?: boolean;
}

export function SyntaxHelp({ collapsible = true, defaultCollapsed = true }: SyntaxHelpProps) {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);

    const content = (
        <div className="syntax-help-content" style={{ fontSize: '0.9em' }}>
            {/* Comparison Operators */}
            <section style={{ marginBottom: 20 }}>
                <h6 style={{ borderBottom: '1px solid #ddd', paddingBottom: 5 }}>
                    Comparison Operators
                </h6>
                <table className="table table-sm" style={{ fontSize: '0.9em' }}>
                    <thead>
                        <tr>
                            <th>Syntax</th>
                            <th>Description</th>
                            <th>Example</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><code>==</code></td>
                            <td>Equal to</td>
                            <td><code>status == "active"</code></td>
                        </tr>
                        <tr>
                            <td><code>!=</code></td>
                            <td>Not equal to</td>
                            <td><code>tier != "blocked"</code></td>
                        </tr>
                        <tr>
                            <td><code>&gt;</code></td>
                            <td>Greater than</td>
                            <td><code>age &gt; 18</code></td>
                        </tr>
                        <tr>
                            <td><code>&gt;=</code></td>
                            <td>Greater than or equal</td>
                            <td><code>score &gt;= 80</code></td>
                        </tr>
                        <tr>
                            <td><code>&lt;</code></td>
                            <td>Less than</td>
                            <td><code>temperature &lt; 100</code></td>
                        </tr>
                        <tr>
                            <td><code>&lt;=</code></td>
                            <td>Less than or equal</td>
                            <td><code>count &lt;= 10</code></td>
                        </tr>
                    </tbody>
                </table>
            </section>

            {/* Logical Operators */}
            <section style={{ marginBottom: 20 }}>
                <h6 style={{ borderBottom: '1px solid #ddd', paddingBottom: 5 }}>
                    Logical Operators
                </h6>
                <table className="table table-sm" style={{ fontSize: '0.9em' }}>
                    <tbody>
                        <tr>
                            <td><code>and</code> / <code>&amp;&amp;</code></td>
                            <td>Both conditions must be true</td>
                            <td><code>age &gt;= 18 and status == "active"</code></td>
                        </tr>
                        <tr>
                            <td><code>or</code> / <code>||</code></td>
                            <td>Either condition can be true</td>
                            <td><code>tier == "gold" or tier == "platinum"</code></td>
                        </tr>
                        <tr>
                            <td><code>not</code> / <code>!</code></td>
                            <td>Negates a condition</td>
                            <td><code>not isBlocked</code></td>
                        </tr>
                    </tbody>
                </table>
            </section>

            {/* Special Operators */}
            <section style={{ marginBottom: 20 }}>
                <h6 style={{ borderBottom: '1px solid #ddd', paddingBottom: 5 }}>
                    Special Operators
                </h6>
                <table className="table table-sm" style={{ fontSize: '0.9em' }}>
                    <tbody>
                        <tr>
                            <td><code>in</code></td>
                            <td>Value is in a list</td>
                            <td><code>country in ["US", "CA", "UK"]</code></td>
                        </tr>
                        <tr>
                            <td><code>between</code></td>
                            <td>Value is in a range (inclusive)</td>
                            <td><code>age between 18 and 65</code></td>
                        </tr>
                        <tr>
                            <td><code>contains</code></td>
                            <td>String contains substring</td>
                            <td><code>contains(name, "john")</code></td>
                        </tr>
                        <tr>
                            <td><code>startsWith</code></td>
                            <td>String starts with prefix</td>
                            <td><code>startsWith(email, "admin")</code></td>
                        </tr>
                        <tr>
                            <td><code>endsWith</code></td>
                            <td>String ends with suffix</td>
                            <td><code>endsWith(email, ".com")</code></td>
                        </tr>
                    </tbody>
                </table>
            </section>

            {/* Functions */}
            <section style={{ marginBottom: 20 }}>
                <h6 style={{ borderBottom: '1px solid #ddd', paddingBottom: 5 }}>
                    Built-in Functions
                </h6>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                        <strong>String Functions</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: 20 }}>
                            <li><code>len(s)</code> - String length</li>
                            <li><code>upper(s)</code> - Uppercase</li>
                            <li><code>lower(s)</code> - Lowercase</li>
                            <li><code>trim(s)</code> - Remove whitespace</li>
                        </ul>
                    </div>
                    <div>
                        <strong>Math Functions</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: 20 }}>
                            <li><code>abs(n)</code> - Absolute value</li>
                            <li><code>floor(n)</code> - Round down</li>
                            <li><code>ceil(n)</code> - Round up</li>
                            <li><code>round(n, decimals)</code> - Round</li>
                        </ul>
                    </div>
                    <div>
                        <strong>Collection Functions</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: 20 }}>
                            <li><code>sum(arr)</code> - Sum of array</li>
                            <li><code>avg(arr)</code> - Average</li>
                            <li><code>count(arr)</code> - Array length</li>
                            <li><code>min(a, b)</code> / <code>max(a, b)</code></li>
                        </ul>
                    </div>
                    <div>
                        <strong>Date Functions</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: 20 }}>
                            <li><code>now()</code> - Current timestamp</li>
                            <li><code>daysSince(date)</code> - Days since date</li>
                            <li><code>ageInYears(dob)</code> - Age from DOB</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Decision Table Syntax */}
            <section style={{ marginBottom: 20 }}>
                <h6 style={{ borderBottom: '1px solid #ddd', paddingBottom: 5 }}>
                    Decision Table Cell Syntax
                </h6>
                <table className="table table-sm" style={{ fontSize: '0.9em' }}>
                    <tbody>
                        <tr>
                            <td><code>*</code> or empty</td>
                            <td>Wildcard - matches any value</td>
                        </tr>
                        <tr>
                            <td><code>gold</code></td>
                            <td>Exact match</td>
                        </tr>
                        <tr>
                            <td><code>&gt; 100</code></td>
                            <td>Greater than 100</td>
                        </tr>
                        <tr>
                            <td><code>18..65</code></td>
                            <td>Between 18 and 65 (inclusive)</td>
                        </tr>
                        <tr>
                            <td><code>US, CA, UK</code></td>
                            <td>One of these values</td>
                        </tr>
                        <tr>
                            <td><code>!= blocked</code></td>
                            <td>Not equal to "blocked"</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            {/* Pipeline References */}
            <section>
                <h6 style={{ borderBottom: '1px solid #ddd', paddingBottom: 5 }}>
                    Pipeline Step References
                </h6>
                <p style={{ color: '#666', margin: '5px 0' }}>
                    In pipeline mode, reference previous step outputs using <code>$.stepKey</code>:
                </p>
                <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4 }}>
{`Step 1 (key: subtotal):  price * quantity
Step 2 (key: discount):  if($.subtotal > 100, 0.1, 0.05)
Step 3 (key: total):     $.subtotal - ($.subtotal * $.discount)`}
                </pre>
            </section>
        </div>
    );

    if (!collapsible) {
        return (
            <div className="syntax-help" style={{ padding: 15, background: '#fafafa', borderRadius: 8 }}>
                <h5 style={{ marginBottom: 15 }}>Expression Syntax Reference</h5>
                {content}
            </div>
        );
    }

    return (
        <div className="syntax-help" style={{ border: '1px solid #ddd', borderRadius: 8 }}>
            <div
                onClick={() => setCollapsed(!collapsed)}
                style={{
                    padding: '10px 15px',
                    background: '#f8f9fa',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}
            >
                <strong>Expression Syntax Help</strong>
                <span>{collapsed ? '▶ Show' : '▼ Hide'}</span>
            </div>
            {!collapsed && <div style={{ padding: 15 }}>{content}</div>}
        </div>
    );
}
