import { Test, TestingModule } from '@nestjs/testing';
import { TestingService } from './testing.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutionService } from '../execution/execution.service';

describe('TestingService', () => {
    let service: TestingService;
    let prisma: any;
    let executionService: any;

    const mockSuite = {
        id: 'suite-1',
        name: 'Basic Tests',
        domainId: 'domain-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        cases: [
            {
                id: 'case-1',
                suiteId: 'suite-1',
                name: 'Senior Patient',
                inputData: { patient: { age: 70 } },
                expectedResult: { 'Age Check': true },
                createdAt: new Date(),
            },
        ],
    };

    const mockExecutionResult = {
        domainId: 'domain-1',
        domainName: 'Healthcare',
        environment: 'production',
        timestamp: new Date().toISOString(),
        totalRules: 1,
        passed: 1,
        failed: 0,
        results: [
            { ruleId: 'r1', ruleName: 'Age Check', result: true, passed: true, priority: 0, executionTimeMs: 1 },
        ],
        executionTimeMs: 5,
    };

    beforeEach(async () => {
        prisma = {
            testSuite: {
                create: jest.fn().mockResolvedValue(mockSuite),
                findMany: jest.fn().mockResolvedValue([mockSuite]),
                findUnique: jest.fn().mockResolvedValue(mockSuite),
                delete: jest.fn().mockResolvedValue(mockSuite),
            },
            testCase: {
                create: jest.fn().mockResolvedValue(mockSuite.cases[0]),
                delete: jest.fn().mockResolvedValue(mockSuite.cases[0]),
                deleteMany: jest.fn(),
            },
        };

        executionService = {
            execute: jest.fn().mockResolvedValue(mockExecutionResult),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TestingService,
                { provide: PrismaService, useValue: prisma },
                { provide: ExecutionService, useValue: executionService },
            ],
        }).compile();

        service = module.get<TestingService>(TestingService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create a test suite', async () => {
        await service.createSuite({ name: 'New Suite', domainId: 'domain-1' });
        expect(prisma.testSuite.create).toHaveBeenCalled();
    });

    it('should list all suites', async () => {
        const result = await service.findAllSuites();
        expect(result).toHaveLength(1);
    });

    it('should filter suites by domainId', async () => {
        await service.findAllSuites('domain-1');
        expect(prisma.testSuite.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { domainId: 'domain-1' } }),
        );
    });

    it('should find a suite with cases', async () => {
        const result = await service.findSuite('suite-1');
        expect(result?.cases).toHaveLength(1);
    });

    it('should delete a suite and its cases', async () => {
        await service.deleteSuite('suite-1');
        expect(prisma.testCase.deleteMany).toHaveBeenCalledWith({ where: { suiteId: 'suite-1' } });
        expect(prisma.testSuite.delete).toHaveBeenCalledWith({ where: { id: 'suite-1' } });
    });

    it('should add a test case', async () => {
        await service.addCase('suite-1', {
            name: 'New Case',
            inputData: { x: 1 },
            expectedResult: { 'Rule': true },
        });
        expect(prisma.testCase.create).toHaveBeenCalled();
    });

    it('should delete a test case', async () => {
        await service.deleteCase('case-1');
        expect(prisma.testCase.delete).toHaveBeenCalledWith({ where: { id: 'case-1' } });
    });

    it('should run a test suite and return results', async () => {
        const result = await service.runSuite('suite-1');

        expect(result.suiteId).toBe('suite-1');
        expect(result.suiteName).toBe('Basic Tests');
        expect(result.totalCases).toBe(1);
        expect(result.results).toHaveLength(1);
        expect(executionService.execute).toHaveBeenCalledWith(
            'domain-1',
            { patient: { age: 70 } },
        );
    });

    it('should throw for non-existent suite on run', async () => {
        prisma.testSuite.findUnique.mockResolvedValue(null);
        await expect(service.runSuite('bad-id')).rejects.toThrow('not found');
    });

    it('should count passed and failed test cases', async () => {
        const result = await service.runSuite('suite-1');
        expect(result.passed + result.failed).toBe(result.totalCases);
    });

    it('should include execution timing', async () => {
        const result = await service.runSuite('suite-1');
        expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    });
});
