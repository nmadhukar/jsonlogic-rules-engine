import type { Field } from 'react-querybuilder';

export interface RuleTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    jsonLogic: any;
}

export interface DataPreset {
    name: string;
    data: Record<string, any>;
}

export interface Rule {
    id: string;
    name: string;
    description?: string;
    domainId: string;
    jsonLogic: any;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Domain {
    id: string;
    name: string;
    description?: string;
    fields: Field[];
    templates: RuleTemplate[];
    presets: DataPreset[];
    // rules?: Rule[]; // Optional, depending on if we fetch them with domain
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
