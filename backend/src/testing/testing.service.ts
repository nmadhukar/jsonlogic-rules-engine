/**
 * Testing Service — Automated test suite management and execution.
 *
 * Provides CRUD for test suites and test cases, plus a runner that executes
 * all cases in a suite against the ExecutionService. Each test case defines
 * input data and expected outcomes (which rules should pass/fail).
 *
 * Key behaviors:
 * - Test suites belong to a domain and cascade-delete their cases
 * - Running a suite executes all cases against the live rules
 * - Comparison matches expected results by rule name or rule ID
 * - Results include per-case pass/fail and actual vs expected details
 *
 * @module TestingService
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TestSuite, TestCase } from '@prisma/client';
import { ExecutionService, RuleResult } from '../execution/execution.service';

export interface TestCaseResult {
    testCaseId: string;
    testCaseName: string;
    passed: boolean;
    ruleResults: RuleResult[];
    expected: any;
    actual: any;
}

export interface TestSuiteRunResult {
    suiteId: string;
    suiteName: string;
    domainId: string;
    totalCases: number;
    passed: number;
    failed: number;
    results: TestCaseResult[];
    executionTimeMs: number;
}

@Injectable()
export class TestingService {
    constructor(
        private prisma: PrismaService,
        private executionService: ExecutionService,
    ) { }

    async createSuite(data: { name: string; domainId: string }): Promise<TestSuite> {
        return this.prisma.testSuite.create({ data });
    }

    async findAllSuites(domainId?: string): Promise<TestSuite[]> {
        const where = domainId ? { domainId } : {};
        return this.prisma.testSuite.findMany({
            where,
            include: { cases: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findSuite(id: string): Promise<TestSuite & { cases: TestCase[] } | null> {
        return this.prisma.testSuite.findUnique({
            where: { id },
            include: { cases: true },
        });
    }

    async deleteSuite(id: string): Promise<TestSuite> {
        await this.prisma.testCase.deleteMany({ where: { suiteId: id } });
        return this.prisma.testSuite.delete({ where: { id } });
    }

    async addCase(suiteId: string, data: { name: string; inputData: any; expectedResult: any }): Promise<TestCase> {
        return this.prisma.testCase.create({
            data: {
                suiteId,
                name: data.name,
                inputData: data.inputData,
                expectedResult: data.expectedResult,
            },
        });
    }

    async deleteCase(id: string): Promise<TestCase> {
        return this.prisma.testCase.delete({ where: { id } });
    }

    async runSuite(suiteId: string): Promise<TestSuiteRunResult> {
        const startTime = Date.now();

        const suite = await this.prisma.testSuite.findUnique({
            where: { id: suiteId },
            include: { cases: true },
        });

        if (!suite) {
            throw new NotFoundException(`Test suite "${suiteId}" not found`);
        }

        const results: TestCaseResult[] = [];

        for (const testCase of suite.cases) {
            const execution = await this.executionService.execute(
                suite.domainId,
                testCase.inputData as Record<string, any>,
            );

            // Compare actual results against expected
            const expected = testCase.expectedResult as Record<string, any>;
            let casePassed = true;

            // Simple comparison: check if expected rule outcomes match
            if (expected && typeof expected === 'object') {
                for (const [key, expectedValue] of Object.entries(expected)) {
                    const ruleResult = execution.results.find(r => r.ruleId === key || r.ruleName === key);
                    if (ruleResult && ruleResult.passed !== expectedValue) {
                        casePassed = false;
                    }
                }
            } else {
                // If no specific expectations, just check all rules passed
                casePassed = execution.passed === execution.totalRules;
            }

            results.push({
                testCaseId: testCase.id,
                testCaseName: testCase.name,
                passed: casePassed,
                ruleResults: execution.results,
                expected: testCase.expectedResult,
                actual: execution.results.map(r => ({ [r.ruleName]: r.passed })),
            });
        }

        const passedCount = results.filter(r => r.passed).length;

        return {
            suiteId,
            suiteName: suite.name,
            domainId: suite.domainId,
            totalCases: results.length,
            passed: passedCount,
            failed: results.length - passedCount,
            results,
            executionTimeMs: Date.now() - startTime,
        };
    }
}
