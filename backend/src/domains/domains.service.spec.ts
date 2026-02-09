import { Test, TestingModule } from '@nestjs/testing';
import { DomainsService } from './domains.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('DomainsService', () => {
    let service: DomainsService;
    let prisma: any;
    let audit: any;

    const mockDomain = {
        id: 'domain-1',
        name: 'Healthcare',
        description: 'Medical rules',
        fields: [{ name: 'age', label: 'Age' }],
        templates: [],
        presets: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockRules = [
        { id: 'rule-1', name: 'Rule 1', domainId: 'domain-1', jsonLogic: {} },
    ];

    beforeEach(async () => {
        prisma = {
            domain: {
                count: jest.fn().mockResolvedValue(1),
                findMany: jest.fn().mockResolvedValue([mockDomain]),
                findUnique: jest.fn().mockResolvedValue(mockDomain),
                create: jest.fn().mockResolvedValue(mockDomain),
                update: jest.fn().mockResolvedValue(mockDomain),
                delete: jest.fn().mockResolvedValue(mockDomain),
            },
            rule: { deleteMany: jest.fn(), create: jest.fn() },
            ruleVersion: { deleteMany: jest.fn() },
            testSuite: { deleteMany: jest.fn() },
            testCase: { deleteMany: jest.fn() },
            $transaction: jest.fn((cb: Function) => cb(prisma)),
        };

        audit = { log: jest.fn().mockResolvedValue({}) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DomainsService,
                { provide: PrismaService, useValue: prisma },
                { provide: AuditService, useValue: audit },
            ],
        }).compile();

        service = module.get<DomainsService>(DomainsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ── CRUD ──

    it('should find all domains', async () => {
        const result = await service.findAll();
        expect(result).toHaveLength(1);
    });

    it('should find one domain by id', async () => {
        const result = await service.findOne('domain-1');
        expect(result?.name).toBe('Healthcare');
    });

    it('should create a domain and audit it', async () => {
        await service.create({ name: 'Finance', description: 'Billing', fields: [], templates: [], presets: [] });

        expect(prisma.domain.create).toHaveBeenCalled();
        expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE', entityType: 'Domain' }));
    });

    it('should update a domain with only defined fields', async () => {
        await service.update('domain-1', { description: 'Updated desc' });

        expect(prisma.domain.update).toHaveBeenCalledWith({
            where: { id: 'domain-1' },
            data: { description: 'Updated desc' },
        });
        expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE' }));
    });

    it('should cascade delete domain and all related data', async () => {
        await service.delete('domain-1');

        expect(prisma.testCase.deleteMany).toHaveBeenCalled();
        expect(prisma.testSuite.deleteMany).toHaveBeenCalled();
        expect(prisma.ruleVersion.deleteMany).toHaveBeenCalled();
        expect(prisma.rule.deleteMany).toHaveBeenCalledWith({ where: { domainId: 'domain-1' } });
        expect(prisma.domain.delete).toHaveBeenCalledWith({ where: { id: 'domain-1' } });
        expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE' }));
    });

    // ── Import / Export ──

    it('should export a domain with its rules', async () => {
        prisma.domain.findUnique.mockResolvedValue({
            ...mockDomain,
            rules: mockRules,
        });

        const result = await service.exportDomain('domain-1');

        expect(result.exportVersion).toBe('1.0');
        expect(result.domain.name).toBe('Healthcare');
        expect(result.rules).toHaveLength(1);
    });

    it('should return null when exporting non-existent domain', async () => {
        prisma.domain.findUnique.mockResolvedValue(null);
        const result = await service.exportDomain('bad-id');
        expect(result).toBeNull();
    });

    it('should import a domain with rules', async () => {
        prisma.domain.create.mockResolvedValue({ ...mockDomain, id: 'new-domain' });
        prisma.rule = { ...prisma.rule, create: jest.fn() };

        const payload = {
            domain: { name: 'Imported', fields: [], templates: [], presets: [] },
            rules: [{ name: 'Rule 1', jsonLogic: { var: 'x' } }],
        };

        await service.importDomain(payload);

        expect(prisma.domain.create).toHaveBeenCalled();
        expect(prisma.rule.create).toHaveBeenCalledTimes(1);
        expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'IMPORT' }));
    });

    it('should import a domain without rules', async () => {
        prisma.domain.create.mockResolvedValue(mockDomain);

        const payload = { domain: { name: 'Empty', fields: [] }, rules: [] };
        await service.importDomain(payload);

        expect(prisma.domain.create).toHaveBeenCalled();
    });

    // ── Seeding ──

    it('should seed when database is empty', async () => {
        prisma.domain.count.mockResolvedValue(0);
        prisma.domain.create.mockResolvedValue(mockDomain);

        await service.onModuleInit();

        expect(prisma.domain.create).toHaveBeenCalledTimes(2); // Healthcare + HR
    });

    it('should skip seeding when data exists', async () => {
        prisma.domain.count.mockResolvedValue(3);

        await service.onModuleInit();

        expect(prisma.domain.create).not.toHaveBeenCalled();
    });
});
