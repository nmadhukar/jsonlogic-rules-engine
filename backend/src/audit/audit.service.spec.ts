import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
    let service: AuditService;
    let prisma: any;

    const mockAuditLog = {
        id: 'audit-1',
        entityType: 'Domain',
        entityId: 'domain-1',
        action: 'CREATE',
        actor: 'system',
        before: null,
        after: { name: 'Test' },
        metadata: null,
        createdAt: new Date(),
    };

    beforeEach(async () => {
        prisma = {
            auditLog: {
                create: jest.fn().mockResolvedValue(mockAuditLog),
                findMany: jest.fn().mockResolvedValue([mockAuditLog]),
                count: jest.fn().mockResolvedValue(1),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<AuditService>(AuditService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create an audit log entry', async () => {
        const result = await service.log({
            entityType: 'Domain',
            entityId: 'domain-1',
            action: 'CREATE',
            after: { name: 'Test' },
        });

        expect(result.id).toBe('audit-1');
        expect(prisma.auditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                entityType: 'Domain',
                entityId: 'domain-1',
                action: 'CREATE',
                actor: 'system',
            }),
        });
    });

    it('should use custom actor when provided', async () => {
        await service.log({
            entityType: 'Rule',
            entityId: 'rule-1',
            action: 'UPDATE',
            actor: 'admin@test.com',
        });

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ actor: 'admin@test.com' }),
        });
    });

    it('should find audit logs with filters', async () => {
        const result = await service.findAll({ entityType: 'Domain', action: 'CREATE' });

        expect(result.data).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { entityType: 'Domain', action: 'CREATE' },
                orderBy: { createdAt: 'desc' },
                take: 50,
                skip: 0,
            }),
        );
    });

    it('should support pagination', async () => {
        await service.findAll({ limit: 10, offset: 20 });

        expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ take: 10, skip: 20 }),
        );
    });

    it('should handle empty filters', async () => {
        await service.findAll({});

        expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: {} }),
        );
    });

    it('should filter by entityId', async () => {
        await service.findAll({ entityId: 'domain-1' });

        expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { entityId: 'domain-1' },
            }),
        );
    });

    it('should include before and after data', async () => {
        const entry = {
            entityType: 'Rule',
            entityId: 'rule-1',
            action: 'UPDATE',
            before: { name: 'Old Name' },
            after: { name: 'New Name' },
            metadata: { ip: '127.0.0.1' },
        };

        await service.log(entry);

        expect(prisma.auditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                before: { name: 'Old Name' },
                after: { name: 'New Name' },
                metadata: { ip: '127.0.0.1' },
            }),
        });
    });
});
