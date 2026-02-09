/**
 * Execution Service — Core rule evaluation engine.
 *
 * Evaluates JSONLogic rules against provided input data within a domain context.
 * Supports environment filtering, scheduling (startDate/endDate), and priority-based
 * execution ordering. Each rule is independently evaluated — one rule failing does
 * not affect others. Results include per-rule pass/fail status and timing metrics.
 *
 * @module ExecutionService
 * @see {@link https://jsonlogic.com} JSONLogic specification
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as jsonLogic from 'json-logic-js';
import { Rule } from '@prisma/client';

export interface RuleResult {
    ruleId: string;
    ruleName: string;
    result: any;
    passed: boolean;
    priority: number;
    executionTimeMs: number;
}

export interface ExecutionResult {
    domainId: string;
    domainName: string;
    environment: string;
    timestamp: string;
    totalRules: number;
    passed: number;
    failed: number;
    results: RuleResult[];
    executionTimeMs: number;
}

@Injectable()
export class ExecutionService {
    constructor(private prisma: PrismaService) { }

    async execute(
        domainId: string,
        data: Record<string, any>,
        ruleIds?: string[],
        environment: string = 'production',
    ): Promise<ExecutionResult> {
        const startTime = Date.now();

        // Fetch domain
        const domain = await this.prisma.domain.findUnique({ where: { id: domainId } });
        if (!domain) {
            throw new Error(`Domain "${domainId}" not found`);
        }

        // Build rule query
        const now = new Date();
        const whereClause: any = {
            domainId,
            isActive: true,
            environment,
            OR: [
                { startDate: null, endDate: null },
                { startDate: { lte: now }, endDate: null },
                { startDate: null, endDate: { gte: now } },
                { startDate: { lte: now }, endDate: { gte: now } },
            ],
        };

        if (ruleIds && ruleIds.length > 0) {
            whereClause.id = { in: ruleIds };
        }

        // Fetch rules ordered by priority (higher first)
        const rules = await this.prisma.rule.findMany({
            where: whereClause,
            orderBy: { priority: 'desc' },
        });

        // Execute each rule
        const results: RuleResult[] = rules.map(rule => {
            const ruleStart = Date.now();
            let result: any;
            let passed = false;

            try {
                result = jsonLogic.apply(rule.jsonLogic as any, data);
                passed = !!result; // Truthy = passed
            } catch (error: any) {
                result = { error: error.message };
                passed = false;
            }

            return {
                ruleId: rule.id,
                ruleName: rule.name,
                result,
                passed,
                priority: rule.priority,
                executionTimeMs: Date.now() - ruleStart,
            };
        });

        const passedCount = results.filter(r => r.passed).length;

        return {
            domainId,
            domainName: domain.name,
            environment,
            timestamp: new Date().toISOString(),
            totalRules: results.length,
            passed: passedCount,
            failed: results.length - passedCount,
            results,
            executionTimeMs: Date.now() - startTime,
        };
    }
}
