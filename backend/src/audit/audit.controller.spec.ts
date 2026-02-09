import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController', () => {
    let controller: AuditController;
    let service: any;

    beforeEach(async () => {
        service = { findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }) };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuditController],
            providers: [{ provide: AuditService, useValue: service }],
        }).compile();
        controller = module.get<AuditController>(AuditController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('should return audit logs', async () => {
        const result = await controller.findAll();
        expect(result.data).toEqual([]);
        expect(result.total).toBe(0);
    });

    it('should pass filters to service', async () => {
        await controller.findAll('Domain', 'd1', 'CREATE', '10', '5');
        expect(service.findAll).toHaveBeenCalledWith({
            entityType: 'Domain', entityId: 'd1', action: 'CREATE', limit: 10, offset: 5,
        });
    });

    it('should use default pagination', async () => {
        await controller.findAll();
        expect(service.findAll).toHaveBeenCalledWith({
            entityType: undefined, entityId: undefined, action: undefined, limit: 50, offset: 0,
        });
    });
});
