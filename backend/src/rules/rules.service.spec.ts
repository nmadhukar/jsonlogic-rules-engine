import { Test, TestingModule } from '@nestjs/testing';
import { RulesService } from './rules.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('RulesService', () => {
    let service: RulesService;
    let prisma: any;
    let audit: any;

    const mockRule = {
        id: 'rule-1',
        name: 'Test Rule',
        description: 'A test rule',
        domainId: 'domain-1',
        jsonLogic: { '>=': [{ var: 'age' }, 18] },
        priority: 0,
        isActive: true,
        environment: 'production',
        startDate: null,
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockVersion = {
        id: 'ver-1',
        ruleId: 'rule-1',
        version: 1,
        name: 'Test Rule',
        jsonLogic: { '>=': [{ var: 'age' }, 18] },
        changeMsg: 'Initial creation',
        changedBy: 'system',
        createdAt: new Date(),
    };

    beforeEach(async () => {
        prisma = {
            rule: {
                findMany: jest.fn().mockResolvedValue([mockRule]),
                findUnique: jest.fn().mockResolvedValue(mockRule),
                create: jest.fn().mockResolvedValue(mockRule),
                update: jest.fn().mockResolvedValue(mockRule),
                delete: jest.fn().mockResolvedValue(mockRule),
            },
            ruleVersion: {
                create: jest.fn().mockResolvedValue(mockVersion),
                findFirst: jest.fn().mockResolvedValue(mockVersion),
                findUnique: jest.fn().mockResolvedValue(mockVersion),
                findMany: jest.fn().mockResolvedValue([mockVersion]),
                deleteMany: jest.fn(),
            },
        };

        audit = {
            log: jest.fn().mockResolvedValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RulesService,
                { provide: PrismaService, useValue: prisma },
                { provide: AuditService, useValue: audit },
            ],
        }).compile();

        service = module.get<RulesService>(RulesService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ── CRUD ──

    it('should find all rules', async () => {
        const result = await service.findAll();
        expect(result).toHaveLength(1);
        expect(prisma.rule.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    });

    it('should filter rules by domainId', async () => {
        await service.findAll('domain-1');
        expect(prisma.rule.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { domainId: 'domain-1' } }),
        );
    });

    it('should find one rule by id', async () => {
        const result = await service.findOne('rule-1');
        expect(result).toEqual(mockRule);
    });

    it('should create a rule with initial version', async () => {
        const dto = { name: 'New Rule', domainId: 'domain-1', jsonLogic: { var: 'x' } };
        await service.create(dto);

        expect(prisma.rule.create).toHaveBeenCalled();
        expect(prisma.ruleVersion.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ version: 1, changeMsg: 'Initial creation' }),
        });
        expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE' }));
    });

    it('should update a rule and audit the change', async () => {
        const dto = { name: 'Updated Rule' };
        await service.update('rule-1', dto);

        expect(prisma.rule.update).toHaveBeenCalled();
        expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE' }));
    });

    it('should create a version when jsonLogic changes', async () => {
        const dto = { jsonLogic: { '>': [{ var: 'age' }, 21] } };
        await service.update('rule-1', dto);

        expect(prisma.ruleVersion.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ version: 2 }),
        });
    });

    it('should NOT create a version when only name changes', async () => {
        await service.update('rule-1', { name: 'Renamed' });
        expect(prisma.ruleVersion.create).not.toHaveBeenCalled();
    });

    it('should delete a rule and its versions', async () => {
        await service.remove('rule-1');

        expect(prisma.ruleVersion.deleteMany).toHaveBeenCalledWith({ where: { ruleId: 'rule-1' } });
        expect(prisma.rule.delete).toHaveBeenCalledWith({ where: { id: 'rule-1' } });
        expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE' }));
    });

    // ── Versioning ──

    it('should get version history', async () => {
        const versions = await service.getVersions('rule-1');
        expect(versions).toHaveLength(1);
        expect(prisma.ruleVersion.findMany).toHaveBeenCalledWith({
            where: { ruleId: 'rule-1' },
            orderBy: { version: 'desc' },
        });
    });

    it('should rollback to a specific version', async () => {
        prisma.ruleVersion.findUnique.mockResolvedValue(mockVersion);

        await service.rollback('rule-1', 1);

        expect(prisma.rule.update).toHaveBeenCalledWith({
            where: { id: 'rule-1' },
            data: expect.objectContaining({ jsonLogic: mockVersion.jsonLogic }),
        });
        expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'ROLLBACK' }));
    });

    it('should throw error when rollback version not found', async () => {
        prisma.ruleVersion.findUnique.mockResolvedValue(null);
        await expect(service.rollback('rule-1', 99)).rejects.toThrow('Version 99 not found');
    });

    it('should create a new version entry on rollback', async () => {
        prisma.ruleVersion.findUnique.mockResolvedValue(mockVersion);
        prisma.ruleVersion.findFirst.mockResolvedValue({ version: 3 });

        await service.rollback('rule-1', 1);

        expect(prisma.ruleVersion.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                version: 4,
                changeMsg: 'Rollback to version 1',
            }),
        });
    });

    it('should sanitize update to only include defined fields', async () => {
        await service.update('rule-1', { name: 'Only Name' });

        expect(prisma.rule.update).toHaveBeenCalledWith({
            where: { id: 'rule-1' },
            data: { name: 'Only Name' },
        });
    });
});
