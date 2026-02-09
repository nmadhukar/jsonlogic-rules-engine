import { Test, TestingModule } from '@nestjs/testing';
import { AnalysisService } from './analysis.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalysisService', () => {
    let service: AnalysisService;
    let prisma: any;

    const baseDomain = {
        id: 'domain-1',
        name: 'TestDomain',
        isActive: true,
    };

    beforeEach(async () => {
        prisma = {
            domain: { findUnique: jest.fn() },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalysisService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<AnalysisService>(AnalysisService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should throw error for non-existent domain', async () => {
        prisma.domain.findUnique.mockResolvedValue(null);
        await expect(service.analyzeConflicts('bad-id')).rejects.toThrow('not found');
    });

    it('should return empty conflicts for domain with no rules', async () => {
        prisma.domain.findUnique.mockResolvedValue({ ...baseDomain, rules: [] });

        const result = await service.analyzeConflicts('domain-1');

        expect(result.conflicts).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
        expect(result.totalRules).toBe(0);
    });

    it('should detect duplicate rules', async () => {
        const rules = [
            { id: 'r1', name: 'Rule A', jsonLogic: { '>': [{ var: 'x' }, 10] }, isActive: true },
            { id: 'r2', name: 'Rule B', jsonLogic: { '>': [{ var: 'x' }, 10] }, isActive: true },
        ];
        prisma.domain.findUnique.mockResolvedValue({ ...baseDomain, rules });

        const result = await service.analyzeConflicts('domain-1');

        expect(result.conflicts.some(c => c.type === 'overlap')).toBe(true);
    });

    it('should detect always-true rules', async () => {
        const rules = [
            { id: 'r1', name: 'Always True', jsonLogic: true, isActive: true },
        ];
        prisma.domain.findUnique.mockResolvedValue({ ...baseDomain, rules });

        const result = await service.analyzeConflicts('domain-1');

        expect(result.warnings.some(w => w.type === 'always-true')).toBe(true);
    });

    it('should detect always-false rules', async () => {
        const rules = [
            { id: 'r1', name: 'Always False', jsonLogic: false, isActive: true },
        ];
        prisma.domain.findUnique.mockResolvedValue({ ...baseDomain, rules });

        const result = await service.analyzeConflicts('domain-1');

        expect(result.warnings.some(w => w.type === 'always-false')).toBe(true);
    });

    it('should detect contradicting conditions', async () => {
        const rules = [
            { id: 'r1', name: 'Above 50', jsonLogic: { '>=': [{ var: 'age' }, 50] }, isActive: true },
            { id: 'r2', name: 'Below 30', jsonLogic: { '<': [{ var: 'age' }, 30] }, isActive: true },
        ];
        prisma.domain.findUnique.mockResolvedValue({ ...baseDomain, rules });

        const result = await service.analyzeConflicts('domain-1');

        expect(result.conflicts.some(c => c.type === 'contradiction')).toBe(true);
    });

    it('should detect contradicting equality conditions', async () => {
        const rules = [
            { id: 'r1', name: 'Type A', jsonLogic: { '==': [{ var: 'type' }, 'a'] }, isActive: true },
            { id: 'r2', name: 'Type B', jsonLogic: { '==': [{ var: 'type' }, 'b'] }, isActive: true },
        ];
        prisma.domain.findUnique.mockResolvedValue({ ...baseDomain, rules });

        const result = await service.analyzeConflicts('domain-1');

        expect(result.conflicts.some(c => c.type === 'contradiction')).toBe(true);
    });

    it('should not detect conflicts between unrelated rules', async () => {
        const rules = [
            { id: 'r1', name: 'Age Rule', jsonLogic: { '>': [{ var: 'age' }, 18] }, isActive: true },
            { id: 'r2', name: 'Salary Rule', jsonLogic: { '>': [{ var: 'salary' }, 50000] }, isActive: true },
        ];
        prisma.domain.findUnique.mockResolvedValue({ ...baseDomain, rules });

        const result = await service.analyzeConflicts('domain-1');

        expect(result.conflicts.filter(c => c.type === 'contradiction')).toHaveLength(0);
    });

    it('should return domain metadata in report', async () => {
        prisma.domain.findUnique.mockResolvedValue({ ...baseDomain, rules: [] });

        const result = await service.analyzeConflicts('domain-1');

        expect(result.domainId).toBe('domain-1');
        expect(result.domainName).toBe('TestDomain');
        expect(result.analyzedAt).toBeDefined();
    });
});
