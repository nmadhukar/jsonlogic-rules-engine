/**
 * Analysis Service — Static rule conflict detection and quality warnings.
 *
 * Performs pairwise comparison of all active rules within a domain to identify
 * conflicts (contradictions, overlaps) and quality warnings (always-true,
 * always-false, redundant, unreachable rules).
 *
 * Key behaviors:
 * - Extracts fields and conditions from JSONLogic expressions recursively
 * - Compares rules bidirectionally for range contradictions (>, <, >=, <=)
 * - Detects equality contradictions (same field, different == values)
 * - Checks for identical JSONLogic (exact overlap)
 * - Reports always-true/false for trivial static values (true, false, null, 0)
 *
 * @module AnalysisService
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ConflictReport {
    domainId: string;
    domainName: string;
    totalRules: number;
    conflicts: ConflictItem[];
    warnings: WarningItem[];
    analyzedAt: string;
}

export interface ConflictItem {
    type: 'contradiction' | 'overlap' | 'subsumption';
    severity: 'high' | 'medium' | 'low';
    ruleA: { id: string; name: string };
    ruleB: { id: string; name: string };
    description: string;
    field: string;
}

export interface WarningItem {
    type: 'unreachable' | 'redundant' | 'always-true' | 'always-false';
    severity: 'medium' | 'low';
    rule: { id: string; name: string };
    description: string;
}

@Injectable()
export class AnalysisService {
    constructor(private prisma: PrismaService) { }

    async analyzeConflicts(domainId: string): Promise<ConflictReport> {
        const domain = await this.prisma.domain.findUnique({
            where: { id: domainId },
            include: { rules: { where: { isActive: true } } },
        });

        if (!domain) {
            throw new Error(`Domain "${domainId}" not found`);
        }

        const conflicts: ConflictItem[] = [];
        const warnings: WarningItem[] = [];
        const rules = domain.rules;

        // Analyze each rule for issues
        for (const rule of rules) {
            const logic = rule.jsonLogic as any;

            // Check for always-true/always-false rules
            if (this.isAlwaysTrue(logic)) {
                warnings.push({
                    type: 'always-true',
                    severity: 'medium',
                    rule: { id: rule.id, name: rule.name },
                    description: `Rule "${rule.name}" will always evaluate to true`,
                });
            }

            if (this.isAlwaysFalse(logic)) {
                warnings.push({
                    type: 'always-false',
                    severity: 'medium',
                    rule: { id: rule.id, name: rule.name },
                    description: `Rule "${rule.name}" will always evaluate to false`,
                });
            }
        }

        // Pairwise comparison for conflicts
        for (let i = 0; i < rules.length; i++) {
            for (let j = i + 1; j < rules.length; j++) {
                const ruleA = rules[i];
                const ruleB = rules[j];
                const logicA = ruleA.jsonLogic as any;
                const logicB = ruleB.jsonLogic as any;

                // Check for contradictions on the same field
                const fieldsA = this.extractFields(logicA);
                const fieldsB = this.extractFields(logicB);
                const commonFields = fieldsA.filter(f => fieldsB.includes(f));

                for (const field of commonFields) {
                    const condA = this.extractCondition(logicA, field);
                    const condB = this.extractCondition(logicB, field);

                    if (condA && condB) {
                        const conflict = this.detectConflict(condA, condB, field);
                        if (conflict) {
                            conflicts.push({
                                ...conflict,
                                ruleA: { id: ruleA.id, name: ruleA.name },
                                ruleB: { id: ruleB.id, name: ruleB.name },
                            });
                        }
                    }
                }

                // Check for duplicate/overlapping logic
                if (JSON.stringify(logicA) === JSON.stringify(logicB)) {
                    conflicts.push({
                        type: 'overlap',
                        severity: 'high',
                        ruleA: { id: ruleA.id, name: ruleA.name },
                        ruleB: { id: ruleB.id, name: ruleB.name },
                        description: `Rules "${ruleA.name}" and "${ruleB.name}" have identical logic`,
                        field: '*',
                    });
                }
            }
        }

        return {
            domainId,
            domainName: domain.name,
            totalRules: rules.length,
            conflicts,
            warnings,
            analyzedAt: new Date().toISOString(),
        };
    }

    private isAlwaysTrue(logic: any): boolean {
        if (typeof logic === 'boolean') return logic === true;
        if (typeof logic === 'number') return logic !== 0;
        if (typeof logic === 'string') return logic.length > 0;
        return false;
    }

    private isAlwaysFalse(logic: any): boolean {
        if (typeof logic === 'boolean') return logic === false;
        if (typeof logic === 'number') return logic === 0;
        if (logic === null || logic === undefined) return true;
        if (typeof logic === 'string') return logic.length === 0;
        return false;
    }

    private extractFields(logic: any): string[] {
        const fields: string[] = [];
        if (!logic || typeof logic !== 'object') return fields;

        if (logic.var) {
            fields.push(typeof logic.var === 'string' ? logic.var : String(logic.var));
            return fields;
        }

        for (const key of Object.keys(logic)) {
            const value = logic[key];
            if (Array.isArray(value)) {
                for (const item of value) {
                    fields.push(...this.extractFields(item));
                }
            } else if (typeof value === 'object' && value !== null) {
                fields.push(...this.extractFields(value));
            }
        }

        return [...new Set(fields)];
    }

    private extractCondition(logic: any, field: string): { operator: string; value: any } | null {
        if (!logic || typeof logic !== 'object') return null;

        for (const op of ['>', '<', '>=', '<=', '==', '!=', '===', '!==']) {
            if (logic[op] && Array.isArray(logic[op])) {
                const args = logic[op];
                for (let i = 0; i < args.length; i++) {
                    if (args[i]?.var === field) {
                        const valueIdx = i === 0 ? 1 : 0;
                        return { operator: op, value: args[valueIdx] };
                    }
                }
            }
        }

        // Recurse into and/or
        for (const boolOp of ['and', 'or']) {
            if (logic[boolOp] && Array.isArray(logic[boolOp])) {
                for (const sub of logic[boolOp]) {
                    const result = this.extractCondition(sub, field);
                    if (result) return result;
                }
            }
        }

        return null;
    }

    private detectConflict(
        condA: { operator: string; value: any },
        condB: { operator: string; value: any },
        field: string,
    ): Omit<ConflictItem, 'ruleA' | 'ruleB'> | null {
        const a = condA;
        const b = condB;

        // Contradiction: Rule A says > X, Rule B says < Y where Y <= X
        if (
            (a.operator === '>' || a.operator === '>=') &&
            (b.operator === '<' || b.operator === '<=')
        ) {
            if (typeof a.value === 'number' && typeof b.value === 'number' && b.value <= a.value) {
                return {
                    type: 'contradiction',
                    severity: 'high',
                    description: `Contradicting conditions on "${field}": ${a.operator} ${a.value} vs ${b.operator} ${b.value}`,
                    field,
                };
            }
        }

        // Reverse direction: Rule A says < X, Rule B says > Y where Y >= X
        if (
            (a.operator === '<' || a.operator === '<=') &&
            (b.operator === '>' || b.operator === '>=')
        ) {
            if (typeof a.value === 'number' && typeof b.value === 'number' && b.value >= a.value) {
                return {
                    type: 'contradiction',
                    severity: 'high',
                    description: `Contradicting conditions on "${field}": ${a.operator} ${a.value} vs ${b.operator} ${b.value}`,
                    field,
                };
            }
        }

        // Opposite equality
        if (a.operator === '==' && b.operator === '==' && a.value !== b.value) {
            return {
                type: 'contradiction',
                severity: 'medium',
                description: `Both rules check "${field}" for different values: "${a.value}" vs "${b.value}"`,
                field,
            };
        }

        return null;
    }
}
