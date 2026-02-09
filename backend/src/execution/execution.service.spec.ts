import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionService } from './execution.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock json-logic-js
jest.mock('json-logic-js', () => ({
    apply: jest.fn((logic: any, data: any) => {
        if (!logic || typeof logic !== 'object') return false;
        const op = Object.keys(logic)[0];
        const args = logic[op];
        if (op === '>=' && args) {
            const val = data?.patient?.age ?? data?.employee?.years ?? 0;
            return val >= args[1];
        }
        if (op === '==' && args) {
            return true;
        }
        return true;
    }),
}));

describe('ExecutionService', () => {
    let service: ExecutionService;
    let prisma: any;

    const mockDomain = {
        id: 'domain-1',
        name: 'TestDomain',
        description: 'Test',
        fields: [],
        templates: [],
        presets: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockRules = [
        { id: 'rule-1', name: 'Age Check', jsonLogic: { '>=': [{ var: 'patient.age' }, 65] }, priority: 1, isActive: true, domainId: 'domain-1', environment: 'production', startDate: null, endDate: null, description: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 'rule-2', name: 'Type Check', jsonLogic: { '==': [{ var: 'type' }, 'inpatient'] }, priority: 0, isActive: true, domainId: 'domain-1', environment: 'production', startDate: null, endDate: null, description: null, createdAt: new Date(), updatedAt: new Date() },
    ];

    beforeEach(async () => {
        prisma = {
            domain: { findUnique: jest.fn() },
            rule: { findMany: jest.fn() },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExecutionService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<ExecutionService>(ExecutionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should execute rules and return results', async () => {
        prisma.domain.findUnique.mockResolvedValue(mockDomain);
        prisma.rule.findMany.mockResolvedValue(mockRules);

        const result = await service.execute('domain-1', { patient: { age: 70 } });

        expect(result.domainId).toBe('domain-1');
        expect(result.domainName).toBe('TestDomain');
        expect(result.totalRules).toBe(2);
        expect(result.results).toHaveLength(2);
        expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
        expect(result.timestamp).toBeDefined();
    });

    it('should throw error for non-existent domain', async () => {
        prisma.domain.findUnique.mockResolvedValue(null);

        await expect(service.execute('bad-id', {})).rejects.toThrow('Domain "bad-id" not found');
    });

    it('should filter by ruleIds when provided', async () => {
        prisma.domain.findUnique.mockResolvedValue(mockDomain);
        prisma.rule.findMany.mockResolvedValue([mockRules[0]]);

        const result = await service.execute('domain-1', { patient: { age: 70 } }, ['rule-1']);

        expect(result.totalRules).toBe(1);
        expect(result.results[0].ruleId).toBe('rule-1');
    });

    it('should count passed and failed rules', async () => {
        const jsonLogic = require('json-logic-js');
        jsonLogic.apply.mockReturnValueOnce(true).mockReturnValueOnce(false);
        prisma.domain.findUnique.mockResolvedValue(mockDomain);
        prisma.rule.findMany.mockResolvedValue(mockRules);

        const result = await service.execute('domain-1', {});

        expect(result.passed).toBe(1);
        expect(result.failed).toBe(1);
    });

    it('should handle rule execution errors gracefully', async () => {
        const jsonLogic = require('json-logic-js');
        jsonLogic.apply.mockImplementationOnce(() => { throw new Error('Bad logic'); });
        prisma.domain.findUnique.mockResolvedValue(mockDomain);
        prisma.rule.findMany.mockResolvedValue([mockRules[0]]);

        const result = await service.execute('domain-1', {});

        expect(result.results[0].passed).toBe(false);
        expect(result.results[0].result).toEqual({ error: 'Bad logic' });
    });

    it('should filter by environment', async () => {
        prisma.domain.findUnique.mockResolvedValue(mockDomain);
        prisma.rule.findMany.mockResolvedValue([]);

        await service.execute('domain-1', {}, undefined, 'staging');

        expect(prisma.rule.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ environment: 'staging' }),
            }),
        );
    });

    it('should return timing information for each rule', async () => {
        prisma.domain.findUnique.mockResolvedValue(mockDomain);
        prisma.rule.findMany.mockResolvedValue(mockRules);

        const result = await service.execute('domain-1', { patient: { age: 70 } });

        for (const ruleResult of result.results) {
            expect(ruleResult.executionTimeMs).toBeGreaterThanOrEqual(0);
            expect(ruleResult.ruleName).toBeDefined();
            expect(ruleResult.ruleId).toBeDefined();
        }
    });
});
