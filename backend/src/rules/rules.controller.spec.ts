import { Test, TestingModule } from '@nestjs/testing';
import { RulesController } from './rules.controller';
import { RulesService } from './rules.service';
import { NotFoundException } from '@nestjs/common';

describe('RulesController', () => {
    let controller: RulesController;
    let service: any;

    const mockRule = { id: 'r1', name: 'Test Rule', domainId: 'd1', jsonLogic: {} };
    const mockVersion = { id: 'v1', ruleId: 'r1', version: 1, jsonLogic: {} };

    beforeEach(async () => {
        service = {
            findAll: jest.fn().mockResolvedValue([mockRule]),
            findOne: jest.fn().mockResolvedValue(mockRule),
            create: jest.fn().mockResolvedValue(mockRule),
            update: jest.fn().mockResolvedValue(mockRule),
            remove: jest.fn().mockResolvedValue(mockRule),
            getVersions: jest.fn().mockResolvedValue([mockVersion]),
            rollback: jest.fn().mockResolvedValue(mockRule),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [RulesController],
            providers: [{ provide: RulesService, useValue: service }],
        }).compile();
        controller = module.get<RulesController>(RulesController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('should find all rules', async () => {
        const result = await controller.findAll();
        expect(result).toHaveLength(1);
    });

    it('should filter by domainId', async () => {
        await controller.findAll('d1');
        expect(service.findAll).toHaveBeenCalledWith('d1');
    });

    it('should find one rule', async () => {
        const result = await controller.findOne('r1');
        expect(result.name).toBe('Test Rule');
    });

    it('should throw 404 for missing rule', async () => {
        service.findOne.mockResolvedValue(null);
        await expect(controller.findOne('bad')).rejects.toThrow(NotFoundException);
    });

    it('should create a rule', async () => {
        await controller.create({ name: 'New', domainId: 'd1', jsonLogic: {} });
        expect(service.create).toHaveBeenCalled();
    });

    it('should update a rule', async () => {
        await controller.update('r1', { name: 'Updated' });
        expect(service.update).toHaveBeenCalledWith('r1', { name: 'Updated' });
    });

    it('should throw 404 on update of missing rule', async () => {
        service.findOne.mockResolvedValue(null);
        await expect(controller.update('bad', {})).rejects.toThrow(NotFoundException);
    });

    it('should delete a rule', async () => {
        const result = await controller.remove('r1');
        expect(result).toEqual({ deleted: true, id: 'r1' });
    });

    it('should throw 404 on delete of missing rule', async () => {
        service.findOne.mockResolvedValue(null);
        await expect(controller.remove('bad')).rejects.toThrow(NotFoundException);
    });

    it('should get Version history', async () => {
        const result = await controller.getVersions('r1');
        expect(result).toHaveLength(1);
    });

    it('should throw 404 on versions for missing rule', async () => {
        service.findOne.mockResolvedValue(null);
        await expect(controller.getVersions('bad')).rejects.toThrow(NotFoundException);
    });

    it('should rollback a rule', async () => {
        const result = await controller.rollback('r1', '1');
        expect(service.rollback).toHaveBeenCalledWith('r1', 1);
    });

    it('should throw 404 on rollback for missing rule', async () => {
        service.findOne.mockResolvedValue(null);
        await expect(controller.rollback('bad', '1')).rejects.toThrow(NotFoundException);
    });

    it('should throw 404 on rollback for missing version', async () => {
        service.rollback.mockRejectedValue(new Error('Version 99 not found'));
        await expect(controller.rollback('r1', '99')).rejects.toThrow(NotFoundException);
    });
});
