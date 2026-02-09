import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';
import { NotFoundException } from '@nestjs/common';

describe('ExecutionController', () => {
    let controller: ExecutionController;
    let service: any;

    const mockResult = {
        domainId: 'd1', domainName: 'Test', environment: 'production', timestamp: new Date().toISOString(),
        totalRules: 1, passed: 1, failed: 0, results: [], executionTimeMs: 5,
    };

    beforeEach(async () => {
        service = { execute: jest.fn().mockResolvedValue(mockResult) };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ExecutionController],
            providers: [{ provide: ExecutionService, useValue: service }],
        }).compile();
        controller = module.get<ExecutionController>(ExecutionController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('should execute rules', async () => {
        const result = await controller.execute({ domainId: 'd1', data: { age: 25 } });
        expect(result.domainId).toBe('d1');
        expect(service.execute).toHaveBeenCalledWith('d1', { age: 25 }, undefined, 'production');
    });

    it('should throw NotFoundException for missing domain', async () => {
        service.execute.mockRejectedValue(new Error('Domain "x" not found'));
        await expect(controller.execute({ domainId: 'x', data: {} })).rejects.toThrow(NotFoundException);
    });

    it('should pass environment option', async () => {
        await controller.execute({ domainId: 'd1', data: {}, environment: 'staging' });
        expect(service.execute).toHaveBeenCalledWith('d1', {}, undefined, 'staging');
    });

    it('should pass ruleIds filter', async () => {
        await controller.execute({ domainId: 'd1', data: {}, ruleIds: ['r1', 'r2'] });
        expect(service.execute).toHaveBeenCalledWith('d1', {}, ['r1', 'r2'], 'production');
    });
});
