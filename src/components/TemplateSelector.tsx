import { useState, useMemo } from 'react';
import { ruleTemplates, type RuleTemplate } from '../config/ruleTemplates';

interface TemplateSelectorProps {
    /** Callback when a template is selected */
    onSelect: (template: RuleTemplate) => void;
    /** Additional custom templates */
    customTemplates?: RuleTemplate[];
    /** Show as dropdown or list */
    variant?: 'dropdown' | 'list' | 'cards';
}

export function TemplateSelector({
    onSelect,
    customTemplates = [],
    variant = 'cards',
}: TemplateSelectorProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Combine built-in and custom templates
    const allTemplates = useMemo(() => [...ruleTemplates, ...customTemplates], [customTemplates]);

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set(allTemplates.map(t => t.category));
        return ['all', ...Array.from(cats).sort()];
    }, [allTemplates]);

    // Filter templates
    const filteredTemplates = useMemo(() => {
        return allTemplates.filter(template => {
            const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
            const matchesSearch = !searchQuery ||
                template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                template.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [allTemplates, selectedCategory, searchQuery]);

    // Group by category for list view
    const groupedTemplates = useMemo(() => {
        const groups: Record<string, RuleTemplate[]> = {};
        filteredTemplates.forEach(t => {
            if (!groups[t.category]) groups[t.category] = [];
            groups[t.category].push(t);
        });
        return groups;
    }, [filteredTemplates]);

    if (variant === 'dropdown') {
        return (
            <div className="template-selector-dropdown">
                <select
                    onChange={e => {
                        const template = allTemplates.find(t => t.id === e.target.value);
                        if (template) onSelect(template);
                    }}
                    defaultValue=""
                    style={{ padding: '8px 12px', fontSize: '0.95em' }}
                >
                    <option value="" disabled>
                        Select a template...
                    </option>
                    {categories.filter(c => c !== 'all').map(category => (
                        <optgroup key={category} label={category}>
                            {allTemplates
                                .filter(t => t.category === category)
                                .map(template => (
                                    <option key={template.id} value={template.id}>
                                        {template.name}
                                    </option>
                                ))}
                        </optgroup>
                    ))}
                </select>
            </div>
        );
    }

    if (variant === 'list') {
        return (
            <div className="template-selector-list">
                {/* Search */}
                <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: 8, marginBottom: 10 }}
                />

                {/* Grouped list */}
                {Object.entries(groupedTemplates).map(([category, templates]) => (
                    <div key={category} style={{ marginBottom: 15 }}>
                        <h6 style={{ color: '#666', borderBottom: '1px solid #ddd', paddingBottom: 5 }}>
                            {category}
                        </h6>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {templates.map(template => (
                                <li
                                    key={template.id}
                                    onClick={() => onSelect(template)}
                                    style={{
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        borderRadius: 4,
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f0')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <strong>{template.name}</strong>
                                    <div style={{ fontSize: '0.85em', color: '#666' }}>
                                        {template.description}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        );
    }

    // Cards variant (default)
    return (
        <div className="template-selector-cards">
            {/* Filters */}
            <div style={{ marginBottom: 15, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ flex: 1, minWidth: 200, padding: 8 }}
                />
                <select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    style={{ padding: 8 }}
                >
                    {categories.map(cat => (
                        <option key={cat} value={cat}>
                            {cat === 'all' ? 'All Categories' : cat}
                        </option>
                    ))}
                </select>
            </div>

            {/* Cards grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: 15,
                }}
            >
                {filteredTemplates.map(template => (
                    <div
                        key={template.id}
                        onClick={() => onSelect(template)}
                        style={{
                            border: '1px solid #ddd',
                            borderRadius: 8,
                            padding: 15,
                            cursor: 'pointer',
                            transition: 'box-shadow 0.2s, transform 0.2s',
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.transform = 'none';
                        }}
                    >
                        <div style={{ marginBottom: 5 }}>
                            <span
                                style={{
                                    fontSize: '0.75em',
                                    background: getCategoryColor(template.category),
                                    color: 'white',
                                    padding: '2px 8px',
                                    borderRadius: 10,
                                }}
                            >
                                {template.category}
                            </span>
                        </div>
                        <h6 style={{ margin: '5px 0' }}>{template.name}</h6>
                        <p style={{ fontSize: '0.85em', color: '#666', margin: 0 }}>
                            {template.description}
                        </p>
                    </div>
                ))}
            </div>

            {filteredTemplates.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', padding: 30 }}>
                    No templates match your search.
                </div>
            )}
        </div>
    );
}

// Helper to get category-specific colors
function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
        Eligibility: '#0d6efd',
        Authorization: '#6f42c1',
        Risk: '#dc3545',
        Vitals: '#198754',
        Encounter: '#fd7e14',
    };
    return colors[category] || '#6c757d';
}
